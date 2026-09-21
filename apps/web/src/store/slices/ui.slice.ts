import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { setCookie } from '@/lib/cookies';

export type Language = 'es' | 'en';

export interface UiState {
  language: Language;
}

export const LANG_COOKIE = 'cmhub_lang';

// NOTE: no localStorage/cookie reads here. The saved language is read from the
// cookie on the server (app/layout.tsx -> Providers -> makeStore) so SSR and the
// first client render are identical. Reading browser storage at import time
// causes a React #418 hydration mismatch that breaks client-side routing.
const initialState: UiState = {
  language: 'es',
};

export const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setLanguage: (state, action: PayloadAction<Language>) => {
      state.language = action.payload;
      // Cookie is what the server reads on the next page load.
      setCookie(LANG_COOKIE, action.payload, 365);
    },
  },
});

export const { setLanguage } = uiSlice.actions;
export default uiSlice.reducer;
