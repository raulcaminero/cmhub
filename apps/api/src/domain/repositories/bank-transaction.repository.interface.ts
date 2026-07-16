import { BankTransactionEntity } from '../entities/bank-transaction.entity';

export interface IBankTransactionRepository {
  findById(id: string, companyId: string): Promise<BankTransactionEntity | null>;
  findByCompany(companyId: string, accountId?: string): Promise<BankTransactionEntity[]>;
  createMany(
    transactions: Omit<BankTransactionEntity, 'id' | 'reconciled' | 'journalEntryLineId' | 'createdAt' | 'updatedAt'>[]
  ): Promise<void>;
  updateReconciliation(id: string, companyId: string, reconciled: boolean, journalEntryLineId: string | null): Promise<BankTransactionEntity>;
  delete(id: string, companyId: string): Promise<BankTransactionEntity>;
  getUnreconciledLedgerLines(companyId: string, accountId: string): Promise<any[]>;
}
