import { api } from './api';

export type ContactType = 'CLIENT' | 'PROVIDER' | 'BOTH';

export interface Contact {
  id: string;
  companyId: string;
  rnc: string;
  name: string;
  type: ContactType;
  email: string | null;
  phone: string | null;
  address: string | null;
  createdAt: string;
}

export interface CreateContactDto {
  rnc: string;
  name: string;
  type: ContactType;
  email?: string;
  phone?: string;
  address?: string;
}

export const contactsApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getContacts: builder.query<Contact[], { companyId: string }>({
      query: ({ companyId }) => `/companies/${companyId}/accounting/contacts`,
      providesTags: ['Contact'],
    }),
    createContact: builder.mutation<Contact, { companyId: string; body: CreateContactDto }>({
      query: ({ companyId, body }) => ({
        url: `/companies/${companyId}/accounting/contacts`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Contact'],
    }),
    deleteContact: builder.mutation<Contact, { companyId: string; id: string }>({
      query: ({ companyId, id }) => ({
        url: `/companies/${companyId}/accounting/contacts/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Contact'],
    }),
    updateContact: builder.mutation<Contact, { companyId: string; id: string; body: Partial<CreateContactDto> }>({
      query: ({ companyId, id, body }) => ({
        url: `/companies/${companyId}/accounting/contacts/${id}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['Contact'],
    }),
  }),
});

export const {
  useGetContactsQuery,
  useCreateContactMutation,
  useDeleteContactMutation,
  useUpdateContactMutation,
} = contactsApi;
