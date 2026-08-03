export interface TaxRateSeed {
  name: string;
  code: string;
  rate: number;
  taxType: string;
  agency: string;
  appliesTo: string;
  isDefault?: boolean;
}

export const TAX_RATE_SEEDS: Record<string, TaxRateSeed[]> = {
  DO: [
    {
      name: 'ITBIS 18%',
      code: 'ITBIS_18',
      rate: 0.18,
      taxType: 'VAT',
      agency: 'DGII',
      appliesTo: 'BOTH',
      isDefault: true,
    },
    {
      name: 'Retención ITBIS 30%',
      code: 'RET_ITBIS_30',
      rate: 0.30,
      taxType: 'RETENTION_ITBIS',
      agency: 'DGII',
      appliesTo: 'PURCHASE',
    },
    {
      name: 'Retención ITBIS 100%',
      code: 'RET_ITBIS_100',
      rate: 1.00,
      taxType: 'RETENTION_ITBIS',
      agency: 'DGII',
      appliesTo: 'PURCHASE',
    },
    {
      name: 'Retención ISR 10%',
      code: 'RET_ISR_10',
      rate: 0.10,
      taxType: 'RETENTION_ISR',
      agency: 'DGII',
      appliesTo: 'PURCHASE',
    },
    {
      name: 'Retención ISR 2%',
      code: 'RET_ISR_2',
      rate: 0.02,
      taxType: 'RETENTION_ISR',
      agency: 'DGII',
      appliesTo: 'PURCHASE',
    },
  ],
  US: [
    {
      name: 'Sales Tax 0% (Exempt)',
      code: 'SALES_TAX_0',
      rate: 0.00,
      taxType: 'SALES_TAX',
      agency: 'STATE',
      appliesTo: 'SALE',
      isDefault: true,
    },
  ],
  MX: [
    {
      name: 'IVA 16%',
      code: 'IVA_16',
      rate: 0.16,
      taxType: 'VAT',
      agency: 'SAT',
      appliesTo: 'BOTH',
      isDefault: true,
    },
    {
      name: 'IVA Tasa 0%',
      code: 'IVA_0',
      rate: 0.00,
      taxType: 'VAT',
      agency: 'SAT',
      appliesTo: 'BOTH',
    },
  ],
  CO: [
    {
      name: 'IVA 19%',
      code: 'IVA_19',
      rate: 0.19,
      taxType: 'VAT',
      agency: 'DIAN',
      appliesTo: 'BOTH',
      isDefault: true,
    },
  ],
};
