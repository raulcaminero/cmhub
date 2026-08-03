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
 * Returns true if the active company is from Dominican Republic.
 * Used to conditionally show DR-specific modules (NCF, DGII, IT-1, 606/607).
 */
export function useIsDominicanCompany() {
  const company = useAppSelector((state) => state.company.active);
  // Default to DR behavior if company has no country set (backward compat)
  return !company || !company.country || company.country === 'DO';
}
