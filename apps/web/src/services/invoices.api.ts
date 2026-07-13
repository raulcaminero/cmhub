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
  amount: number;
  itbis: number;
  paymentMethod: string;
  journalEntryId: string | null;
  createdAt: string;
}

export interface CreateInvoiceDto {
  clientRnc: string;
  clientName: string;
  ncfType: NcfType;
  amount: number;
  itbis: number;
  paymentMethod: string;
}

export const invoicesApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getInvoices: builder.query<Invoice[], { companyId: string }>({
      query: ({ companyId }) => `/companies/${companyId}/accounting/invoices`,
      providesTags: ['JournalEntry'],
    }),
    createInvoice: builder.mutation<Invoice, { companyId: string; body: CreateInvoiceDto }>({
      query: ({ companyId, body }) => ({
        url: `/companies/${companyId}/accounting/invoices`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['JournalEntry', 'Account', 'NcfSequence', 'Contact'],
    }),
  }),
});

export const { useGetInvoicesQuery, useCreateInvoiceMutation } = invoicesApi;
