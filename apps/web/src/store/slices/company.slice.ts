import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { Company } from '@cmhub/shared-types';

export interface CompanyState {
  active: Company | null;
  list: Company[];
}

// NOTE: no cookie reads here. Initial company state is provided by the server
// (see app/layout.tsx -> Providers -> makeStore) so SSR and client render identically.
const initialState: CompanyState = {
  active: null,
  list: [],
};

const companySlice = createSlice({
  name: 'company',
  initialState,
  reducers: {
    setActiveCompany(state, action: PayloadAction<Company>) {
      state.active = action.payload;
    },
    setCompanies(state, action: PayloadAction<Company[]>) {
      state.list = action.payload;
      if (action.payload.length > 0) {
        const validActive = state.active && action.payload.find((c) => c.id === state.active!.id);
        state.active = validActive || action.payload[0];
      } else {
        state.active = null;
      }
    },
  },
});

export const { setActiveCompany, setCompanies } = companySlice.actions;
export const companyReducer = companySlice.reducer;
