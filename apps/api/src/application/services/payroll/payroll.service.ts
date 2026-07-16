import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { IEmployeeRepository } from '@domain/repositories/employee.repository.interface';
import { IPayrollRepository } from '@domain/repositories/payroll.repository.interface';
import { IAccountRepository } from '@domain/repositories/account.repository.interface';
import { IJournalEntryRepository } from '@domain/repositories/journal-entry.repository.interface';
import { CreatePayrollDto } from '../../dtos/payroll/create-payroll.dto';
import { JournalEntryStatus } from '@domain/enums';

export const EMPLOYEE_REPOSITORY = 'EMPLOYEE_REPOSITORY';
export const PAYROLL_REPOSITORY = 'PAYROLL_REPOSITORY';
export const ACCOUNT_REPOSITORY = 'ACCOUNT_REPOSITORY';
export const JOURNAL_ENTRY_REPOSITORY = 'JOURNAL_ENTRY_REPOSITORY';

// Dominican Tax Constants (2026/Current Scale)
const MIN_WAGE = 19300;
const AFP_RATE_EMP = 0.0287; // 2.87%
const AFP_RATE_PAT = 0.0710; // 7.10%
const SFS_RATE_EMP = 0.0304; // 3.04%
const SFS_RATE_PAT = 0.0709; // 7.09%
const ARL_RATE_PAT = 0.011;  // 1.1%

@Injectable()
export class PayrollService {
  constructor(
    @Inject(EMPLOYEE_REPOSITORY) private readonly employeeRepository: IEmployeeRepository,
    @Inject(PAYROLL_REPOSITORY) private readonly payrollRepository: IPayrollRepository,
    @Inject(ACCOUNT_REPOSITORY) private readonly accountRepository: IAccountRepository,
    @Inject(JOURNAL_ENTRY_REPOSITORY) private readonly journalEntryRepository: IJournalEntryRepository,
  ) {}

  // Calculation Helper
  calculateTaxes(salary: number) {
    // 1. TSS Employee (AFP Cap: 20 min wages, SFS Cap: 10 min wages)
    const afpBase = Math.min(salary, MIN_WAGE * 20);
    const sfsBase = Math.min(salary, MIN_WAGE * 10);
    
    const afpEmployee = Number((afpBase * AFP_RATE_EMP).toFixed(2));
    const sfsEmployee = Number((sfsBase * SFS_RATE_EMP).toFixed(2));

    // 2. ISR Calculation (IR-3 Scale based on taxable salary: salary - AFP - SFS)
    const taxableSalary = salary - afpEmployee - sfsEmployee;
    const annualTaxable = taxableSalary * 12;
    let annualIsr = 0;

    if (annualTaxable <= 416220) {
      annualIsr = 0;
    } else if (annualTaxable <= 624329) {
      annualIsr = (annualTaxable - 416220) * 0.15;
    } else if (annualTaxable <= 867123) {
      annualIsr = 31216 + (annualTaxable - 624329) * 0.20;
    } else {
      annualIsr = 79776 + (annualTaxable - 867123) * 0.25;
    }

    const isrDeduction = Number((annualIsr / 12).toFixed(2));
    const netSalary = Number((salary - afpEmployee - sfsEmployee - isrDeduction).toFixed(2));

    // 3. TSS Employer (ARL Cap: 4 min wages)
    const arlBase = Math.min(salary, MIN_WAGE * 4);
    const afpEmployer = Number((afpBase * AFP_RATE_PAT).toFixed(2));
    const sfsEmployer = Number((sfsBase * SFS_RATE_PAT).toFixed(2));
    const arlEmployer = Number((arlBase * ARL_RATE_PAT).toFixed(2));

    return {
      grossSalary: salary,
      sfsEmployee,
      sfsEmployer,
      afpEmployee,
      afpEmployer,
      arlEmployer,
      isrDeduction,
      netSalary,
    };
  }

  async getPayrolls(companyId: string) {
    return this.payrollRepository.findByCompany(companyId);
  }

  async getPayrollById(companyId: string, id: string) {
    const payroll = await this.payrollRepository.findById(id, companyId);
    if (!payroll) {
      throw new BadRequestException('Nómina no encontrada.');
    }
    return payroll;
  }

