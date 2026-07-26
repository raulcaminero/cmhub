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

export const expensesApi = api.injectEndpoints({
  overrideExisting: true,
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
    importOcr: builder.mutation<{ providerRnc: string; providerName: string; ncf: string; date: string; amount: number; itbis: number; expenseType: string }, { companyId: string; body: FormData }>({
      query: ({ companyId, body }) => ({
        url: `/companies/${companyId}/accounting/expenses/import-ocr`,
        method: 'POST',
        body,
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
} = expensesApi;
