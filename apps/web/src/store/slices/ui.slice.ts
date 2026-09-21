import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type Language = 'es' | 'en';

interface UiState {
  language: Language;
}

const savedLang = typeof window !== 'undefined' ? localStorage.getItem('cmhub_lang') : null;

const initialState: UiState = {
  language: savedLang === 'en' ? 'en' : 'es',
};

export const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setLanguage: (state, action: PayloadAction<Language>) => {
      state.language = action.payload;
      if (typeof window !== 'undefined') {
        localStorage.setItem('cmhub_lang', action.payload);
      }
    },
  },
});

export const { setLanguage } = uiSlice.actions;
export default uiSlice.reducer;
