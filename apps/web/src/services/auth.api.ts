import { api } from './api';

interface LoginRequest {
  email: string;
  password: string;
}

interface AuthResponse {
  accessToken: string;
  refreshToken: string;
}

export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  createdAt: string;
}

export interface UpdateProfileRequest {
  email?: string;
  firstName?: string;
  lastName?: string;
  password?: string;
}

export const authApi = api.injectEndpoints({
  endpoints: (builder) => ({
    login: builder.mutation<AuthResponse, LoginRequest>({
      query: (body) => ({ url: '/auth/login', method: 'POST', body }),
    }),
    register: builder.mutation<AuthResponse, LoginRequest & { firstName: string; lastName: string }>({
      query: (body) => ({ url: '/auth/register', method: 'POST', body }),
    }),
    getProfile: builder.query<UserProfile, void>({
      query: () => '/auth/me',
      providesTags: ['UserProfile'],
    }),
    updateProfile: builder.mutation<UserProfile, UpdateProfileRequest>({
      query: (body) => ({
        url: '/auth/me',
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['UserProfile'],
    }),
    refresh: builder.mutation<AuthResponse, { refreshToken: string }>({
      query: (body) => ({
        url: '/auth/refresh',
        method: 'POST',
        body,
      }),
    }),
  }),
});

export const { 
  useLoginMutation, 
  useRegisterMutation,
  useGetProfileQuery,
  useUpdateProfileMutation,
  useRefreshMutation
} = authApi;
