export class BankTransactionEntity {
  id: string;
  companyId: string;
  accountId: string;
  date: Date;
  description: string;
  amount: number;
  reference: string | null;
  reconciled: boolean;
  journalEntryLineId: string | null;
  createdAt: Date;
  updatedAt: Date;
  
  // Optional relations
  journalEntryReference?: string | null;
  journalEntryDescription?: string | null;
}
