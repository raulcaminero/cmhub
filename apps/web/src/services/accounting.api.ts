import { api } from './api';
import type { Account, JournalEntry, AccountType } from '@cmhub/shared-types';

export type { Account, JournalEntry, AccountType };

export interface CreateAccountDto {
  code: string;
  name: string;
  type: AccountType;
  parentId?: string;
}

export interface JournalEntryLineDto {
  accountId: string;
  debit: number;
  credit: number;
  description?: string;
}

export interface CreateJournalEntryDto {
  date: string;
  description: string;
  reference?: string;
  lines: JournalEntryLineDto[];
}

export const accountingApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getAccounts: builder.query<Account[], { companyId: string; type?: AccountType; isActive?: boolean }>({
      query: ({ companyId, ...params }) => ({ url: `/companies/${companyId}/accounting/accounts`, params }),
      providesTags: ['Account'],
    }),
    createAccount: builder.mutation<Account, { companyId: string; body: CreateAccountDto }>({
      query: ({ companyId, body }) => ({
        url: `/companies/${companyId}/accounting/accounts`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Account'],
    }),
    getJournalEntries: builder.query<JournalEntry[], { companyId: string }>({
      query: ({ companyId }) => `/companies/${companyId}/accounting/journal-entries`,
      providesTags: ['JournalEntry'],
    }),
    createJournalEntry: builder.mutation<JournalEntry, { companyId: string; body: CreateJournalEntryDto }>({
      query: ({ companyId, body }) => ({
        url: `/companies/${companyId}/accounting/journal-entries`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['JournalEntry'],
    }),
    postJournalEntry: builder.mutation<JournalEntry, { companyId: string; id: string }>({
      query: ({ companyId, id }) => ({
        url: `/companies/${companyId}/accounting/journal-entries/${id}/post`,
        method: 'PATCH',
      }),
      invalidatesTags: ['JournalEntry'],
    }),
    voidJournalEntry: builder.mutation<JournalEntry, { companyId: string; id: string }>({
      query: ({ companyId, id }) => ({
        url: `/companies/${companyId}/accounting/journal-entries/${id}/void`,
        method: 'PATCH',
      }),
      invalidatesTags: ['JournalEntry'],
    }),
    getPeriodLock: builder.query<{ lockDate: string | null }, { companyId: string }>({
      query: ({ companyId }) => `/companies/${companyId}/accounting/period-lock`,
      providesTags: ['Company'],
    }),
    updatePeriodLock: builder.mutation<{ lockDate: string | null }, { companyId: string; body: { lockDate: string | null } }>({
      query: ({ companyId, body }) => ({
        url: `/companies/${companyId}/accounting/period-lock`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Company', 'JournalEntry', 'Account', 'Expense', 'NcfSequence'],
    }),
  }),
  overrideExisting: true,
});

export const {
  useGetAccountsQuery,
  useCreateAccountMutation,
  useGetJournalEntriesQuery,
  useCreateJournalEntryMutation,
  usePostJournalEntryMutation,
  useVoidJournalEntryMutation,
  useGetPeriodLockQuery,
  useUpdatePeriodLockMutation,
} = accountingApi;
