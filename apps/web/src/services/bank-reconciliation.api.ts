import { api } from './api';

export interface BankTransaction {
  id: string;
  companyId: string;
  accountId: string;
  date: string;
  description: string;
  amount: number;
  reference: string | null;
  reconciled: boolean;
  journalEntryLineId: string | null;
  journalEntryReference?: string | null;
  journalEntryDescription?: string | null;
}

export interface LedgerLine {
  id: string;
  journalEntryId: string;
  accountId: string;
  debit: number;
  credit: number;
  description: string | null;
  date: string;
  reference: string | null;
  entryDescription: string;
}

export interface ReconciliationReport {
  accountCode: string;
  accountName: string;
  bankBalance: number;
  booksBalance: number;
  difference: number;
  unreconciledBankCount: number;
  unreconciledBooksCount: number;
  unreconciledBankTransactions: BankTransaction[];
  unreconciledBooksLines: LedgerLine[];
  reconciledBankTransactions: BankTransaction[];
}

export const reconciliationApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getReconciliationTransactions: builder.query<BankTransaction[], { companyId: string; accountId?: string }>({
      query: ({ companyId, accountId }) => ({
        url: `/companies/${companyId}/accounting/reconciliation/transactions`,
        params: accountId ? { accountId } : {},
      }),
      providesTags: ['JournalEntry', 'Account'],
    }),
    importStatementCsv: builder.mutation<{ importedCount: number }, { companyId: string; accountId: string; csvContent: string }>({
      query: ({ companyId, accountId, csvContent }) => ({
        url: `/companies/${companyId}/accounting/reconciliation/import`,
        method: 'POST',
        body: { accountId, csvContent },
      }),
      invalidatesTags: ['JournalEntry', 'Account'],
    }),
    autoMatchReconciliation: builder.mutation<{ matchesCount: number }, { companyId: string; accountId: string }>({
      query: ({ companyId, accountId }) => ({
        url: `/companies/${companyId}/accounting/reconciliation/auto-match`,
        method: 'POST',
        body: { accountId },
      }),
      invalidatesTags: ['JournalEntry', 'Account'],
    }),
    matchReconciliation: builder.mutation<BankTransaction, { companyId: string; bankTransactionId: string; journalEntryLineId: string }>({
      query: ({ companyId, bankTransactionId, journalEntryLineId }) => ({
        url: `/companies/${companyId}/accounting/reconciliation/match`,
        method: 'POST',
        body: { bankTransactionId, journalEntryLineId },
      }),
      invalidatesTags: ['JournalEntry', 'Account'],
    }),
    unmatchReconciliation: builder.mutation<BankTransaction, { companyId: string; id: string }>({
      query: ({ companyId, id }) => ({
        url: `/companies/${companyId}/accounting/reconciliation/unmatch/${id}`,
        method: 'POST',
      }),
      invalidatesTags: ['JournalEntry', 'Account'],
    }),
    getReconciliationReport: builder.query<ReconciliationReport, { companyId: string; accountId: string }>({
      query: ({ companyId, accountId }) => `/companies/${companyId}/accounting/reconciliation/report/${accountId}`,
      providesTags: ['JournalEntry', 'Account'],
    }),
  }),
});

export const {
  useGetReconciliationTransactionsQuery,
  useImportStatementCsvMutation,
  useAutoMatchReconciliationMutation,
  useMatchReconciliationMutation,
  useUnmatchReconciliationMutation,
  useGetReconciliationReportQuery,
} = reconciliationApi;
