import { useAppSelector } from '@/store/hooks';

/**
 * Returns a currency formatter function based on the active company's
 * locale and currency settings. Falls back to RD$ (DOP) for backward
 * compatibility with Dominican Republic companies.
 *
 * Usage:
 *   const formatCurrency = useCurrency();
 *   formatCurrency(1234.56) // for DO: "RD$ 1,234.56", for US: "$ 1,234.56"
 */
export function useCurrency() {
  const company = useAppSelector((state) => state.company.active);

  const locale = company?.locale ?? 'es-DO';
  const currency = company?.currency ?? 'DOP';

  return (amount: number, opts?: { minimumFractionDigits?: number; maximumFractionDigits?: number }) => {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: opts?.minimumFractionDigits ?? 2,
      maximumFractionDigits: opts?.maximumFractionDigits ?? 2,
    }).format(amount);
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

