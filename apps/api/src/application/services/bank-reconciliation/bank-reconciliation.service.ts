import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { IBankTransactionRepository } from '@domain/repositories/bank-transaction.repository.interface';
import { IAccountRepository } from '@domain/repositories/account.repository.interface';
import { PrismaService } from '../../../infrastructure/persistence/prisma/prisma.service';
import { JournalEntryStatus } from '@domain/enums';

export const BANK_TRANSACTION_REPOSITORY = 'BANK_TRANSACTION_REPOSITORY';
export const ACCOUNT_REPOSITORY = 'ACCOUNT_REPOSITORY';

@Injectable()
export class BankReconciliationService {
  constructor(
    @Inject(BANK_TRANSACTION_REPOSITORY)
    private readonly bankTransactionRepository: IBankTransactionRepository,
    @Inject(ACCOUNT_REPOSITORY)
    private readonly accountRepository: IAccountRepository,
    private readonly prisma: PrismaService,
  ) {}

  async importCsvStatement(companyId: string, accountId: string, csvContent: string): Promise<{ importedCount: number }> {
    // Verify bank account exists in company
    const account = await this.accountRepository.findById(accountId, companyId);
    if (!account) {
      throw new BadRequestException('La cuenta contable bancaria seleccionada no existe.');
    }

    const lines = csvContent.split(/\r?\n/);
    if (lines.length <= 1) {
      throw new BadRequestException('El archivo CSV está vacío.');
    }
    if (lines.length > 5000) {
      throw new BadRequestException('El archivo CSV excede el límite máximo permitido de 5,000 líneas.');
    }

    // Header inspection
    const header = lines[0].toLowerCase();
    // Split by comma or semicolon
    const delimiter = header.includes(';') ? ';' : ',';
    const headers = header.split(delimiter).map((h) => h.trim().replace(/^["']|["']$/g, ''));
    
    const dateIdx = headers.findIndex((h) => h.includes('fecha') || h.includes('date'));
    const descIdx = headers.findIndex((h) => h.includes('desc') || h.includes('concepto') || h.includes('detalles'));
    const refIdx = headers.findIndex((h) => h.includes('ref') || h.includes('documento'));
    const amountIdx = headers.findIndex((h) => h.includes('monto') || h.includes('amount') || h.includes('valor'));

    if (dateIdx === -1 || amountIdx === -1) {
      throw new BadRequestException(
        'El formato CSV debe contener al menos las columnas "Fecha" y "Monto" (o "Date" y "Amount").'
      );
    }

    const transactionsToCreate: any[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const cols = line.split(delimiter).map((c) => c.trim().replace(/^["']|["']$/g, ''));
      if (cols.length < Math.max(dateIdx, amountIdx) + 1) continue;

      const rawDate = cols[dateIdx];
      const rawAmount = cols[amountIdx];
      const description = descIdx !== -1 ? cols[descIdx] : 'Transacción Bancaria';
      const reference = refIdx !== -1 ? cols[refIdx] : null;

      const parsedDate = new Date(rawDate);
      if (isNaN(parsedDate.getTime())) continue; // Skip invalid dates

      // Parse float, stripping currency symbols and thousands separators if present
      const cleanedAmount = rawAmount.replace(/[^\d.-]/g, '');
      const amount = parseFloat(cleanedAmount);
      if (isNaN(amount)) continue;

      transactionsToCreate.push({
        companyId,
        accountId,
        date: parsedDate,
        description,
        amount,
        reference: reference || null,
      });
    }

    if (transactionsToCreate.length > 0) {
      await this.bankTransactionRepository.createMany(transactionsToCreate);
    }

    return { importedCount: transactionsToCreate.length };
  }

  async getTransactions(companyId: string, accountId?: string) {
    return this.bankTransactionRepository.findByCompany(companyId, accountId);
  }

  async autoMatch(companyId: string, accountId: string): Promise<{ matchesCount: number }> {
    // 1. Get unreconciled imported bank transactions
    const bankTxs = await this.bankTransactionRepository.findByCompany(companyId, accountId);
    const unreconciledBankTxs = bankTxs.filter((t) => !t.reconciled);

    // 2. Get unreconciled ledger entry lines
    const unreconciledLedgerLines = await this.bankTransactionRepository.getUnreconciledLedgerLines(
      companyId,
      accountId
    );

    let matchesCount = 0;
    const matchedLedgerLineIds = new Set<string>();
    const matchPairs: { bankTxId: string; ledgerLineId: string }[] = [];

    for (const bankTx of unreconciledBankTxs) {
      // Find candidate ledger line
      // Criteria: match exact amount and date difference within 5 days
      const match = unreconciledLedgerLines.find((line) => {
        if (matchedLedgerLineIds.has(line.id)) return false;

        // Check date window (±5 days in ms)
        const dateDiff = Math.abs(new Date(line.date).getTime() - new Date(bankTx.date).getTime());
        const fiveDaysInMs = 5 * 24 * 60 * 60 * 1000;
        if (dateDiff > fiveDaysInMs) return false;

        // Check amount match
        if (bankTx.amount > 0) {
          // Deposit: should match a Debit line in ledger
          return Math.abs(line.debit - bankTx.amount) < 0.01 && line.credit === 0;
        } else {
          // Withdrawal: should match a Credit line in ledger
          const absAmount = Math.abs(bankTx.amount);
          return Math.abs(line.credit - absAmount) < 0.01 && line.debit === 0;
        }
      });

      if (match) {
        matchPairs.push({ bankTxId: bankTx.id, ledgerLineId: match.id });
        matchedLedgerLineIds.add(match.id);
        matchesCount++;
      }
    }

    if (matchPairs.length > 0) {
      await this.prisma.$transaction(
        matchPairs.map(({ bankTxId, ledgerLineId }) =>
          this.prisma.bankTransaction.update({
            where: { id: bankTxId },
            data: {
              reconciled: true,
              journalEntryLineId: ledgerLineId,
            },
          })
        )
      );
    }

    return { matchesCount };
  }

  async reconcileManually(
    companyId: string,
    bankTransactionId: string,
    journalEntryLineId: string
  ) {
    const tx = await this.bankTransactionRepository.findById(bankTransactionId, companyId);
    if (!tx) {
      throw new BadRequestException('Transacción bancaria no encontrada.');
    }

    return this.bankTransactionRepository.updateReconciliation(
      bankTransactionId,
      companyId,
      true,
      journalEntryLineId
    );
  }

  async unreconcile(companyId: string, bankTransactionId: string) {
    const tx = await this.bankTransactionRepository.findById(bankTransactionId, companyId);
    if (!tx) {
      throw new BadRequestException('Transacción bancaria no encontrada.');
    }

    return this.bankTransactionRepository.updateReconciliation(
      bankTransactionId,
      companyId,
      false,
      null
    );
  }

  async getReconciliationReport(companyId: string, accountId: string) {
    const [account, bankTxs, unreconciledBooks] = await Promise.all([
      this.accountRepository.findById(accountId, companyId),
      this.bankTransactionRepository.findByCompany(companyId, accountId),
      this.bankTransactionRepository.getUnreconciledLedgerLines(companyId, accountId),
    ]);

    if (!account) {
      throw new BadRequestException('Cuenta contable no encontrada.');
    }

    // 1. Filter bank transactions
    const unreconciledBank = bankTxs.filter((t) => !t.reconciled);
    const reconciledBank = bankTxs.filter((t) => t.reconciled);

    // 3. Compute balances
    // Bank balance = Sum of all imported bank transactions
    const bankBalance = bankTxs.reduce((sum, tx) => sum + tx.amount, 0);

    // Books balance = Ledger balance (debit - credit)
    const allLines = await this.prismaGetLedgerLines(companyId, accountId);
    const booksBalance = allLines.reduce((sum, line) => sum + line.debit - line.credit, 0);

    return {
      accountCode: account.code,
      accountName: account.name,
      bankBalance,
      booksBalance,
      difference: bankBalance - booksBalance,
      unreconciledBankCount: unreconciledBank.length,
      unreconciledBooksCount: unreconciledBooks.length,
      unreconciledBankTransactions: unreconciledBank,
      unreconciledBooksLines: unreconciledBooks,
      reconciledBankTransactions: reconciledBank,
    };
  }

  // Helper to query all ledger lines for an account
  private async prismaGetLedgerLines(companyId: string, accountId: string) {
    const lines = await this.prisma.journalEntryLine.findMany({
      where: {
        accountId,
        journalEntry: {
          companyId,
          status: JournalEntryStatus.POSTED,
        },
      },
    });

    return lines.map((l) => ({
      debit: Number(l.debit),
      credit: Number(l.credit),
    }));
  }
}
