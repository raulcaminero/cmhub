'use client';

import { store } from '@/store';
import { Provider } from 'react-redux';
import { ThemeProvider } from '@/components/providers/theme-provider';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <Provider store={store}>
      <ThemeProvider>{children}</ThemeProvider>
    </Provider>
  );
}
