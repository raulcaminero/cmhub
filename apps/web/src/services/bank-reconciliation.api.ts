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

export interface PaginatedResponse<T> {
  data: T[];
  totalCount: number;
  page: number;
  limit: number;
}

export const reconciliationApi = api.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    getReconciliationTransactions: builder.query<PaginatedResponse<BankTransaction>, { companyId: string; accountId?: string; page?: number; limit?: number; startDate?: string; endDate?: string }>({
      query: ({ companyId, accountId, page, limit, startDate, endDate }) => ({
        url: `/companies/${companyId}/accounting/reconciliation/transactions`,
        params: { accountId, page, limit, startDate, endDate },
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
        method: 'DELETE',
      }),
      invalidatesTags: ['JournalEntry', 'Account'],
    }),
    getReconciliationReport: builder.query<ReconciliationReport, { companyId: string; accountId: string }>({
      query: ({ companyId, accountId }) => `/companies/${companyId}/accounting/reconciliation/report/${accountId}`,
      providesTags: ['JournalEntry', 'Account'],
    }),
    importStatementOcr: builder.mutation<{ jobId: string; status: string }, { companyId: string; body: FormData }>({
      query: ({ companyId, body }) => ({
        url: `/companies/${companyId}/accounting/reconciliation/import-ocr`,
        method: 'POST',
        body,
      }),
    }),
    getStatementOcrStatus: builder.query<{ jobId: string; status: string; result: any }, { companyId: string; jobId: string }>({
      query: ({ companyId, jobId }) => ({
        url: `/companies/${companyId}/accounting/reconciliation/ocr-status/${jobId}`,
      }),
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
  useImportStatementOcrMutation,
  useLazyGetStatementOcrStatusQuery,
} = reconciliationApi;
