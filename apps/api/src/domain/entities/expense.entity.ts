export class ExpenseEntity {
  id: string;
  companyId: string;
  providerRnc: string;
  providerName: string;
  ncf: string;
  expenseType: string;
  date: Date;
  paymentDate: Date | null;
  amount: number;
  itbis: number;
  itbisRetained: number;
  isrRetained: number;
  paymentMethod: string;
  journalEntryId: string | null;
  createdAt: Date;
  updatedAt: Date;
}
