import { Injectable, Inject, BadRequestException, NotFoundException } from '@nestjs/common';
import { IBankTransactionRepository } from '@domain/repositories/bank-transaction.repository.interface';
import { IAccountRepository } from '@domain/repositories/account.repository.interface';
import { PrismaService } from '../../../infrastructure/persistence/prisma/prisma.service';
import { JournalEntryStatus } from '@domain/enums';
import { IJournalEntryRepository } from '@domain/repositories/journal-entry.repository.interface';

export const BANK_TRANSACTION_REPOSITORY = 'BANK_TRANSACTION_REPOSITORY';
export const ACCOUNT_REPOSITORY = 'ACCOUNT_REPOSITORY';

@Injectable()
export class BankReconciliationService {
  constructor(
    @Inject(BANK_TRANSACTION_REPOSITORY)
    private readonly bankTransactionRepository: IBankTransactionRepository,
    @Inject(ACCOUNT_REPOSITORY)
    private readonly accountRepository: IAccountRepository,
    @Inject('JOURNAL_ENTRY_REPOSITORY')
    private readonly journalEntryRepository: IJournalEntryRepository,
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

  async getTransactions(
    companyId: string,
    accountId?: string,
    query?: { page?: number | string; limit?: number | string; startDate?: string; endDate?: string }
  ) {
    const page = Number(query?.page || 1);
    const limit = Number(query?.limit || 50);
    const skip = (page - 1) * limit;

    let startDate = query?.startDate ? new Date(query.startDate) : undefined;
    let endDate = query?.endDate ? new Date(query.endDate) : undefined;

    if (!startDate) {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      startDate = thirtyDaysAgo;
    }
    if (!endDate) {
      endDate = new Date();
    }

    const whereClause: any = {
      companyId,
      date: {
        gte: startDate,
        lte: endDate,
      },
    };

    if (accountId) {
      whereClause.accountId = accountId;
    }

    const [txs, totalCount] = await Promise.all([
      this.prisma.bankTransaction.findMany({
        where: whereClause,
        orderBy: { date: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.bankTransaction.count({
        where: whereClause,
      }),
    ]);

    return {
      data: txs.map((t) => ({
        id: t.id,
        companyId: t.companyId,
        accountId: t.accountId,
        date: t.date,
        description: t.description,
        amount: Number(t.amount),
        reference: t.reference,
        reconciled: t.reconciled,
        journalEntryLineId: t.journalEntryLineId,
      })),
      totalCount,
      page,
      limit,
    };
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
    const reconciledBank = bankTxs.filter((t) => t.reconciled).slice(0, 100);

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

  async getAiSuggestion(
    companyId: string,
    transactionId: string
  ): Promise<{ suggestedAccountId: string | null; confidence: number; explanation: string }> {
    const transaction = await this.bankTransactionRepository.findById(transactionId, companyId);
    if (!transaction) {
      throw new BadRequestException('Transacción bancaria no encontrada');
    }

    // 1. Query past reconciled transactions for this company
    const pastMatches = await this.prisma.bankTransaction.findMany({
      where: {
        companyId,
        reconciled: true,
        journalEntryLineId: { not: null },
      },
      select: {
        description: true,
        journalEntryLine: {
          select: {
            accountId: true,
            account: { select: { name: true } },
          },
        },
      },
    });

    // Normalize descriptions
    const cleanDescription = (text: string) => text.toLowerCase().replace(/[0-9]/g, '').trim();
    const targetClean = cleanDescription(transaction.description);

    // Look for exact matches
    const exactMatch = pastMatches.find((t) => cleanDescription(t.description) === targetClean);
    if (exactMatch && exactMatch.journalEntryLine) {
      return {
        suggestedAccountId: exactMatch.journalEntryLine.accountId,
        confidence: 100,
        explanation: `Sugerencia histórica: coincide exactamente con '${exactMatch.description}' registrada en la cuenta '${exactMatch.journalEntryLine.account.name}'.`,
      };
    }

    // Look for partial matches
    const partialMatch = pastMatches.find((t) => {
      const pastClean = cleanDescription(t.description);
      return pastClean.includes(targetClean) || targetClean.includes(pastClean);
    });

    if (partialMatch && partialMatch.journalEntryLine) {
      return {
        suggestedAccountId: partialMatch.journalEntryLine.accountId,
        confidence: 90,
        explanation: `Sugerencia histórica parcial: similar a '${partialMatch.description}' registrada en la cuenta '${partialMatch.journalEntryLine.account.name}'.`,
      };
    }

    // 2. Gemini LLM Fallback
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (apiKey) {
      try {
        const accounts = await this.prisma.account.findMany({
          where: { companyId, isActive: true },
          select: { id: true, code: true, name: true, type: true },
        });

        const prompt = `Analiza la descripción de una transacción bancaria dominicana y clasifícala seleccionando la cuenta contable más adecuada del listado provisto.

Descripción de transacción: "${transaction.description}"
Monto: ${transaction.amount} (si es negativo es un cargo/gasto/pago, si es positivo es un depósito/ingreso/cobro)

Cuentas disponibles:
${JSON.stringify(accounts.map((a) => ({ id: a.id, code: a.code, name: a.name, type: a.type })))}

Responde estrictamente en formato JSON utilizando el siguiente esquema:
{
  "suggestedAccountId": "el id de la cuenta seleccionada",
  "confidence": entre 0 y 100,
  "explanation": "explicación de la elección en español de forma concisa"
}`;

        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: {
                responseMimeType: 'application/json',
                responseSchema: {
                  type: 'OBJECT',
                  properties: {
                    suggestedAccountId: { type: 'STRING' },
                    confidence: { type: 'INTEGER' },
                    explanation: { type: 'STRING' },
                  },
                  required: ['suggestedAccountId', 'confidence', 'explanation'],
                },
              },
            }),
          }
        );

        if (res.ok) {
          const data = await res.json();
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            const parsed = JSON.parse(text);
            const matchedAccount = accounts.find((a) => a.id === parsed.suggestedAccountId);
            if (matchedAccount) {
              return {
                suggestedAccountId: parsed.suggestedAccountId,
                confidence: parsed.confidence || 75,
                explanation: `IA (Gemini): ${parsed.explanation} (Cuenta: ${matchedAccount.name})`,
              };
            }
          }
        }
      } catch (err) {
        // Fallback to keyword matching
      }
    }

    // 3. Keyword local heuristics fallback
    const descLower = transaction.description.toLowerCase();
    let keywordAccountCode: string | null = null;
    let fallbackExpl = '';

    if (descLower.includes('comision') || descLower.includes('pos') || descLower.includes('cargo') || descLower.includes('mantenimiento') || descLower.includes('adquiriente')) {
      keywordAccountCode = '6103';
      fallbackExpl = 'Sugerencia por palabra clave bancaria (cargo/comisión).';
    } else if (descLower.includes('nomina') || descLower.includes('sueldo') || descLower.includes('tss') || descLower.includes('infotep')) {
      keywordAccountCode = '6101';
      fallbackExpl = 'Sugerencia por palabra clave laboral (nómina/sueldo).';
    } else if (descLower.includes('dgii') || descLower.includes('itbis') || descLower.includes('impuesto') || descLower.includes('retencion')) {
      keywordAccountCode = '2103';
      fallbackExpl = 'Sugerencia por palabra clave tributaria (DGII/impuesto).';
    } else if (descLower.includes('claro') || descLower.includes('altice') || descLower.includes('telef') || descLower.includes('internet')) {
      keywordAccountCode = '6204';
      fallbackExpl = 'Sugerencia por palabra clave de telecomunicación (Claro/Altice/Internet).';
    } else if (descLower.includes('combustible') || descLower.includes('texaco') || descLower.includes('shell') || descLower.includes('gasolina')) {
      keywordAccountCode = '6102';
      fallbackExpl = 'Sugerencia por palabra clave de transporte/combustible.';
    }

    if (keywordAccountCode) {
      const matchedAccount = await this.prisma.account.findFirst({
        where: { companyId, code: keywordAccountCode },
      });
      if (matchedAccount) {
        return {
          suggestedAccountId: matchedAccount.id,
          confidence: 80,
          explanation: `${fallbackExpl} Asignado a la cuenta '${matchedAccount.name}'.`,
        };
      }
    }

    // Default fallback
    const defaultAccount = await this.prisma.account.findFirst({
      where: { companyId, type: transaction.amount > 0 ? 'REVENUE' : 'EXPENSE' },
    });
    return {
      suggestedAccountId: defaultAccount?.id || null,
      confidence: 50,
      explanation: 'Sugerido por defecto (tipo de movimiento). Por favor verifique y seleccione la cuenta correcta.',
    };
  }

