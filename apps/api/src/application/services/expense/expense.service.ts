import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { IExpenseRepository } from '@domain/repositories/expense.repository.interface';
import { IAccountRepository } from '@domain/repositories/account.repository.interface';
import { IJournalEntryRepository } from '@domain/repositories/journal-entry.repository.interface';
import { CreateExpenseDto } from '../../dtos/expense/create-expense.dto';
import { PayExpenseDto } from '../../dtos/expense/pay-expense.dto';
import { JournalEntryStatus, AccountType, PaymentMethod } from '@domain/enums';
import { PrismaService } from '@infrastructure/persistence/prisma/prisma.service';
import { checkPeriodLock } from '../accounting/period-lock.helper';

import { ContactService } from '../contact/contact.service';
import { ContactType } from '@domain/entities/contact.entity';

export const EXPENSE_REPOSITORY = 'EXPENSE_REPOSITORY';
export const ACCOUNT_REPOSITORY = 'ACCOUNT_REPOSITORY';
export const JOURNAL_ENTRY_REPOSITORY = 'JOURNAL_ENTRY_REPOSITORY';

@Injectable()
export class ExpenseService {
  constructor(
    @Inject(EXPENSE_REPOSITORY) private readonly expenseRepository: IExpenseRepository,
    @Inject(ACCOUNT_REPOSITORY) private readonly accountRepository: IAccountRepository,
    @Inject(JOURNAL_ENTRY_REPOSITORY) private readonly journalEntryRepository: IJournalEntryRepository,
    private readonly contactService: ContactService,
    private readonly prisma: PrismaService,
  ) {}

  async getExpenses(companyId: string) {
    return this.expenseRepository.findByCompany(companyId);
  }

  async deleteExpense(companyId: string, id: string) {
    const existing = await this.expenseRepository.findById(id, companyId);
    if (!existing) {
      throw new BadRequestException('Gasto no encontrado.');
    }
    await checkPeriodLock(this.prisma, companyId, existing.date);
    return this.prisma.$transaction(async (tx) => {
      return this.expenseRepository.delete(id, companyId, tx);
    });
  }

  async payExpense(companyId: string, id: string, dto: PayExpenseDto) {
    await checkPeriodLock(this.prisma, companyId, dto.paymentDate);
    const expense = await this.expenseRepository.findById(id, companyId);
    if (!expense) throw new BadRequestException('Gasto no encontrado.');
    if (expense.paymentMethod !== PaymentMethod.CREDIT) {
      throw new BadRequestException('Solo se pueden pagar gastos con método de pago a crédito.');
    }
    if (expense.paymentDate) {
      throw new BadRequestException('Este gasto ya ha sido pagado.');
    }

    const accounts = await this.accountRepository.findByCompany(companyId);
    
    // Debit Account: Accounts Payable (2101)
    let debitAcc = accounts.find((a) => a.code === '2101');
    if (!debitAcc) debitAcc = accounts.find((a) => a.code.startsWith('2')); // fallback to liability
    if (!debitAcc) throw new BadRequestException('No se encontró cuenta de Cuentas por Pagar (2101).');

    // Credit Account: Selected Cash/Bank Account (bankAccountId)
    const creditAcc = accounts.find((a) => a.id === dto.bankAccountId);
    if (!creditAcc) throw new BadRequestException('La cuenta bancaria seleccionada no es válida.');

    const payableAmount = Number(expense.amount) - Number(expense.itbisRetained ?? 0) - Number(expense.isrRetained ?? 0);

    // Create balanced journal entry representing the payment
    const journalLines = [
      {
        accountId: debitAcc.id,
        debit: payableAmount,
        credit: 0,
        description: `Pago a proveedor - NCF ${expense.ncf}`,
      },
      {
        accountId: creditAcc.id,
        debit: 0,
        credit: payableAmount,
        description: `Saldar cuenta por pagar - NCF ${expense.ncf}`,
      },
    ];

    return this.prisma.$transaction(async (tx) => {
      const journalEntry = await this.journalEntryRepository.create({
        companyId,
        date: new Date(dto.paymentDate),
        description: `Pago de Gasto: ${expense.providerName} - NCF ${expense.ncf}`,
        reference: `PAGO-${expense.ncf}`,
        lines: journalLines,
      }, tx);

      await this.journalEntryRepository.post(journalEntry.id, companyId, tx);

      // Update expense paymentDate
      return this.expenseRepository.update(id, companyId, {
        paymentDate: new Date(dto.paymentDate),
      }, tx);
    });
  }

