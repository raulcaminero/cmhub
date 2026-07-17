import { Middleware } from '@reduxjs/toolkit';
import { setCookie, eraseCookie } from '@/lib/cookies';
import { setCredentials, logout } from '../slices/auth.slice';
import { setActiveCompany, setCompanies } from '../slices/company.slice';

export const cookieMiddleware: Middleware = (store) => (next) => (action: any) => {
  const result = next(action);

  if (setCredentials.match(action)) {
    setCookie('accessToken', action.payload.accessToken, 1);
    setCookie('refreshToken', action.payload.refreshToken, 7); // 7 days expiration for refresh token
  } else if (logout.match(action)) {
    eraseCookie('accessToken');
    eraseCookie('refreshToken');
    eraseCookie('activeCompany');
  } else if (setActiveCompany.match(action)) {
    setCookie('activeCompany', encodeURIComponent(JSON.stringify(action.payload)), 7);
  } else if (setCompanies.match(action)) {
    const state = store.getState() as any;
    if (state.company.active) {
      setCookie('activeCompany', encodeURIComponent(JSON.stringify(state.company.active)), 7);
    } else {
      eraseCookie('activeCompany');
    }
  }

  return result;
};
