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

export const reportsApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getFinancials: builder.query<FinancialsReport, { companyId: string }>({
      query: ({ companyId }) => `/companies/${companyId}/accounting/reports/financials`,
      providesTags: ['JournalEntry', 'Expense'],
    }),
    getIt1Summary: builder.query<It1Summary, { companyId: string; period: string }>({
      query: ({ companyId, period }) => `/companies/${companyId}/accounting/reports/it1?period=${period}`,
      providesTags: ['JournalEntry', 'Expense'],
    }),
  }),
});

export const { useGetFinancialsQuery, useGetIt1SummaryQuery } = reportsApi;
