'use client';

import { useEffect, useRef } from 'react';
import { Provider } from 'react-redux';
import { makeStore, type AppStore, type PreloadedAppState } from '@/store';
import { setLanguage, LANG_COOKIE } from '@/store/slices/ui.slice';
import { getCookie } from '@/lib/cookies';
import { ThemeProvider } from '@/components/providers/theme-provider';

export function Providers({
  children,
  preloadedState,
}: {
  children: React.ReactNode;
  preloadedState?: PreloadedAppState;
}) {
  // Create the store once per component lifetime (per request on the server,
  // once per page load in the browser) with the server-provided initial state.
  const storeRef = useRef<AppStore | null>(null);
  if (!storeRef.current) {
    storeRef.current = makeStore(preloadedState);
  }

  // One-time migration: users who chose a language before it was stored as a
  // cookie still have it in localStorage. Runs after hydration, so it never
  // affects the server/client markup comparison.
  useEffect(() => {
    try {
      if (getCookie(LANG_COOKIE)) return;
      const legacy = localStorage.getItem('cmhub_lang');
      if (legacy === 'en' || legacy === 'es') {
        storeRef.current?.dispatch(setLanguage(legacy));
        localStorage.removeItem('cmhub_lang');
      }
    } catch {
      /* storage unavailable */
    }
  }, []);

  return (
    <Provider store={storeRef.current}>
      <ThemeProvider>{children}</ThemeProvider>
    </Provider>
  );
}
