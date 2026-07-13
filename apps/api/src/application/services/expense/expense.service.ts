import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { IExpenseRepository } from '@domain/repositories/expense.repository.interface';
import { IAccountRepository } from '@domain/repositories/account.repository.interface';
import { IJournalEntryRepository } from '@domain/repositories/journal-entry.repository.interface';
import { CreateExpenseDto } from '../../dtos/expense/create-expense.dto';
import { JournalEntryStatus } from '@domain/enums';

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
  ) {}

  async getExpenses(companyId: string) {
    return this.expenseRepository.findByCompany(companyId);
  }

  async createExpense(companyId: string, dto: CreateExpenseDto) {
    // 0. Auto-save provider as contact
    await this.contactService.findOrCreateContact(
      companyId,
      dto.providerRnc,
      dto.providerName,
      ContactType.PROVIDER,
    );

    // 1. Find or fallback accounts for double-entry
    const accounts = await this.accountRepository.findByCompany(companyId);
    
    // Find Expense Account depending on DGII type
    let expenseCode = '6105'; // fallback Gastos Diversos
    if (dto.expenseType === '01') expenseCode = '6101'; // Gastos de Personal
    else if (dto.expenseType === '03') expenseCode = '6102'; // Alquileres
    else if (dto.expenseType === '02') expenseCode = '6103'; // Servicios Públicos
    else if (dto.expenseType === '11') expenseCode = '6104'; // Seguros

    let expenseAcc = accounts.find((a) => a.code === expenseCode);
    if (!expenseAcc) expenseAcc = accounts.find((a) => a.code.startsWith('6')); // any expense
    if (!expenseAcc) throw new BadRequestException('No expense account found in company chart of accounts');

    // Find Liability or Asset clearing accounts
    // Cash / Bank (1101) or Accounts Payable (2101)
    const isCreditPurchase = dto.paymentMethod === '04'; // 04: Compra a Crédito
    const paymentCode = isCreditPurchase ? '2101' : '1101';
    let paymentAcc = accounts.find((a) => a.code === paymentCode);
    if (!paymentAcc) {
      paymentAcc = accounts.find((a) => isCreditPurchase ? a.code.startsWith('2') : a.code.startsWith('1'));
    }
    if (!paymentAcc) throw new BadRequestException(`No payment/liability account found for code ${paymentCode}`);

    // ITBIS Account (2102 - ITBIS por Pagar)
    let itbisAcc = accounts.find((a) => a.code === '2102');
    if (!itbisAcc) itbisAcc = accounts.find((a) => a.name.toLowerCase().includes('itbis'));

    // Retenciones Account (2103 - Retenciones por Pagar)
    let retentionsAcc = accounts.find((a) => a.code === '2103');
    if (!retentionsAcc) retentionsAcc = accounts.find((a) => a.name.toLowerCase().includes('retencion'));

    // 2. Build double-entry lines
    const journalLines: any[] = [];
    const subtotal = dto.amount - (dto.itbis ?? 0);

    // DEBIT: Expense amount (without ITBIS)
    journalLines.push({
      accountId: expenseAcc.id,
      debit: subtotal,
      credit: 0,
      description: `Gasto base - NCF ${dto.ncf}`,
    });

    // DEBIT: ITBIS paid (if any)
    if ((dto.itbis ?? 0) > 0) {
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

    // 3. Create Balanced Journal Entry
    const journalEntry = await this.journalEntryRepository.create({
      companyId,
      date: new Date(dto.date),
      description: `Gasto proveedor: ${dto.providerName} - NCF ${dto.ncf}`,
      reference: dto.ncf,
      lines: journalLines,
    });

    await this.journalEntryRepository.post(journalEntry.id, companyId);

    // 4. Create the Expense record in DB referencing the JournalEntry
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
    });
  }
}
