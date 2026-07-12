import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface Company {
  id: string;
  name: string;
  rnc: string;
}

interface CompanyState {
  active: Company | null;
  list: Company[];
}

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
      if (!state.active && action.payload.length > 0) {
        state.active = action.payload[0];
      }
    },
  },
});

export const { setActiveCompany, setCompanies } = companySlice.actions;
export const companyReducer = companySlice.reducer;
