import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { getCookie } from '@/lib/cookies';

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
}

interface Credentials {
  accessToken: string;
  refreshToken: string;
}

const initialAccessToken = getCookie('accessToken');
const initialRefreshToken = getCookie('refreshToken');

const initialState: AuthState = {
  accessToken: initialAccessToken,
  refreshToken: initialRefreshToken,
  isAuthenticated: !!initialAccessToken,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials(state, action: PayloadAction<Credentials>) {
      state.accessToken = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken;
      state.isAuthenticated = true;
    },
    logout(state) {
      state.accessToken = null;
      state.refreshToken = null;
      state.isAuthenticated = false;
    },
  },
});

export const { setCredentials, logout } = authSlice.actions;
export const authReducer = authSlice.reducer;
