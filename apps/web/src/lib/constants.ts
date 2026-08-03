export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export const DEFAULT_COUNTRY = 'DO';
export const DEFAULT_CURRENCY = 'DOP';
export const DEFAULT_LOCALE = 'es-DO';

export interface CountryConfig {
  code: string;
  name: string;
  flag: string;
  currency: string;
  currencySymbol: string;
  locale: string;
  taxLabel: string;
  defaultTaxRate: number;
  module: string;
}

export const SUPPORTED_COUNTRIES: Record<string, CountryConfig> = {
  DO: {
    code: 'DO',
    name: 'República Dominicana',
    flag: '🇩🇴',
    currency: 'DOP',
    currencySymbol: 'RD$',
    locale: 'es-DO',
    taxLabel: 'ITBIS',
    defaultTaxRate: 18,
    module: 'DR_FISCAL',
  },
  US: {
    code: 'US',
    name: 'Estados Unidos',
    flag: '🇺🇸',
    currency: 'USD',
    currencySymbol: '$',
    locale: 'en-US',
    taxLabel: 'Sales Tax',
    defaultTaxRate: 0,
    module: 'US_ACCOUNTING',
  },
  MX: {
    code: 'MX',
    name: 'México',
    flag: '🇲🇽',
    currency: 'MXN',
    currencySymbol: 'MX$',
    locale: 'es-MX',
    taxLabel: 'IVA',
    defaultTaxRate: 16,
    module: 'LATAM',
  },
  CO: {
    code: 'CO',
    name: 'Colombia',
    flag: '🇨🇴',
    currency: 'COP',
    currencySymbol: '$',
    locale: 'es-CO',
    taxLabel: 'IVA',
    defaultTaxRate: 19,
    module: 'LATAM',
  },
  PE: {
    code: 'PE',
    name: 'Perú',
    flag: '🇵🇪',
    currency: 'PEN',
    currencySymbol: 'S/',
    locale: 'es-PE',
    taxLabel: 'IGV',
    defaultTaxRate: 18,
    module: 'LATAM',
  },
  CL: {
    code: 'CL',
    name: 'Chile',
    flag: '🇨🇱',
    currency: 'CLP',
    currencySymbol: '$',
    locale: 'es-CL',
    taxLabel: 'IVA',
    defaultTaxRate: 19,
    module: 'LATAM',
  },
  AR: {
    code: 'AR',
    name: 'Argentina',
    flag: '🇦🇷',
    currency: 'ARS',
    currencySymbol: '$',
    locale: 'es-AR',
    taxLabel: 'IVA',
    defaultTaxRate: 21,
    module: 'LATAM',
  },
};
