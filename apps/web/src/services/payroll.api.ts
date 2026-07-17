import { api } from './api';

export interface PayrollItem {
  id: string;
  payrollId: string;
  employeeId: string;
  grossSalary: number;
  sfsEmployee: number;
  afpEmployee: number;
  isrDeduction: number;
  netSalary: number;
  createdAt: string;
  employeeName: string;
  employeeCedula: string;
  employeeJobTitle: string | null;
}

export interface Payroll {
  id: string;
  companyId: string;
  period: string;
  grossSalary: number;
  sfsEmployee: number;
  sfsEmployer: number;
  afpEmployee: number;
  afpEmployer: number;
  arlEmployer: number;
  isrDeduction: number;
  netSalary: number;
  journalEntryId: string | null;
  createdAt: string;
  items?: PayrollItem[];
}

export interface CalculatedTaxes {
  grossSalary: number;
  sfsEmployee: number;
  sfsEmployer: number;
  afpEmployee: number;
  afpEmployer: number;
  arlEmployer: number;
  isrDeduction: number;
  netSalary: number;
}

export const payrollApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getPayrolls: builder.query<Payroll[], { companyId: string }>({
      query: ({ companyId }) => `/companies/${companyId}/accounting/payroll`,
      providesTags: ['Payroll'],
    }),
    getPayroll: builder.query<Payroll, { companyId: string; id: string }>({
      query: ({ companyId, id }) => `/companies/${companyId}/accounting/payroll/${id}`,
      providesTags: ['Payroll'],
    }),
    createPayroll: builder.mutation<Payroll, { companyId: string; body: { period: string } }>({
      query: ({ companyId, body }) => ({
        url: `/companies/${companyId}/accounting/payroll`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['JournalEntry', 'Account', 'Payroll'],
    }),
    deletePayroll: builder.mutation<Payroll, { companyId: string; id: string }>({
      query: ({ companyId, id }) => ({
        url: `/companies/${companyId}/accounting/payroll/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['JournalEntry', 'Account', 'Payroll'],
    }),
    calculateTaxes: builder.mutation<CalculatedTaxes, { companyId: string; salary: number }>({
      query: ({ companyId, salary }) => ({
        url: `/companies/${companyId}/accounting/payroll/calculate`,
        method: 'POST',
        body: { salary },
      }),
    }),
  }),
});

export const {
  useGetPayrollsQuery,
  useGetPayrollQuery,
  useCreatePayrollMutation,
  useDeletePayrollMutation,
  useCalculateTaxesMutation,
} = payrollApi;
