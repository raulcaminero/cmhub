import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query/react';
import type { RootState } from '@/store';
import { setCredentials, logout } from '@/store/slices/auth.slice';
import { API_BASE_URL } from '@/lib/constants';

const baseQuery = fetchBaseQuery({
  baseUrl: API_BASE_URL,
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as RootState).auth.accessToken;
    if (token) headers.set('Authorization', `Bearer ${token}`);
    return headers;
  },
});

let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;

const baseQueryWithReauth: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, apiInstance, extraOptions) => {
  let result = await baseQuery(args, apiInstance, extraOptions);

  if (result.error && result.error.status === 401) {
    if (!isRefreshing) {
      isRefreshing = true;
      refreshPromise = new Promise<string | null>(async (resolve) => {
        const state = apiInstance.getState() as RootState;
        const refreshToken = state.auth.refreshToken;

        if (refreshToken) {
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
            const data = refreshResult.data as { accessToken: string; refreshToken: string };
            apiInstance.dispatch(setCredentials(data));
            resolve(data.accessToken);
            return;
          }
        }
        apiInstance.dispatch(logout());
        resolve(null);
      }).finally(() => {
        isRefreshing = false;
        refreshPromise = null;
      });
    }

    const newAccessToken = await refreshPromise;
    if (newAccessToken) {
      result = await baseQuery(args, apiInstance, extraOptions);
    }
  }

  return result;
};

export const api = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithReauth,
  tagTypes: [
    'Account', 'JournalEntry', 'Company', 'Expense', 'NcfSequence', 
    'Contact', 'UserProfile', 'Invoice', 'Employee', 'Payroll', 'BankTransaction'
  ],
  endpoints: () => ({}),
});
