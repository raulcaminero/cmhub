import { api } from './api';

export interface FinancialAccount {
  id: string;
  code: string;
  name: string;
  type: string;
  balance: number;
}

export interface FinancialsReport {
  balanceSheet: FinancialAccount[];
  incomeStatement: FinancialAccount[];
}

export interface It1Summary {
  period: string;
  salesAmount: number;
  salesItbis: number;
  purchasesAmount: number;
  purchasesItbis: number;
  itbisToPay: number;
}

export interface TaxFiling {
  id: string;
  companyId: string;
  period: string;
  taxType: string;
  salesAmount: number;
  salesItbis: number;
  purchasesAmount: number;
  purchasesItbis: number;
  itbisToPay: number;
  status: string;
  filedAt: string;
}

export interface GeneralLedgerLine {
  id: string;
  date: string;
  journalEntryId: string;
  description: string;
  reference: string | null;
  debit: number;
  credit: number;
  balance: number;
}

export interface GeneralLedgerReport {
  account: {
    id: string;
    code: string;
    name: string;
    type: string;
  };
  movements: GeneralLedgerLine[];
  totals: {
    debit: number;
    credit: number;
    balance: number;
  };
}

export const reportsApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getFinancials: builder.query<FinancialsReport, { companyId: string }>({
      query: ({ companyId }) => `/companies/${companyId}/accounting/reports/financials`,
      providesTags: ['JournalEntry', 'Expense'],
    }),
    getIt1Summary: builder.query<It1Summary, { companyId: string; period: string }>({
      query: ({ companyId, period }) => ({
        url: `/companies/${companyId}/accounting/reports/it1`,
        params: { period },
      }),
      providesTags: ['JournalEntry', 'Expense'],
    }),
    getTaxFilings: builder.query<TaxFiling[], { companyId: string }>({
      query: ({ companyId }) => `/companies/${companyId}/accounting/reports/tax-filings`,
      providesTags: ['Company', 'JournalEntry'],
    }),
    createTaxFiling: builder.mutation<TaxFiling, { companyId: string; body: { period: string; taxType: string } }>({
      query: ({ companyId, body }) => ({
        url: `/companies/${companyId}/accounting/reports/tax-filings`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Company', 'JournalEntry'],
    }),
    getGeneralLedger: builder.query<
      GeneralLedgerReport,
      { companyId: string; accountId: string; startDate?: string; endDate?: string }
    >({
      query: ({ companyId, accountId, startDate, endDate }) => ({
        url: `/companies/${companyId}/accounting/reports/general-ledger`,
        params: { accountId, ...(startDate && { startDate }), ...(endDate && { endDate }) },
      }),
      providesTags: ['JournalEntry'],
    }),
  }),
});

export const {
  useGetFinancialsQuery,
  useGetIt1SummaryQuery,
  useGetTaxFilingsQuery,
  useCreateTaxFilingMutation,
  useGetGeneralLedgerQuery,
} = reportsApi;
