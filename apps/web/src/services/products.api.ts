import { api } from './api';

export interface Product {
  id: string;
  companyId: string;
  code: string;
  sku?: string | null;
  name: string;
  description?: string | null;
  type: 'SERVICE' | 'PRODUCT' | 'DIGITAL';
  price: number;
  cost?: number | null;
  taxRate: number;
  unit: string;
  revenueAccountId?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProductPayload {
  code?: string;
  sku?: string;
  name: string;
  description?: string;
  type?: 'SERVICE' | 'PRODUCT' | 'DIGITAL';
  price: number;
  cost?: number;
  taxRate?: number;
  unit?: string;
  revenueAccountId?: string;
}

export const productsApi = api.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    getProducts: builder.query<Product[], { companyId: string; includeInactive?: boolean }>({
      query: ({ companyId, includeInactive }) => ({
        url: `/companies/${companyId}/sales/products`,
        params: includeInactive ? { includeInactive: true } : undefined,
      }),
      providesTags: ['Products'],
    }),
    createProduct: builder.mutation<Product, { companyId: string; body: CreateProductPayload }>({
      query: ({ companyId, body }) => ({
        url: `/companies/${companyId}/sales/products`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Products'],
    }),
    updateProduct: builder.mutation<Product, { companyId: string; id: string; body: Partial<CreateProductPayload> & { isActive?: boolean } }>({
      query: ({ companyId, id, body }) => ({
        url: `/companies/${companyId}/sales/products/${id}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['Products'],
    }),
    toggleProductActive: builder.mutation<Product, { companyId: string; id: string }>({
      query: ({ companyId, id }) => ({
        url: `/companies/${companyId}/sales/products/${id}/toggle-active`,
        method: 'PATCH',
      }),
      invalidatesTags: ['Products'],
    }),
  }),
});

export const {
  useGetProductsQuery,
  useCreateProductMutation,
  useUpdateProductMutation,
  useToggleProductActiveMutation,
} = productsApi;
