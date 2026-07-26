import { api } from './api';

export const taxCopilotApi = api.injectEndpoints({
  endpoints: (builder) => ({
    askCopilot: builder.mutation<{ reply: string }, { companyId: string; question: string }>({
      query: ({ companyId, question }) => ({
        url: `/companies/${companyId}/tax-copilot/ask`,
        method: 'POST',
        body: { question },
      }),
    }),
  }),
});

export const { useAskCopilotMutation } = taxCopilotApi;
