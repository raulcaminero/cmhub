import { configureStore } from '@reduxjs/toolkit';
import { api } from '@/services/api';
import { authReducer } from './slices/auth.slice';
import { companyReducer } from './slices/company.slice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    company: companyReducer,
    [api.reducerPath]: api.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(api.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
