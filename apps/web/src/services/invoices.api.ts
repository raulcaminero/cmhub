import { api } from './api';
import { NcfType } from '@cmhub/shared-types';

export interface Invoice {
  id: string;
  companyId: string;
  clientRnc: string;
  clientName: string;
  ncf: string;
  ncfType: NcfType;
  date: string;
  paymentDate: string | null;
  amount: number;
  itbis: number;
  paymentMethod: string;
  journalEntryId: string | null;
  isVoided: boolean;
  costOfGoodsSold?: number | null;
  itbisRetained?: number;
  isrRetained?: number;
  createdAt: string;
}

export interface CreateInvoiceDto {
  clientRnc: string;
  clientName: string;
  ncfType: NcfType;
  amount: number;
  itbis: number;
  paymentMethod: string;
  bankAccountId?: string;
  costOfGoodsSold?: number;
  itbisRetained?: number;
  isrRetained?: number;
}

export const invoicesApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getInvoices: builder.query<Invoice[], { companyId: string }>({
      query: ({ companyId }) => `/companies/${companyId}/accounting/invoices`,
      providesTags: ['Invoice'],
    }),
    createInvoice: builder.mutation<Invoice, { companyId: string; body: CreateInvoiceDto }>({
      query: ({ companyId, body }) => ({
        url: `/companies/${companyId}/accounting/invoices`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['JournalEntry', 'Account', 'NcfSequence', 'Contact', 'Invoice'],
    }),
    collectInvoice: builder.mutation<Invoice, { companyId: string; id: string; body: { bankAccountId: string; paymentDate: string } }>({
      query: ({ companyId, id, body }) => ({
        url: `/companies/${companyId}/accounting/invoices/${id}/collect`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['JournalEntry', 'Account', 'Contact', 'Invoice'],
    }),
    voidInvoice: builder.mutation<Invoice, { companyId: string; id: string }>({
      query: ({ companyId, id }) => ({
        url: `/companies/${companyId}/accounting/invoices/${id}/void`,
        method: 'POST',
      }),
      invalidatesTags: ['JournalEntry', 'Account', 'Contact', 'Invoice'],
    }),
  }),
});

export const { useGetInvoicesQuery, useCreateInvoiceMutation, useCollectInvoiceMutation, useVoidInvoiceMutation } = invoicesApi;
