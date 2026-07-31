import { api } from './api';

export interface QuotationLine {
  id: string;
  quotationId: string;
  productId?: string | null;
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  taxRate: number;
  subtotal: number;
  itbis: number;
  total: number;
  product?: {
    id: string;
    code: string;
    name: string;
  } | null;
}

export interface Quotation {
  id: string;
  companyId: string;
  number: string;
  clientRnc?: string | null;
  clientName: string;
  clientEmail?: string | null;
  status: 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'CONVERTED';
  validUntil?: string | null;
  notes?: string | null;
  subtotal: number;
  itbis: number;
  total: number;
  invoiceId?: string | null;
  createdAt: string;
  updatedAt: string;
  lines: QuotationLine[];
}

export interface CreateQuotationLinePayload {
  productId?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
  taxRate?: number;
}

export interface CreateQuotationPayload {
  clientRnc?: string;
  clientName: string;
  clientEmail?: string;
  validUntil?: string;
  notes?: string;
  lines: CreateQuotationLinePayload[];
}

export const quotationsApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getQuotations: builder.query<Quotation[], { companyId: string }>({
      query: ({ companyId }) => ({
        url: `/companies/${companyId}/sales/quotations`,
      }),
      providesTags: ['Quotations'],
    }),
    getQuotation: builder.query<Quotation, { companyId: string; id: string }>({
      query: ({ companyId, id }) => ({
        url: `/companies/${companyId}/sales/quotations/${id}`,
      }),
      providesTags: ['Quotations'],
    }),
    createQuotation: builder.mutation<Quotation, { companyId: string; body: CreateQuotationPayload }>({
      query: ({ companyId, body }) => ({
        url: `/companies/${companyId}/sales/quotations`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Quotations'],
    }),
    updateQuotationStatus: builder.mutation<Quotation, { companyId: string; id: string; status: Quotation['status'] }>({
      query: ({ companyId, id, status }) => ({
        url: `/companies/${companyId}/sales/quotations/${id}/status`,
        method: 'PATCH',
        body: { status },
      }),
      invalidatesTags: ['Quotations'],
    }),
  }),
});

export const {
  useGetQuotationsQuery,
  useGetQuotationQuery,
  useCreateQuotationMutation,
  useUpdateQuotationStatusMutation,
} = quotationsApi;
