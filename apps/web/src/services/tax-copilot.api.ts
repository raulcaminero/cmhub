import { api } from './api';

export const taxCopilotApi = api.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    askCopilot: builder.mutation<{ reply: string }, { companyId: string; question: string; locale?: string }>({
      query: ({ companyId, question, locale }) => ({
        url: `/companies/${companyId}/tax-copilot/ask`,
        method: 'POST',
        body: { question, locale },
      }),
    }),
  }),
});

export const { useAskCopilotMutation } = taxCopilotApi;