  async createPayroll(companyId: string, dto: CreatePayrollDto) {
    // Check if payroll already exists for this period
    const existing = await this.payrollRepository.findByPeriod(companyId, dto.period);
    if (existing) {
      throw new BadRequestException(`Ya existe una nómina registrada para el período ${dto.period}.`);
    }

    // Get all employees of the company
    const employees = await this.employeeRepository.findByCompany(companyId);
    if (employees.length === 0) {
      throw new BadRequestException('No hay empleados registrados en esta empresa para generar la nómina.');
    }

    // Calculate details for each employee
    let totalGross = 0;
    let totalSfsEmp = 0;
    let totalSfsPat = 0;
    let totalAfpEmp = 0;
    let totalAfpPat = 0;
    let totalArlPat = 0;
    let totalIsr = 0;
    let totalNet = 0;

    const items = employees.map((emp) => {
      const taxes = this.calculateTaxes(emp.salary);
      
      totalGross += taxes.grossSalary;
      totalSfsEmp += taxes.sfsEmployee;
      totalSfsPat += taxes.sfsEmployer;
      totalAfpEmp += taxes.afpEmployee;
      totalAfpPat += taxes.afpEmployer;
      totalArlPat += taxes.arlEmployer;
      totalIsr += taxes.isrDeduction;
      totalNet += taxes.netSalary;

      return {
        employeeId: emp.id,
        grossSalary: taxes.grossSalary,
        sfsEmployee: taxes.sfsEmployee,
        afpEmployee: taxes.afpEmployee,
        isrDeduction: taxes.isrDeduction,
        netSalary: taxes.netSalary,
      };
    });

    // Resolve double-entry accounts
    const accounts = await this.accountRepository.findByCompany(companyId);
    
    // Debit: Gastos de Personal (6101)
    let salaryExpenseAcc = accounts.find((a) => a.code === '6101');
    if (!salaryExpenseAcc) {
      salaryExpenseAcc = accounts.find((a) => a.code.startsWith('6')); // fallback
    }
    if (!salaryExpenseAcc) throw new BadRequestException('No se encontró cuenta de gastos de personal (6101).');

    // Credit: Retenciones por Pagar (TSS + ISR) (2103)
    let retentionAcc = accounts.find((a) => a.code === '2103');
    if (!retentionAcc) {
      retentionAcc = accounts.find((a) => a.code.startsWith('2')); // fallback
    }
    if (!retentionAcc) throw new BadRequestException('No se encontró cuenta de retenciones por pagar (2103).');

    // Credit: Caja/Banco (1101)
    let cashAcc = accounts.find((a) => a.code === '1101');
    if (!cashAcc) {
      cashAcc = accounts.find((a) => a.code.startsWith('1')); // fallback
    }
    if (!cashAcc) throw new BadRequestException('No se encontró cuenta de caja/banco (1101).');

    // Total TSS to pay (Employee SFS + AFP + Employer SFS + AFP + ARL)
    const totalTssLiability = totalSfsEmp + totalAfpEmp + totalSfsPat + totalAfpPat + totalArlPat;
    const totalEmployerTssExpense = totalSfsPat + totalAfpPat + totalArlPat;

    // Create journal entry representing the payroll run
    const entryDate = new Date();
    const entry = await this.journalEntryRepository.create({
      companyId,
      date: entryDate,
      description: `Registro de Nómina y Seguridad Social - Período ${dto.period}`,
      reference: `NOM-${dto.period}`,
      lines: [
        {
          accountId: salaryExpenseAcc.id,
          debit: totalGross,
          credit: 0,
          description: 'Salario Bruto del Período',
        },
        {
          accountId: salaryExpenseAcc.id,
          debit: totalEmployerTssExpense,
          credit: 0,
          description: 'TSS Patronal del Período',
        },
        {
          accountId: retentionAcc.id,
          debit: 0,
          credit: totalTssLiability,
          description: 'Seguridad Social (TSS) por Pagar',
        },
        {
          accountId: retentionAcc.id,
          debit: 0,
          credit: totalIsr,
          description: 'Retenciones ISR Empleados (IR-3)',
        },
        {
          accountId: cashAcc.id,
          debit: 0,
          credit: totalNet,
          description: 'Pago de Salarios Netos',
        },
      ],
    });

    // Approve/Post the journal entry to balance accounts
    await this.journalEntryRepository.post(entry.id, companyId);

    // Save Payroll consolidated record with items
    return this.payrollRepository.create(
      {
        companyId,
        period: dto.period,
        grossSalary: totalGross,
        sfsEmployee: totalSfsEmp,
        sfsEmployer: totalSfsPat,
        afpEmployee: totalAfpEmp,
        afpEmployer: totalAfpPat,
        arlEmployer: totalArlPat,
        isrDeduction: totalIsr,
        netSalary: totalNet,
        journalEntryId: entry.id,
      },
      items,
    );
  }

  async deletePayroll(companyId: string, id: string) {
    const existing = await this.payrollRepository.findById(id, companyId);
    if (!existing) {
      throw new BadRequestException('Nómina no encontrada.');
    }
    return this.payrollRepository.delete(id, companyId);
  }
}
