import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { cookies } from 'next/headers';
import { Providers } from '@/components/providers';
import type { PreloadedAppState } from '@/store';
import type { Company } from '@cmhub/shared-types';
import './globals.css';

/**
 * Builds the initial Redux state from the request cookies so the server-rendered
 * HTML and the client's first render are identical (no hydration mismatch).
 */
async function getPreloadedState(): Promise<PreloadedAppState> {
  const jar = await cookies();
  const accessToken = jar.get('accessToken')?.value ?? null;
  const refreshToken = jar.get('refreshToken')?.value ?? null;

  let activeCompany: Company | null = null;
  const rawCompany = jar.get('activeCompany')?.value;
  if (rawCompany) {
    try {
      activeCompany = JSON.parse(decodeURIComponent(rawCompany));
    } catch {
      activeCompany = null;
    }
  }

  return {
    auth: { accessToken, refreshToken, isAuthenticated: !!accessToken },
    company: { active: activeCompany, list: [] },
  };
}

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'CMHub — Gestión Empresarial RD',
  description: 'Sistema de gestión contable para empresas dominicanas',
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    shortcut: '/icon.svg',
    apple: '/icon.svg',
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const preloadedState = await getPreloadedState();

  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/icon.svg" type="image/svg+xml" sizes="any" />
        <link rel="shortcut icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/icon.svg" />
      </head>
      <body className={inter.className}>
        <Providers preloadedState={preloadedState}>{children}</Providers>
      </body>
    </html>
  );
}
