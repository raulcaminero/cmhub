import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query/react';
import type { RootState } from '@/store';
import { setCredentials, logout } from '@/store/slices/auth.slice';

const baseQuery = fetchBaseQuery({
  baseUrl: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api',
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as RootState).auth.accessToken;
    if (token) headers.set('Authorization', `Bearer ${token}`);
    return headers;
  },
});

const baseQueryWithReauth: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, apiInstance, extraOptions) => {
  let result = await baseQuery(args, apiInstance, extraOptions);

  if (result.error && result.error.status === 401) {
    const state = apiInstance.getState() as RootState;
    const refreshToken = state.auth.refreshToken;

    if (refreshToken) {
      // Try to refresh tokens
      const refreshResult = await baseQuery(
        {
          url: '/auth/refresh',
          method: 'POST',
          body: { refreshToken },
        },
        apiInstance,
        extraOptions
      );

      if (refreshResult.data) {
        // Store new tokens in Redux state & cookies
        const data = refreshResult.data as { accessToken: string; refreshToken: string };
        apiInstance.dispatch(setCredentials(data));

        // Retry the original query with the new access token
        result = await baseQuery(args, apiInstance, extraOptions);
      } else {
        apiInstance.dispatch(logout());
      }
    } else {
      apiInstance.dispatch(logout());
    }
  }

  return result;
};

export const api = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Account', 'JournalEntry', 'Company', 'Expense', 'NcfSequence', 'Contact', 'UserProfile'],
  endpoints: () => ({}),
});