  async reconcileWithAccount(
    companyId: string,
    transactionId: string,
    targetAccountId: string,
    createdByUserId?: string
  ): Promise<any> {
    const transaction = await this.bankTransactionRepository.findById(transactionId, companyId);
    if (!transaction) {
      throw new BadRequestException('Transacción bancaria no encontrada');
    }
    if (transaction.reconciled) {
      throw new BadRequestException('La transacción ya está conciliada');
    }

    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { lockDate: true },
    });
    // Check period lock
    const transactionDate = new Date(transaction.date);
    const lockDate = company?.lockDate ? new Date(company.lockDate) : null;
    if (lockDate && transactionDate <= lockDate) {
      throw new BadRequestException('La fecha de la transacción pertenece a un período bloqueado.');
    }

    const bankAccountId = transaction.accountId;
    const absAmount = Math.abs(transaction.amount);

    return this.prisma.$transaction(async (tx) => {
      // Create double-entry journal entry lines
      const lines = [];

      if (transaction.amount > 0) {
        // Deposit: DEBIT bank, CREDIT target account
        lines.push({
          accountId: bankAccountId,
          debit: absAmount,
          credit: 0,
          description: `Ingreso conciliado: ${transaction.description}`,
        });
        lines.push({
          accountId: targetAccountId,
          debit: 0,
          credit: absAmount,
          description: `Contrapartida conciliación: ${transaction.description}`,
        });
      } else {
        // Withdrawal: DEBIT target account, CREDIT bank
        lines.push({
          accountId: targetAccountId,
          debit: absAmount,
          credit: 0,
          description: `Gasto conciliado: ${transaction.description}`,
        });
        lines.push({
          accountId: bankAccountId,
          debit: 0,
          credit: absAmount,
          description: `Contrapartida conciliación: ${transaction.description}`,
        });
      }

      // Create the journal entry
      const journalEntry = await this.journalEntryRepository.create({
        companyId,
        date: transactionDate,
        description: `Conciliación inteligente automática: ${transaction.description}`,
        reference: 'CONCIL-AUTO',
        createdByUserId,
        lines,
      }, tx);

      // Post the journal entry to update ledger status
      await this.journalEntryRepository.post(journalEntry.id, companyId, tx);

      // Find the specific ledger line matching the bank account to link the reconciliation
      const postedEntry = await tx.journalEntry.findUnique({
        where: { id: journalEntry.id },
        include: { lines: true },
      });

      const bankLedgerLine = postedEntry?.lines.find(
        (l) => l.accountId === bankAccountId &&
               (transaction.amount > 0 ? Number(l.debit) > 0 : Number(l.credit) > 0)
      );

      if (!bankLedgerLine) {
        throw new BadRequestException('Error al enlazar el asiento contable de conciliación.');
      }

      // Reconcile bank transaction
      return this.bankTransactionRepository.updateReconciliation(
        transactionId,
        companyId,
        true,
        bankLedgerLine.id,
        tx
      );
    });
  }

  async deleteTransaction(companyId: string, transactionId: string) {
    const transaction = await this.bankTransactionRepository.findById(transactionId, companyId);
    if (!transaction) {
      throw new NotFoundException('Transacción bancaria no encontrada.');
    }

    if (transaction.reconciled) {
      throw new BadRequestException('No se puede eliminar una transacción bancaria que ya está conciliada. Desconcíliela primero.');
    }

    await this.prisma.bankTransaction.delete({
      where: { id: transactionId },
    });

    return { success: true, message: 'Transacción bancaria eliminada del extracto.' };
  }
}
