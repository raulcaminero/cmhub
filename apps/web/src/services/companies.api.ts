import { api } from './api';
import type { Company, TaxRegime } from '@cmhub/shared-types';

export type { Company };

export interface CreateCompanyDto {
  name: string;
  rnc: string;
  taxRegime?: TaxRegime;
  tradeName?: string;
  country?: string;    // ISO 3166-1 alpha-2
  currency?: string;   // ISO 4217
  locale?: string;     // BCP 47
  enabledModules?: string[];
  address?: string;
  phone?: string;
  email?: string;
}

export interface CompanyUser {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'ADMIN' | 'CONTADOR' | 'VIEWER';
  joinedAt?: string;
}

export const companiesApi = api.injectEndpoints({
  overrideExisting: true,
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
    updateCompany: builder.mutation<Company, { id: string; body: Partial<CreateCompanyDto> }>({
      query: ({ id, body }) => ({
        url: `/companies/${id}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['Company'],
    }),
    getCompanyUsers: builder.query<CompanyUser[], string>({
      query: (companyId) => `/companies/${companyId}/users`,
      providesTags: ['CompanyUser'],
    }),
    addCompanyUser: builder.mutation<CompanyUser, { companyId: string; email: string; role: 'ADMIN' | 'CONTADOR' | 'VIEWER' }>({
      query: ({ companyId, email, role }) => ({
        url: `/companies/${companyId}/users`,
        method: 'POST',
        body: { email, role },
      }),
      invalidatesTags: ['CompanyUser'],
    }),
    updateUserRole: builder.mutation<CompanyUser, { companyId: string; userId: string; role: 'ADMIN' | 'CONTADOR' | 'VIEWER' }>({
      query: ({ companyId, userId, role }) => ({
        url: `/companies/${companyId}/users/${userId}/role`,
        method: 'PUT',
        body: { role },
      }),
      invalidatesTags: ['CompanyUser'],
    }),
    removeCompanyUser: builder.mutation<{ message: string }, { companyId: string; userId: string }>({
      query: ({ companyId, userId }) => ({
        url: `/companies/${companyId}/users/${userId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['CompanyUser'],
    }),
  }),
});

export const { 
  useGetCompaniesQuery, 
  useGetCompanyQuery, 
  useCreateCompanyMutation,
  useUpdateCompanyMutation,
  useGetCompanyUsersQuery,
  useAddCompanyUserMutation,
  useUpdateUserRoleMutation,
  useRemoveCompanyUserMutation
} = companiesApi;
