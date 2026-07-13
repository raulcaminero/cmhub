import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { getCookie, setCookie, eraseCookie } from '@/lib/cookies';
import type { Company } from '@cmhub/shared-types';

interface CompanyState {
  active: Company | null;
  list: Company[];
}

const getActiveCompanyFromCookie = (): Company | null => {
  const cookieVal = getCookie('activeCompany');
  if (!cookieVal) return null;
  try {
    return JSON.parse(decodeURIComponent(cookieVal));
  } catch (e) {
    return null;
  }
};

const initialState: CompanyState = {
  active: getActiveCompanyFromCookie(),
  list: [],
};

const companySlice = createSlice({
  name: 'company',
  initialState,
  reducers: {
    setActiveCompany(state, action: PayloadAction<Company>) {
      state.active = action.payload;
      setCookie('activeCompany', encodeURIComponent(JSON.stringify(action.payload)), 7);
    },
    setCompanies(state, action: PayloadAction<Company[]>) {
      state.list = action.payload;
      if (action.payload.length > 0) {
        const stillExists = state.active && action.payload.some((c) => c.id === state.active!.id);
        if (!stillExists) {
          state.active = action.payload[0];
          setCookie('activeCompany', encodeURIComponent(JSON.stringify(action.payload[0])), 7);
        }
      } else {
        state.active = null;
        eraseCookie('activeCompany');
      }
    },
  },
});

export const { setActiveCompany, setCompanies } = companySlice.actions;
export const companyReducer = companySlice.reducer;
