import { combineReducers, configureStore } from '@reduxjs/toolkit';
import { api } from '@/services/api';
import { authReducer, type AuthState } from './slices/auth.slice';
import { companyReducer, type CompanyState } from './slices/company.slice';
import uiReducer, { type UiState } from './slices/ui.slice';
import { cookieMiddleware } from './middleware/cookie.middleware';

const rootReducer = combineReducers({
  auth: authReducer,
  company: companyReducer,
  ui: uiReducer,
  [api.reducerPath]: api.reducer,
});

export type RootState = ReturnType<typeof rootReducer>;

export interface PreloadedAppState {
  auth?: AuthState;
  company?: CompanyState;
  ui?: UiState;
}

/**
 * Creates a fresh store. Called once per request on the server and once per
 * browser session on the client, always with the same cookie-derived
 * `preloadedState`, so the SSR HTML and the first client render match.
 */
export function makeStore(preloadedState?: PreloadedAppState) {
  return configureStore({
    reducer: rootReducer,
    preloadedState: preloadedState as Partial<RootState> | undefined,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(api.middleware, cookieMiddleware),
  });
}

export type AppStore = ReturnType<typeof makeStore>;
export type AppDispatch = AppStore['dispatch'];
