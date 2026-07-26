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
  isVoided: boolean;
  isForeignPayment: boolean;
  foreignCountry: string | null;
  foreignTaxId: string | null;
  foreignPaymentType: string | null;
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
  bankAccountId?: string;
  isForeignPayment?: boolean;
  foreignCountry?: string;
  foreignTaxId?: string;
  foreignPaymentType?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  totalCount: number;
  page: number;
  limit: number;
}

export const expensesApi = api.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    getExpenses: builder.query<PaginatedResponse<Expense>, { companyId: string; page?: number; limit?: number; startDate?: string; endDate?: string }>({
      query: ({ companyId, page, limit, startDate, endDate }) => ({
        url: `/companies/${companyId}/accounting/expenses`,
        params: { page, limit, startDate, endDate },
      }),
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
    payExpense: builder.mutation<Expense, { companyId: string; id: string; body: { bankAccountId: string; paymentDate: string } }>({
      query: ({ companyId, id, body }) => ({
        url: `/companies/${companyId}/accounting/expenses/${id}/pay`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Expense', 'JournalEntry', 'Account', 'Contact'],
    }),
    voidExpense: builder.mutation<Expense, { companyId: string; id: string }>({
      query: ({ companyId, id }) => ({
        url: `/companies/${companyId}/accounting/expenses/${id}/void`,
        method: 'POST',
      }),
      invalidatesTags: ['Expense', 'JournalEntry', 'Account', 'Contact'],
    }),
    importExpenses: builder.mutation<{ importedCount: number; expenses: Expense[] }, { companyId: string; body: CreateExpenseDto[] }>({
      query: ({ companyId, body }) => ({
        url: `/companies/${companyId}/accounting/expenses/import`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Expense', 'JournalEntry', 'Account', 'Contact'],
    }),
    importOcr: builder.mutation<{ jobId: string; status: string }, { companyId: string; body: FormData }>({
      query: ({ companyId, body }) => ({
        url: `/companies/${companyId}/accounting/expenses/import-ocr`,
        method: 'POST',
        body,
      }),
    }),
    getOcrStatus: builder.query<{ jobId: string; status: string; result: any }, { companyId: string; jobId: string }>({
      query: ({ companyId, jobId }) => ({
        url: `/companies/${companyId}/accounting/expenses/ocr-status/${jobId}`,
      }),
    }),
  }),
});

export const {
  useGetExpensesQuery,
  useCreateExpenseMutation,
  usePayExpenseMutation,
  useVoidExpenseMutation,
  useImportExpensesMutation,
  useImportOcrMutation,
  useLazyGetOcrStatusQuery,
} = expensesApi;
