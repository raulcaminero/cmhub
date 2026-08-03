'use client';

import { useState } from 'react';
import { useAppSelector } from '@/store/hooks';
import { Card, CardContent } from '@/components/ui/card';
import { InvoicesView } from '@/components/features/accounting/invoices-view';
import CatalogView from '@/components/features/sales/catalog-view';
import QuotationsView from '@/components/features/sales/quotations-view';
import { ShoppingCart, Package, FileText, Receipt } from 'lucide-react';
import { Quotation } from '@/services/quotations.api';
import { useTranslation } from '@/lib/use-translation';

export default function SalesPage() {
  const { t } = useTranslation();
  const companyId = useAppSelector((state) => state.company.active?.id);
  const [activeTab, setActiveTab] = useState<'invoices' | 'catalog' | 'quotations'>('invoices');
  const [convertingQuotation, setConvertingQuotation] = useState<Quotation | null>(null);

  if (!companyId) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground text-sm">{t('common.selectCompany')}</p>
        </CardContent>
      </Card>
    );
  }

  const handleConvertQuotation = (quotation: Quotation) => {
    setConvertingQuotation(quotation);
    setActiveTab('invoices');
  };

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-primary shrink-0" />
            {t('sales.title')}
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t('sales.subtitle')}
          </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setActiveTab('invoices')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'invoices'
              ? 'border-primary text-primary font-bold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Receipt className="w-4 h-4" />
          {t('sales.invoicesTab')}
        </button>
        <button
          onClick={() => setActiveTab('catalog')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'catalog'
              ? 'border-primary text-primary font-bold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Package className="w-4 h-4" />
          {t('sales.catalogTab')}
        </button>
        <button
          onClick={() => setActiveTab('quotations')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'quotations'
              ? 'border-primary text-primary font-bold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <FileText className="w-4 h-4" />
          {t('sales.quotationsTab')}
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === 'invoices' && (
        <InvoicesView 
          quotationToConvert={convertingQuotation} 
          onCloseExternalModal={() => setConvertingQuotation(null)} 
        />
      )}
      {activeTab === 'catalog' && <CatalogView companyId={companyId} />}
      {activeTab === 'quotations' && (
        <QuotationsView 
          companyId={companyId} 
          onConvertQuotationToInvoice={handleConvertQuotation} 
        />
      )}
    </div>
  );
}
