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
    const { startDate, endDate } = this.parsePeriod(period);

    const [company, expenses] = await Promise.all([
      this.prisma.company.findUnique({ where: { id: companyId } }),
      this.prisma.expense.findMany({
        where: {
          companyId,
          date: { gte: startDate, lte: endDate },
        },
      }),
    ]);

    if (!company) throw new BadRequestException('Empresa no encontrada');

    const header = `606|${company.rnc}|${period}|${expenses.length}`;
    const rows = expenses.map((exp) => {
      const typeId = exp.providerRnc.length === 9 ? '1' : exp.providerRnc.length === 11 ? '2' : '3';
      const formattedDate = new Date(exp.date).toISOString().split('T')[0].replace(/-/g, '');
      const formattedPaymentDate = exp.paymentDate && !exp.isVoided
        ? new Date(exp.paymentDate).toISOString().split('T')[0].replace(/-/g, '') 
        : '';
      
      const subtotal = exp.isVoided ? 0 : (Number(exp.amount) - Number(exp.itbis));
      const total = exp.isVoided ? 0 : Number(exp.amount);
      const itbis = exp.isVoided ? 0 : Number(exp.itbis);
      const itbisRetained = exp.isVoided ? 0 : Number(exp.itbisRetained);
      const isrRetained = exp.isVoided ? 0 : Number(exp.isrRetained);
      
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
        (isServicio && !exp.isVoided) ? subtotal.toFixed(2) : '0.00', // Servicios
        (!isServicio && !exp.isVoided) ? subtotal.toFixed(2) : '0.00', // Bienes
        total.toFixed(2),
        itbis.toFixed(2),
        itbisRetained.toFixed(2),
        '0.00', // Proporcionalidad
        '0.00', // ITBIS Costo
        (itbis - itbisRetained).toFixed(2), // ITBIS por Adelantar
        '0.00', // ITBIS Percibido
        (isrRetained > 0) ? '10' : '', // Tipo Retención ISR (10: Otras Rentas default)
        isrRetained.toFixed(2),
        '0.00', // ISR Percibido
        '0.00', // ISC
        '0.00', // Tasas
        '0.00', // Propina
        exp.isVoided ? '' : exp.paymentMethod,
      ].join('|');
    });

    return [header, ...rows].join('\r\n');
  }

  async generate607Text(companyId: string, period: string): Promise<string> {
    const { startDate, endDate } = this.parsePeriod(period);

    const [company, invoices] = await Promise.all([
      this.prisma.company.findUnique({ where: { id: companyId } }),
      this.prisma.invoice.findMany({
        where: {
          companyId,
          date: { gte: startDate, lte: endDate },
        },
      }),
    ]);

    if (!company) throw new BadRequestException('Empresa no encontrada');

    const header = `607|${company.rnc}|${period}|${invoices.length}`;
    
    const rows = invoices.map((inv) => {
      const formattedDate = new Date(inv.date).toISOString().split('T')[0].replace(/-/g, '');
      const typeId = inv.clientRnc.length === 9 ? '1' : inv.clientRnc.length === 11 ? '2' : '3';
      
      const itbisAmount = inv.isVoided ? 0 : Number(inv.itbis);
      const totalAmount = inv.isVoided ? 0 : Number(inv.amount);
      const baseAmount = totalAmount - itbisAmount;
      const itbisRetainedAmount = inv.isVoided ? 0 : Number(inv.itbisRetained || 0);
      const isrRetainedAmount = inv.isVoided ? 0 : Number(inv.isrRetained || 0);

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
        itbisRetainedAmount.toFixed(2),
        isrRetainedAmount.toFixed(2),
        '0.00', // ITBIS Percibido
        '0.00', // ISR Percibido
        '0.00', // ISC
        '0.00', // Otros Impuestos
        '0.00', // Propina Legal
        inv.isVoided ? '' : inv.paymentMethod,
      ].join('|');
    });

    return [header, ...rows].join('\r\n');
  }

  async getIt1Summary(companyId: string, period: string) {
    const { startDate, endDate } = this.parsePeriod(period);

    // Fetch purchases and sales in parallel
    const [expenses, invoices] = await Promise.all([
      this.prisma.expense.findMany({
        where: {
          companyId,
          date: { gte: startDate, lte: endDate },
          isVoided: false,
        },
      }),
      this.prisma.invoice.findMany({
        where: {
          companyId,
          date: { gte: startDate, lte: endDate },
          isVoided: false,
        },
      }),
    ]);

    const purchasesAmount = expenses.reduce((sum, e) => sum + (Number(e.amount) - Number(e.itbis)), 0);
    const purchasesItbis = expenses.reduce((sum, e) => sum + Number(e.itbis), 0);

    let salesAmount = 0;
    let salesItbis = 0;
    let salesItbisRetained = 0;

    invoices.forEach((inv) => {
      const itbis = Number(inv.itbis);
      const total = Number(inv.amount);
      salesAmount += (total - itbis);
      salesItbis += itbis;
      salesItbisRetained += Number(inv.itbisRetained || 0);
    });

    return {
      period,
      salesAmount,
      salesItbis,
      purchasesAmount,
      purchasesItbis,
      itbisToPay: Math.max(0, salesItbis - purchasesItbis - salesItbisRetained),
    };
  }

  async getFinancials(companyId: string) {
    const accounts = await this.accountRepository.findByCompany(companyId);
    
    // Group and aggregate journal entry line balances directly in the database
    const groupedBalances = await this.prisma.journalEntryLine.groupBy({
      by: ['accountId'],
      where: {
        journalEntry: {
          companyId,
          status: 'POSTED',
        },
      },
      _sum: {
        debit: true,
        credit: true,
      },
    });

    const balanceMap: Record<string, number> = {};
    groupedBalances.forEach((group) => {
      const debit = Number(group._sum.debit || 0);
      const credit = Number(group._sum.credit || 0);
      balanceMap[group.accountId] = debit - credit;
    });

    // Map children for O(1) traversal during balance computation
    const childrenMap = new Map<string, typeof accounts>();
    accounts.forEach((acc) => {
      if (acc.parentId) {
        if (!childrenMap.has(acc.parentId)) {
          childrenMap.set(acc.parentId, []);
        }
        childrenMap.get(acc.parentId)!.push(acc);
      }
    });

    // Create a tree and compute node balances recursively
    const computeBalance = (accId: string, accType: string): number => {
      let netDebitCredit = balanceMap[accId] || 0;
      const children = childrenMap.get(accId) || [];
      
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

  async getTaxFilings(companyId: string) {
    return this.prisma.taxFiling.findMany({
      where: { companyId },
      orderBy: { period: 'desc' },
    });
  }

  async createTaxFiling(companyId: string, dto: { period: string; taxType: string }) {
    const { startDate, endDate } = this.parsePeriod(dto.period);

    const [expenses, invoices] = await Promise.all([
      this.prisma.expense.findMany({
        where: {
          companyId,
          date: { gte: startDate, lte: endDate },
          isVoided: false,
        },
      }),
      this.prisma.invoice.findMany({
        where: {
          companyId,
          date: { gte: startDate, lte: endDate },
          isVoided: false,
        },
      }),
    ]);
    const purchasesAmount = expenses.reduce((sum, e) => sum + (Number(e.amount) - Number(e.itbis)), 0);
    const purchasesItbis = expenses.reduce((sum, e) => sum + Number(e.itbis), 0);
    let salesAmount = 0;
    let salesItbis = 0;
    let salesItbisRetained = 0;
    invoices.forEach((inv) => {
      const itbis = Number(inv.itbis);
      const total = Number(inv.amount);
      salesAmount += (total - itbis);
      salesItbis += itbis;
      salesItbisRetained += Number(inv.itbisRetained || 0);
    });

    const itbisToPay = Math.max(0, salesItbis - purchasesItbis - salesItbisRetained);

    return this.prisma.$transaction(async (tx) => {
      const taxFiling = await tx.taxFiling.upsert({
        where: {
          companyId_period_taxType: {
            companyId,
            period: dto.period,
            taxType: dto.taxType,
          },
        },
        update: {
          salesAmount,
          salesItbis,
          purchasesAmount,
          purchasesItbis,
          itbisToPay,
          status: 'FILED',
          filedAt: new Date(),
        },
        create: {
          companyId,
          period: dto.period,
          taxType: dto.taxType,
          salesAmount,
          salesItbis,
          purchasesAmount,
          purchasesItbis,
          itbisToPay,
          status: 'FILED',
          filedAt: new Date(),
        },
      });

      // Auto-lock: Lock the company up to the end of the declared period
      await tx.company.update({
        where: { id: companyId },
        data: { lockDate: endDate },
      });

      return taxFiling;
    });
  }
}
