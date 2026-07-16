import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IPayrollRepository } from '@domain/repositories/payroll.repository.interface';
import { PayrollEntity, PayrollItemEntity } from '@domain/entities/payroll.entity';

@Injectable()
export class PayrollRepository implements IPayrollRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string, companyId: string): Promise<PayrollEntity | null> {
    const pay = await this.prisma.payroll.findFirst({
      where: { id, companyId },
      include: {
        items: {
          include: {
            employee: true,
          },
        },
      },
    });
    if (!pay) return null;

    return {
      id: pay.id,
      companyId: pay.companyId,
      period: pay.period,
      grossSalary: Number(pay.grossSalary),
      sfsEmployee: Number(pay.sfsEmployee),
      sfsEmployer: Number(pay.sfsEmployer),
      afpEmployee: Number(pay.afpEmployee),
      afpEmployer: Number(pay.afpEmployer),
      arlEmployer: Number(pay.arlEmployer),
      isrDeduction: Number(pay.isrDeduction),
      netSalary: Number(pay.netSalary),
      journalEntryId: pay.journalEntryId,
      createdAt: pay.createdAt,
      updatedAt: pay.updatedAt,
      items: pay.items.map((it) => ({
        id: it.id,
        payrollId: it.payrollId,
        employeeId: it.employeeId,
        grossSalary: Number(it.grossSalary),
        sfsEmployee: Number(it.sfsEmployee),
        afpEmployee: Number(it.afpEmployee),
        isrDeduction: Number(it.isrDeduction),
        netSalary: Number(it.netSalary),
        createdAt: it.createdAt,
        updatedAt: it.updatedAt,
        employeeName: it.employee.name,
        employeeCedula: it.employee.cedula,
        employeeJobTitle: it.employee.jobTitle,
      })),
    };
  }

  async findByPeriod(companyId: string, period: string): Promise<PayrollEntity | null> {
    const pay = await this.prisma.payroll.findUnique({
      where: { companyId_period: { companyId, period } },
      include: {
        items: {
          include: {
            employee: true,
          },
        },
      },
    });
    if (!pay) return null;

    return {
      id: pay.id,
      companyId: pay.companyId,
      period: pay.period,
      grossSalary: Number(pay.grossSalary),
      sfsEmployee: Number(pay.sfsEmployee),
      sfsEmployer: Number(pay.sfsEmployer),
      afpEmployee: Number(pay.afpEmployee),
      afpEmployer: Number(pay.afpEmployer),
      arlEmployer: Number(pay.arlEmployer),
      isrDeduction: Number(pay.isrDeduction),
      netSalary: Number(pay.netSalary),
      journalEntryId: pay.journalEntryId,
      createdAt: pay.createdAt,
      updatedAt: pay.updatedAt,
      items: pay.items.map((it) => ({
        id: it.id,
        payrollId: it.payrollId,
        employeeId: it.employeeId,
        grossSalary: Number(it.grossSalary),
        sfsEmployee: Number(it.sfsEmployee),
        afpEmployee: Number(it.afpEmployee),
        isrDeduction: Number(it.isrDeduction),
        netSalary: Number(it.netSalary),
        createdAt: it.createdAt,
        updatedAt: it.updatedAt,
        employeeName: it.employee.name,
        employeeCedula: it.employee.cedula,
        employeeJobTitle: it.employee.jobTitle,
      })),
    };
  }

  async findByCompany(companyId: string): Promise<PayrollEntity[]> {
    const pays = await this.prisma.payroll.findMany({
      where: { companyId },
      orderBy: { period: 'desc' },
    });

    return pays.map((pay) => ({
      id: pay.id,
      companyId: pay.companyId,
      period: pay.period,
      grossSalary: Number(pay.grossSalary),
      sfsEmployee: Number(pay.sfsEmployee),
      sfsEmployer: Number(pay.sfsEmployer),
      afpEmployee: Number(pay.afpEmployee),
      afpEmployer: Number(pay.afpEmployer),
      arlEmployer: Number(pay.arlEmployer),
      isrDeduction: Number(pay.isrDeduction),
      netSalary: Number(pay.netSalary),
      journalEntryId: pay.journalEntryId,
      createdAt: pay.createdAt,
      updatedAt: pay.updatedAt,
    }));
  }

  async create(
    payroll: Omit<PayrollEntity, 'id' | 'createdAt' | 'updatedAt' | 'items'>,
    items: Omit<PayrollItemEntity, 'id' | 'payrollId' | 'createdAt' | 'updatedAt'>[],
  ): Promise<PayrollEntity> {
    const created = await this.prisma.payroll.create({
      data: {
        companyId: payroll.companyId,
        period: payroll.period,
        grossSalary: payroll.grossSalary,
        sfsEmployee: payroll.sfsEmployee,
        sfsEmployer: payroll.sfsEmployer,
        afpEmployee: payroll.afpEmployee,
        afpEmployer: payroll.afpEmployer,
        arlEmployer: payroll.arlEmployer,
        isrDeduction: payroll.isrDeduction,
        netSalary: payroll.netSalary,
        journalEntryId: payroll.journalEntryId,
        items: {
          create: items.map((it) => ({
            employeeId: it.employeeId,
            grossSalary: it.grossSalary,
            sfsEmployee: it.sfsEmployee,
            afpEmployee: it.afpEmployee,
            isrDeduction: it.isrDeduction,
            netSalary: it.netSalary,
          })),
        },
      },
      include: {
        items: {
          include: {
            employee: true,
          },
        },
      },
    });

    return {
      id: created.id,
      companyId: created.companyId,
      period: created.period,
      grossSalary: Number(created.grossSalary),
      sfsEmployee: Number(created.sfsEmployee),
      sfsEmployer: Number(created.sfsEmployer),
      afpEmployee: Number(created.afpEmployee),
      afpEmployer: Number(created.afpEmployer),
      arlEmployer: Number(created.arlEmployer),
      isrDeduction: Number(created.isrDeduction),
      netSalary: Number(created.netSalary),
      journalEntryId: created.journalEntryId,
      createdAt: created.createdAt,
      updatedAt: created.updatedAt,
      items: created.items.map((it) => ({
        id: it.id,
        payrollId: it.payrollId,
        employeeId: it.employeeId,
        grossSalary: Number(it.grossSalary),
        sfsEmployee: Number(it.sfsEmployee),
        afpEmployee: Number(it.afpEmployee),
        isrDeduction: Number(it.isrDeduction),
        netSalary: Number(it.netSalary),
        createdAt: it.createdAt,
        updatedAt: it.updatedAt,
        employeeName: it.employee.name,
        employeeCedula: it.employee.cedula,
        employeeJobTitle: it.employee.jobTitle,
      })),
    };
  }

  async delete(id: string, companyId: string): Promise<PayrollEntity> {
    const deleted = await this.prisma.payroll.delete({
      where: { id },
      include: {
        items: {
          include: {
            employee: true,
          },
        },
      },
    });

    // Also delete associated Journal Entry if exists
    if (deleted.journalEntryId) {
      try {
        await this.prisma.journalEntry.delete({
          where: { id: deleted.journalEntryId },
        });
      } catch (e) {
        console.warn(`Could not hard-delete journal entry ${deleted.journalEntryId}, attempting to void instead:`, e);
        try {
          await this.prisma.journalEntry.update({
            where: { id: deleted.journalEntryId },
            data: { status: 'VOIDED' },
          });
        } catch (voidError) {
          console.error(`Failed to void journal entry ${deleted.journalEntryId}:`, voidError);
        }
      }
    }

    return {
      id: deleted.id,
      companyId: deleted.companyId,
      period: deleted.period,
      grossSalary: Number(deleted.grossSalary),
      sfsEmployee: Number(deleted.sfsEmployee),
      sfsEmployer: Number(deleted.sfsEmployer),
      afpEmployee: Number(deleted.afpEmployee),
      afpEmployer: Number(deleted.afpEmployer),
      arlEmployer: Number(deleted.arlEmployer),
      isrDeduction: Number(deleted.isrDeduction),
      netSalary: Number(deleted.netSalary),
      journalEntryId: deleted.journalEntryId,
      createdAt: deleted.createdAt,
      updatedAt: deleted.updatedAt,
    };
  }
}
