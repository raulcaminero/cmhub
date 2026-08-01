import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type Language = 'es' | 'en';

interface UiState {
  language: Language;
}

const getInitialLanguage = (): Language => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('cmhub_lang');
    if (saved === 'es' || saved === 'en') return saved;
  }
  return 'es';
};

const initialState: UiState = {
  language: getInitialLanguage(),
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
