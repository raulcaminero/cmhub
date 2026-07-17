import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IBankTransactionRepository } from '@domain/repositories/bank-transaction.repository.interface';
import { BankTransactionEntity } from '@domain/entities/bank-transaction.entity';
import { JournalEntryStatus } from '@domain/enums';

@Injectable()
export class BankTransactionRepository implements IBankTransactionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string, companyId: string): Promise<BankTransactionEntity | null> {
    const tx = await this.prisma.bankTransaction.findFirst({
      where: { id, companyId },
      include: {
        journalEntryLine: {
          include: {
            journalEntry: true,
          },
        },
      },
    });
    if (!tx) return null;
    return {
      id: tx.id,
      companyId: tx.companyId,
      accountId: tx.accountId,
      date: tx.date,
      description: tx.description,
      amount: Number(tx.amount),
      reference: tx.reference,
      reconciled: tx.reconciled,
      journalEntryLineId: tx.journalEntryLineId,
      createdAt: tx.createdAt,
      updatedAt: tx.updatedAt,
      journalEntryReference: tx.journalEntryLine?.journalEntry?.reference,
      journalEntryDescription: tx.journalEntryLine?.journalEntry?.description,
    };
  }

  async findByCompany(companyId: string, accountId?: string): Promise<BankTransactionEntity[]> {
    const txs = await this.prisma.bankTransaction.findMany({
      where: {
        companyId,
        ...(accountId ? { accountId } : {}),
      },
      include: {
        journalEntryLine: {
          include: {
            journalEntry: true,
          },
        },
      },
      orderBy: { date: 'desc' },
    });

    return txs.map((tx) => ({
      id: tx.id,
      companyId: tx.companyId,
      accountId: tx.accountId,
      date: tx.date,
      description: tx.description,
      amount: Number(tx.amount),
      reference: tx.reference,
      reconciled: tx.reconciled,
      journalEntryLineId: tx.journalEntryLineId,
      createdAt: tx.createdAt,
      updatedAt: tx.updatedAt,
      journalEntryReference: tx.journalEntryLine?.journalEntry?.reference,
      journalEntryDescription: tx.journalEntryLine?.journalEntry?.description,
    }));
  }

  async createMany(
    transactions: Omit<BankTransactionEntity, 'id' | 'reconciled' | 'journalEntryLineId' | 'createdAt' | 'updatedAt'>[],
  ): Promise<void> {
    await this.prisma.bankTransaction.createMany({
      data: transactions.map((t) => ({
        companyId: t.companyId,
        accountId: t.accountId,
        date: t.date,
        description: t.description,
        amount: t.amount,
        reference: t.reference,
        reconciled: false,
      })),
    });
  }

  async updateReconciliation(
    id: string,
    companyId: string,
    reconciled: boolean,
    journalEntryLineId: string | null,
    tx?: any,
  ): Promise<BankTransactionEntity> {
    const client = tx || this.prisma;
    const existing = await client.bankTransaction.findUnique({ where: { id } });
    if (!existing || existing.companyId !== companyId) {
      throw new NotFoundException('Transacción no encontrada o acceso denegado.');
    }
    const bankTx = await client.bankTransaction.update({
      where: { id },
      data: {
        reconciled,
        journalEntryLineId,
      },
    });

    return {
      id: bankTx.id,
      companyId: bankTx.companyId,
      accountId: bankTx.accountId,
      date: bankTx.date,
      description: bankTx.description,
      amount: Number(bankTx.amount),
      reference: bankTx.reference,
      reconciled: bankTx.reconciled,
      journalEntryLineId: bankTx.journalEntryLineId,
      createdAt: bankTx.createdAt,
      updatedAt: bankTx.updatedAt,
    };
  }

  async delete(id: string, companyId: string, tx?: any): Promise<BankTransactionEntity> {
    const client = tx || this.prisma;
    const existing = await client.bankTransaction.findUnique({ where: { id } });
    if (!existing || existing.companyId !== companyId) {
      throw new NotFoundException('Transacción no encontrada o acceso denegado.');
    }
    const bankTx = await client.bankTransaction.delete({
      where: { id },
    });

    return {
      id: bankTx.id,
      companyId: bankTx.companyId,
      accountId: bankTx.accountId,
      date: bankTx.date,
      description: bankTx.description,
      amount: Number(bankTx.amount),
      reference: bankTx.reference,
      reconciled: bankTx.reconciled,
      journalEntryLineId: bankTx.journalEntryLineId,
      createdAt: bankTx.createdAt,
      updatedAt: bankTx.updatedAt,
    };
  }

  async getUnreconciledLedgerLines(companyId: string, accountId: string): Promise<any[]> {
    const lines = await this.prisma.journalEntryLine.findMany({
      where: {
        accountId,
        journalEntry: {
          companyId,
          status: JournalEntryStatus.POSTED,
        },
        bankTransactions: {
          none: {},
        },
      },
      include: {
        journalEntry: true,
      },
      orderBy: {
        journalEntry: {
          date: 'asc',
        },
      },
    });

    return lines.map((l) => ({
      id: l.id,
      journalEntryId: l.journalEntryId,
      accountId: l.accountId,
      debit: Number(l.debit),
      credit: Number(l.credit),
      description: l.description,
      date: l.journalEntry.date,
      reference: l.journalEntry.reference,
      entryDescription: l.journalEntry.description,
    }));
  }
}