  async createExpense(companyId: string, dto: CreateExpenseDto) {
    const [, , accounts] = await Promise.all([
      checkPeriodLock(this.prisma, companyId, dto.date),
      this.contactService.findOrCreateContact(
        companyId,
        dto.providerRnc,
        dto.providerName,
        ContactType.PROVIDER,
      ),
      this.accountRepository.findByCompany(companyId),
    ]);
    
    return this.prisma.$transaction(async (tx) => {
      // Find debit Account depending on DGII type
      let targetAccount: any;
      const isInventoryPurchase = dto.expenseType === '09';

      if (isInventoryPurchase) {
        targetAccount = accounts.find((a) => a.code === '1105');
        if (!targetAccount) {
          targetAccount = accounts.find((a) => a.code.startsWith('110') && a.code !== '1101');
        }
        if (!targetAccount) {
          targetAccount = await this.accountRepository.create({
            companyId,
            code: '1105',
            name: 'Inventario de Mercancías',
            type: AccountType.ASSET,
            parentId: null,
            isActive: true,
          }, tx);
        }
      } else {
        let expenseCode = '6105'; // fallback Gastos Diversos
        if (dto.expenseType === '01') expenseCode = '6101'; // Gastos de Personal
        else if (dto.expenseType === '03') expenseCode = '6102'; // Alquileres
        else if (dto.expenseType === '02') expenseCode = '6103'; // Servicios Públicos
        else if (dto.expenseType === '11') expenseCode = '6104'; // Seguros

        targetAccount = accounts.find((a) => a.code === expenseCode);
        if (!targetAccount) targetAccount = accounts.find((a) => a.code.startsWith('6')); // any expense
        if (!targetAccount) throw new BadRequestException('No expense account found in company chart of accounts');
      }

      // Find Liability or Asset clearing accounts
      // Cash / Bank (1101) or Accounts Payable (2101)
      const isCreditPurchase = dto.paymentMethod === PaymentMethod.CREDIT; // Compra a Crédito
      let paymentAcc: any;

      if (!isCreditPurchase && dto.bankAccountId) {
        paymentAcc = accounts.find((a) => a.id === dto.bankAccountId);
        if (!paymentAcc) throw new BadRequestException('La cuenta bancaria seleccionada no es válida.');
      } else {
        const paymentCode = isCreditPurchase ? '2101' : '1101';
        paymentAcc = accounts.find((a) => a.code === paymentCode);
        if (!paymentAcc) {
          paymentAcc = accounts.find((a) => isCreditPurchase ? a.code.startsWith('2') : a.code.startsWith('1'));
        }
        if (!paymentAcc) throw new BadRequestException(`No payment/liability account found for code ${paymentCode}`);
      }

      // ITBIS Account (1106 - ITBIS Adelantado)
      let itbisAcc = accounts.find((a) => a.code === '1106');
      if (!itbisAcc) {
        itbisAcc = await this.accountRepository.create({
          companyId,
          code: '1106',
          name: 'ITBIS Adelantado',
          type: AccountType.ASSET,
          parentId: null,
          isActive: true,
        }, tx);
      }

      // Retenciones Account (2103 - Retenciones por Pagar)
      let retentionsAcc = accounts.find((a) => a.code === '2103');
      if (!retentionsAcc) retentionsAcc = accounts.find((a) => a.name.toLowerCase().includes('retencion'));

      // 2. Build double-entry lines
      const journalLines: any[] = [];
      const subtotal = dto.amount - (dto.itbis ?? 0);

      // DEBIT: Gasto o Inventario amount (without ITBIS)
      journalLines.push({
        accountId: targetAccount.id,
        debit: subtotal,
        credit: 0,
        description: `Gasto proveedor - NCF ${dto.ncf}`,
      });

      // DEBIT: ITBIS advanced (if any)
      if (dto.itbis && dto.itbis > 0) {
        if (!itbisAcc) throw new BadRequestException('No ITBIS account found in chart of accounts');
        journalLines.push({
          accountId: itbisAcc.id,
          debit: dto.itbis,
          credit: 0,
          description: `ITBIS adelantado - NCF ${dto.ncf}`,
        });
      }

      // CREDIT: Retained ITBIS (if any)
      if ((dto.itbisRetained ?? 0) > 0) {
        if (!retentionsAcc) throw new BadRequestException('No Retentions account found in chart of accounts');
        journalLines.push({
          accountId: retentionsAcc.id,
          debit: 0,
          credit: dto.itbisRetained,
          description: `ITBIS Retenido - NCF ${dto.ncf}`,
        });
      }

      // CREDIT: Retained ISR (if any)
      if ((dto.isrRetained ?? 0) > 0) {
        if (!retentionsAcc) throw new BadRequestException('No Retentions account found in chart of accounts');
        journalLines.push({
          accountId: retentionsAcc.id,
          debit: 0,
          credit: dto.isrRetained,
          description: `ISR Retenido - NCF ${dto.ncf}`,
        });
      }

      // CREDIT: Net cash payment or accounts payable
      const netCreditAmount = dto.amount - (dto.itbisRetained ?? 0) - (dto.isrRetained ?? 0);
      journalLines.push({
        accountId: paymentAcc.id,
        debit: 0,
        credit: netCreditAmount,
        description: `Pago neto - NCF ${dto.ncf}`,
      });

      const journalEntry = await this.journalEntryRepository.create({
        companyId,
        date: new Date(dto.date),
        description: `Gasto proveedor: ${dto.providerName} - NCF ${dto.ncf}`,
        reference: dto.ncf,
        lines: journalLines,
      }, tx);

      await this.journalEntryRepository.post(journalEntry.id, companyId, tx);

      return this.expenseRepository.create({
        companyId,
        providerRnc: dto.providerRnc,
        providerName: dto.providerName,
        ncf: dto.ncf,
        expenseType: dto.expenseType,
        date: new Date(dto.date),
        paymentDate: dto.paymentDate ? new Date(dto.paymentDate) : null,
        amount: dto.amount,
        itbis: dto.itbis ?? 0,
        itbisRetained: dto.itbisRetained ?? 0,
        isrRetained: dto.isrRetained ?? 0,
        paymentMethod: dto.paymentMethod,
        journalEntryId: journalEntry.id,
        isVoided: false,
        isForeignPayment: dto.isForeignPayment ?? false,
        foreignCountry: dto.foreignCountry ?? null,
        foreignTaxId: dto.foreignTaxId ?? null,
        foreignPaymentType: dto.foreignPaymentType ?? null,
      }, tx);
    });
  }

  async voidExpense(companyId: string, id: string) {
    const expense = await this.expenseRepository.findById(id, companyId);
    if (!expense) throw new BadRequestException('Gasto no encontrado.');
    if (expense.isVoided) throw new BadRequestException('Este gasto ya está anulado.');

    await checkPeriodLock(this.prisma, companyId, expense.date);

    return this.prisma.$transaction(async (tx) => {
      // Void associated Journal Entry
      if (expense.journalEntryId) {
        await this.journalEntryRepository.void(expense.journalEntryId, companyId, tx);
      }

      return this.expenseRepository.update(id, companyId, {
        isVoided: true,
      }, tx);
    });
  }
}
