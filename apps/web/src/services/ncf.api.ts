import { api } from './api';
import { NcfType } from '@cmhub/shared-types';

export interface NcfSequence {
  id: string;
  companyId: string;
  type: NcfType;
  prefix: string;
  current: number;
  max: number;
  isActive: boolean;
  expiresAt: string;
  createdAt: string;
}

export interface CreateNcfSequenceDto {
  type: NcfType;
  prefix: string;
  max: number;
  expiresAt: string;
}

export const ncfApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getNcfSequences: builder.query<NcfSequence[], { companyId: string }>({
      query: ({ companyId }) => `/companies/${companyId}/accounting/ncf/sequences`,
      providesTags: ['NcfSequence'],
    }),
    createNcfSequence: builder.mutation<NcfSequence, { companyId: string; body: CreateNcfSequenceDto }>({
      query: ({ companyId, body }) => ({
        url: `/companies/${companyId}/accounting/ncf/sequences`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['NcfSequence'],
    }),
    generateNcf: builder.mutation<string, { companyId: string; type: NcfType }>({
      query: ({ companyId, type }) => ({
        url: `/companies/${companyId}/accounting/ncf/generate`,
        method: 'POST',
        body: { type },
      }),
      invalidatesTags: ['NcfSequence'],
    }),
  }),
});

export const {
  useGetNcfSequencesQuery,
  useCreateNcfSequenceMutation,
  useGenerateNcfMutation,
} = ncfApi;
