import { api } from './api';

export interface Employee {
  id: string;
  companyId: string;
  cedula: string;
  name: string;
  salary: number;
  jobTitle: string | null;
  createdAt: string;
}

export interface CreateEmployeeDto {
  cedula: string;
  name: string;
  salary: number;
  jobTitle?: string;
}

export const employeesApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getEmployees: builder.query<Employee[], { companyId: string }>({
      query: ({ companyId }) => `/companies/${companyId}/accounting/employees`,
      providesTags: ['Company'],
    }),
    createEmployee: builder.mutation<Employee, { companyId: string; body: CreateEmployeeDto }>({
      query: ({ companyId, body }) => ({
        url: `/companies/${companyId}/accounting/employees`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Company'],
    }),
    deleteEmployee: builder.mutation<Employee, { companyId: string; id: string }>({
      query: ({ companyId, id }) => ({
        url: `/companies/${companyId}/accounting/employees/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Company'],
    }),
  }),
});

export const {
  useGetEmployeesQuery,
  useCreateEmployeeMutation,
  useDeleteEmployeeMutation,
} = employeesApi;
