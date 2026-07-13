import { api } from './api';

export interface Expense {
  id: string;
  companyId: string;
  providerRnc: string;
  providerName: string;
  ncf: string;
  expenseType: string;
  date: string;
  paymentDate: string | null;
  amount: number;
  itbis: number;
  itbisRetained: number;
  isrRetained: number;
  paymentMethod: string;
  journalEntryId: string | null;
  createdAt: string;
}

export interface CreateExpenseDto {
  providerRnc: string;
  providerName: string;
  ncf: string;
  expenseType: string;
  date: string;
  paymentDate?: string;
  amount: number;
  itbis?: number;
  itbisRetained?: number;
  isrRetained?: number;
  paymentMethod: string;
}

export const expensesApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getExpenses: builder.query<Expense[], { companyId: string }>({
      query: ({ companyId }) => `/companies/${companyId}/accounting/expenses`,
      providesTags: ['Expense'],
    }),
    createExpense: builder.mutation<Expense, { companyId: string; body: CreateExpenseDto }>({
      query: ({ companyId, body }) => ({
        url: `/companies/${companyId}/accounting/expenses`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Expense', 'JournalEntry', 'Account', 'Contact'],
    }),
  }),
});

export const { useGetExpensesQuery, useCreateExpenseMutation } = expensesApi;
