import { api } from './api';
import { NcfType } from '@cmhub/shared-types';

export interface InvoiceLineItem {
  id?: string;
  productId?: string | null;
  description: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
  taxRate?: number;
  subtotal?: number;
  itbis?: number;
  total?: number;
  product?: {
    id: string;
    code: string;
    name: string;
  } | null;
}

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
  lines?: InvoiceLineItem[];
}

export interface CreateInvoiceDto {
  clientRnc: string;
  clientName: string;
  ncfType: NcfType;
  amount?: number;
  itbis?: number;
  paymentMethod: string;
  bankAccountId?: string;
  costOfGoodsSold?: number;
  itbisRetained?: number;
  isrRetained?: number;
  quotationId?: string;
  lines?: InvoiceLineItem[];
}

export interface PaginatedResponse<T> {
  data: T[];
  totalCount: number;
  page: number;
  limit: number;
}

export const invoicesApi = api.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    getInvoices: builder.query<PaginatedResponse<Invoice>, { companyId: string; page?: number; limit?: number; startDate?: string; endDate?: string }>({
      query: ({ companyId, page, limit, startDate, endDate }) => ({
        url: `/companies/${companyId}/accounting/invoices`,
        params: { page, limit, startDate, endDate },
      }),
      providesTags: ['Invoice'],
    }),
    createInvoice: builder.mutation<Invoice, { companyId: string; body: CreateInvoiceDto }>({
      query: ({ companyId, body }) => ({
        url: `/companies/${companyId}/accounting/invoices`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['JournalEntry', 'Account', 'NcfSequence', 'Contact', 'Invoice', 'Quotations'],
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
