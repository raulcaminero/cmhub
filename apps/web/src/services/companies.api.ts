import { api } from './api';
import type { Company, TaxRegime } from '@cmhub/shared-types';

export type { Company };

export interface CreateCompanyDto {
  name: string;
  rnc: string;
  taxRegime?: TaxRegime;
  tradeName?: string;
  address?: string;
  phone?: string;
  email?: string;
}

export const companiesApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getCompanies: builder.query<Company[], void>({
      query: () => '/companies',
      providesTags: ['Company'],
    }),
    getCompany: builder.query<Company, string>({
      query: (id) => `/companies/${id}`,
      providesTags: ['Company'],
    }),
    createCompany: builder.mutation<Company, CreateCompanyDto>({
      query: (body) => ({ url: '/companies', method: 'POST', body }),
      invalidatesTags: ['Company'],
    }),
  }),
});

export const { useGetCompaniesQuery, useGetCompanyQuery, useCreateCompanyMutation } = companiesApi;
