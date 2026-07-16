import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { IExpenseRepository } from '@domain/repositories/expense.repository.interface';
import { IJournalEntryRepository } from '@domain/repositories/journal-entry.repository.interface';
import { IAccountRepository } from '@domain/repositories/account.repository.interface';
import { PrismaService } from '@infrastructure/persistence/prisma/prisma.service';

export const EXPENSE_REPOSITORY = 'EXPENSE_REPOSITORY';
export const JOURNAL_ENTRY_REPOSITORY = 'JOURNAL_ENTRY_REPOSITORY';
export const ACCOUNT_REPOSITORY = 'ACCOUNT_REPOSITORY';

@Injectable()
export class ReportService {
  constructor(
    @Inject(EXPENSE_REPOSITORY) private readonly expenseRepository: IExpenseRepository,
    @Inject(JOURNAL_ENTRY_REPOSITORY) private readonly journalEntryRepository: IJournalEntryRepository,
    @Inject(ACCOUNT_REPOSITORY) private readonly accountRepository: IAccountRepository,
    private readonly prisma: PrismaService,
  ) {}

  private parsePeriod(period: string) {
    if (!/^\d{6}$/.test(period)) {
      throw new BadRequestException('El periodo debe tener el formato AAAAMM (ej. 202607)');
    }
    const year = parseInt(period.substring(0, 4));
    const month = parseInt(period.substring(4, 6));
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);
    return { startDate, endDate };
  }

  async generate606Text(companyId: string, period: string): Promise<string> {
    const company = await this.prisma.company.findUnique({ where: { id: companyId } });
    if (!company) throw new BadRequestException('Empresa no encontrada');

    const { startDate, endDate } = this.parsePeriod(period);

    const expenses = await this.prisma.expense.findMany({
      where: {
        companyId,
        date: { gte: startDate, lte: endDate },
        isVoided: false,
      },
    });

    const header = `606|${company.rnc}|${period}|${expenses.length}`;
    const rows = expenses.map((exp) => {
      const typeId = exp.providerRnc.length === 9 ? '1' : exp.providerRnc.length === 11 ? '2' : '3';
      const formattedDate = new Date(exp.date).toISOString().split('T')[0].replace(/-/g, '');
      const formattedPaymentDate = exp.paymentDate 
        ? new Date(exp.paymentDate).toISOString().split('T')[0].replace(/-/g, '') 
        : '';
      
      const subtotal = Number(exp.amount) - Number(exp.itbis);
      
      const expTypeNum = Number(exp.expenseType);
      const isServicio = (expTypeNum >= 1 && expTypeNum <= 7) || expTypeNum === 11;
      
      // fields matching DGII specifications
      return [
        exp.providerRnc,
        typeId,
        exp.expenseType,
        exp.ncf,
        '', // NCF Modificado
        formattedDate,
        formattedPaymentDate,
        isServicio ? subtotal.toFixed(2) : '0.00', // Servicios
        !isServicio ? subtotal.toFixed(2) : '0.00', // Bienes
        Number(exp.amount).toFixed(2),
        Number(exp.itbis).toFixed(2),
        Number(exp.itbisRetained).toFixed(2),
        '0.00', // Proporcionalidad
        '0.00', // ITBIS Costo
        (Number(exp.itbis) - Number(exp.itbisRetained)).toFixed(2), // ITBIS por Adelantar
        '0.00', // ITBIS Percibido
        Number(exp.isrRetained) > 0 ? '10' : '', // Tipo Retención ISR (10: Otras Rentas default)
        Number(exp.isrRetained).toFixed(2),
        '0.00', // ISR Percibido
        '0.00', // ISC
        '0.00', // Tasas
        '0.00', // Propina
        exp.paymentMethod,
      ].join('|');
    });

    return [header, ...rows].join('\r\n');
  }

  async generate607Text(companyId: string, period: string): Promise<string> {
    const company = await this.prisma.company.findUnique({ where: { id: companyId } });
    if (!company) throw new BadRequestException('Empresa no encontrada');

    const { startDate, endDate } = this.parsePeriod(period);

    // Find invoices in the period
    const invoices = await this.prisma.invoice.findMany({
      where: {
        companyId,
        date: { gte: startDate, lte: endDate },
      },
    });

    const header = `607|${company.rnc}|${period}|${invoices.length}`;
    
    const rows = invoices.map((inv) => {
      const formattedDate = new Date(inv.date).toISOString().split('T')[0].replace(/-/g, '');
      const typeId = inv.clientRnc.length === 9 ? '1' : inv.clientRnc.length === 11 ? '2' : '3';
      
      const itbisAmount = inv.isVoided ? 0 : Number(inv.itbis);
      const totalAmount = inv.isVoided ? 0 : Number(inv.amount);
      const baseAmount = totalAmount - itbisAmount;

      return [
        inv.clientRnc,
        typeId,
        inv.ncf,
        '', // NCF Modificado
        '01', // Tipo Ingreso (01: Ingresos Financieros/Operacionales)
        formattedDate,
        '', // Fecha Retención
        baseAmount.toFixed(2),
        itbisAmount.toFixed(2),
        '0.00', // ITBIS Retenido
        '0.00', // ISR Retenido
        '0.00', // ITBIS Percibido
        '0.00', // ISR Percibido
        '0.00', // ISC
        '0.00', // Otros Impuestos
        '0.00', // Propina Legal
        inv.paymentMethod, // Forma de pago real
      ].join('|');
    });

    return [header, ...rows].join('\r\n');
  }

  async getIt1Summary(companyId: string, period: string) {
    const { startDate, endDate } = this.parsePeriod(period);

    // Sum purchases and ITBIS
    const expenses = await this.prisma.expense.findMany({
      where: {
        companyId,
        date: { gte: startDate, lte: endDate },
        isVoided: false,
      },
    });

    const purchasesAmount = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
    const purchasesItbis = expenses.reduce((sum, e) => sum + Number(e.itbis), 0);

    // Sum sales and ITBIS from invoices
    const invoices = await this.prisma.invoice.findMany({
      where: {
        companyId,
        date: { gte: startDate, lte: endDate },
        isVoided: false,
      },
    });

    let salesAmount = 0;
    let salesItbis = 0;

    invoices.forEach((inv) => {
      const itbis = Number(inv.itbis);
      const total = Number(inv.amount);
      salesAmount += (total - itbis);
      salesItbis += itbis;
    });

    return {
      period,
      salesAmount,
      salesItbis,
      purchasesAmount,
      purchasesItbis,
      itbisToPay: Math.max(0, salesItbis - purchasesItbis),
    };
  }

  async getFinancials(companyId: string) {
    const accounts = await this.accountRepository.findByCompany(companyId);
    
    // Get all journal entry lines and group their net impact by account
    const lines = await this.prisma.journalEntryLine.findMany({
      where: {
        journalEntry: {
          companyId,
          status: 'POSTED',
        },
      },
    });

    const balanceMap: Record<string, number> = {};
    lines.forEach((line) => {
      if (!balanceMap[line.accountId]) balanceMap[line.accountId] = 0;
      balanceMap[line.accountId] += (Number(line.debit) - Number(line.credit));
    });

    // Create a tree and compute node balances recursively
    const computeBalance = (accId: string, accType: string): number => {
      const acc = accounts.find((a) => a.id === accId);
      if (!acc) return 0;

      let netDebitCredit = balanceMap[accId] || 0;
      const children = accounts.filter((a) => a.parentId === accId);
      
      children.forEach((child) => {
        netDebitCredit += computeBalance(child.id, accType);
      });

      // Sign adjustment depending on debit/credit nature
      // ASSET & EXPENSE are Debit nature (+)
      // LIABILITY, EQUITY, REVENUE are Credit nature (-)
      const isDebitNature = accType === 'ASSET' || accType === 'EXPENSE';
      return isDebitNature ? netDebitCredit : -netDebitCredit;
    };

    const rootAccounts = accounts.filter((a) => !a.parentId);
    const balanceSheet: any[] = [];
    const incomeStatement: any[] = [];

    rootAccounts.forEach((acc) => {
      const balance = computeBalance(acc.id, acc.type);
      const data = {
        id: acc.id,
        code: acc.code,
        name: acc.name,
        type: acc.type,
        balance,
      };

      if (acc.type === 'ASSET' || acc.type === 'LIABILITY' || acc.type === 'EQUITY') {
        balanceSheet.push(data);
      } else {
        incomeStatement.push(data);
      }
    });

    return {
      balanceSheet,
      incomeStatement,
    };
  }

  async generate608Text(companyId: string, period: string): Promise<string> {
    const company = await this.prisma.company.findUnique({ where: { id: companyId } });
    if (!company) throw new BadRequestException('Empresa no encontrada');

    const { startDate, endDate } = this.parsePeriod(period);

    const voidedInvoices = await this.prisma.invoice.findMany({
      where: {
        companyId,
        date: { gte: startDate, lte: endDate },
        isVoided: true,
      },
    });

    const header = `608|${company.rnc}|${period}|${voidedInvoices.length}`;
    const rows = voidedInvoices.map((inv) => {
      const formattedDate = new Date(inv.updatedAt).toISOString().split('T')[0].replace(/-/g, '');
      return [
        inv.ncf,
        formattedDate,
        '05', // Default: Corrección de la Información
      ].join('|');
    });

    return [header, ...rows].join('\r\n');
  }

  async generate609Text(companyId: string, period: string): Promise<string> {
    const company = await this.prisma.company.findUnique({ where: { id: companyId } });
    if (!company) throw new BadRequestException('Empresa no encontrada');

    const { startDate, endDate } = this.parsePeriod(period);

    const foreignExpenses = await this.prisma.expense.findMany({
      where: {
        companyId,
        date: { gte: startDate, lte: endDate },
        isForeignPayment: true,
      },
    });

    const header = `609|${company.rnc}|${period}|${foreignExpenses.length}`;
    const rows = foreignExpenses.map((exp) => {
      return [
        exp.foreignTaxId || exp.providerRnc,
        exp.providerName,
        exp.providerRnc.length <= 9 ? '1' : '2',
        exp.foreignCountry || 'US',
        '3', // Vínculo: Independiente
        exp.foreignPaymentType || '01',
        Number(exp.amount).toFixed(2),
        Number(exp.isrRetained).toFixed(2),
        (Number(exp.amount) - Number(exp.isrRetained)).toFixed(2),
      ].join('|');
    });

    return [header, ...rows].join('\r\n');
  }
}
