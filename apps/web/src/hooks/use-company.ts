import { useAppSelector } from '@/store/hooks';
import { DEFAULT_CURRENCY, DEFAULT_LOCALE, SUPPORTED_COUNTRIES } from '@/lib/constants';

/**
 * Returns a currency formatter function based on the active company's
 * locale and currency settings.
 *
 * Usage:
 *   const formatCurrency = useCurrency();
 *   formatCurrency(1234.56) // for DO: "RD$ 1,234.56", for US: "$ 1,234.56"
 */
export function useCurrency() {
  const company = useAppSelector((state) => state.company.active);

  const locale = company?.locale ?? DEFAULT_LOCALE;
  const currency = company?.currency ?? DEFAULT_CURRENCY;

  return (amount: number, opts?: { minimumFractionDigits?: number; maximumFractionDigits?: number }) => {
    const val = Number.isFinite(amount) ? amount : 0;
    const maxDigits = opts?.maximumFractionDigits ?? 2;
    const reqMinDigits = opts?.minimumFractionDigits ?? 2;
    const minDigits = Math.min(reqMinDigits, maxDigits);

    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: minDigits,
      maximumFractionDigits: maxDigits,
    }).format(val);
  };
}

/**
 * Returns the active company from the Redux store.
 */
export function useActiveCompany() {
  return useAppSelector((state) => state.company.active);
}

/**
 * Hook to inspect activated system modules for the active company.
 * Supports DR Fiscal (NCF, DGII, 606/607), US Accounting, LatAm, and International.
 */
export function useModules() {
  const company = useAppSelector((state) => state.company.active);
  const enabledModules = company?.enabledModules && company.enabledModules.length > 0 
    ? company.enabledModules 
    : ['DR_FISCAL'];

  const isInternational = enabledModules.includes('INTERNATIONAL');
  const isDrFiscalEnabled = enabledModules.includes('DR_FISCAL') || isInternational;
  const isUsAccountingEnabled = enabledModules.includes('US_ACCOUNTING') || isInternational;
  const isLatamEnabled = enabledModules.includes('LATAM') || isInternational;

  return {
    enabledModules,
    isDrFiscalEnabled,
    isUsAccountingEnabled,
    isLatamEnabled,
    isInternational,

    // UI Shorthands
    showNcfModule: isDrFiscalEnabled,
    showTaxModule: isDrFiscalEnabled,
    showDgiiReports: isDrFiscalEnabled,
  };
}

/**
 * Returns true if the active company has Dominican Republic fiscal functionality enabled.
 */
export function useIsDominicanCompany() {
  const { isDrFiscalEnabled } = useModules();
  return isDrFiscalEnabled;
}

/**
 * Returns tax label for the current company (e.g. ITBIS for DO, Sales Tax for US, IVA for MX/CO)
 */
export function useCompanyTaxLabel() {
  const company = useAppSelector((state) => state.company.active);
  const countryConfig = company?.country ? SUPPORTED_COUNTRIES[company.country] : null;
  return countryConfig?.taxLabel ?? 'ITBIS';
}
