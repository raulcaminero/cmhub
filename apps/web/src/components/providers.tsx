'use client';

import { useRef } from 'react';
import { Provider } from 'react-redux';
import { makeStore, type AppStore, type PreloadedAppState } from '@/store';
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

  return (
    <Provider store={storeRef.current}>
      <ThemeProvider>{children}</ThemeProvider>
    </Provider>
  );
}
