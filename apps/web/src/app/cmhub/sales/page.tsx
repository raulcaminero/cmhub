'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAppSelector } from '@/store/hooks';
import { useCurrency } from '@/hooks/use-company';
import { useGetInvoicesQuery } from '@/services/invoices.api';
import { useGetProductsQuery } from '@/services/products.api';
import { useGetQuotationsQuery, Quotation } from '@/services/quotations.api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { InvoicesView } from '@/components/features/accounting/invoices-view';
import CatalogView from '@/components/features/sales/catalog-view';
import QuotationsView from '@/components/features/sales/quotations-view';
import { 
  ShoppingCart, 
  Package, 
  FileText, 
  Receipt, 
  Plus, 
  DollarSign, 
  TrendingUp, 
} from 'lucide-react';
import { useTranslation } from '@/lib/use-translation';
import { useTabMemory } from '@/hooks/use-tab-memory';

type SalesTab = 'invoices' | 'catalog' | 'quotations';
const VALID_TABS: SalesTab[] = ['invoices', 'catalog', 'quotations'];

export default function SalesPage() {
  const { t } = useTranslation();
  const companyId = useAppSelector((state) => state.company.active?.id);
  const formatCurrency = useCurrency();
  const [mounted, setMounted] = useState(false);

  const { activeTab, changeTab } = useTabMemory<SalesTab>('invoices', VALID_TABS);
  const [convertingQuotation, setConvertingQuotation] = useState<Quotation | null>(null);

  // Date range for current month invoicing
  const getStartOfCurrentMonth = () => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split('T')[0];
  };
  const startOfMonth = getStartOfCurrentMonth();

  // Queries for KPI metrics
  const { data: invoicesData } = useGetInvoicesQuery(
    { companyId: companyId!, startDate: startOfMonth, limit: 1000 },
    { skip: !companyId || !mounted }
  );
  const invoices = invoicesData?.data || [];

  const { data: quotations } = useGetQuotationsQuery(
    { companyId: companyId! },
    { skip: !companyId || !mounted }
  );

  const { data: products } = useGetProductsQuery(
    { companyId: companyId! },
    { skip: !companyId || !mounted }
  );

  useEffect(() => {
    setMounted(true);
  }, []);



  // Metrics calculations
  const metrics = useMemo(() => {
    // Active invoices this month (excluding voided)
    const activeInvoices = invoices.filter((inv) => !inv.isVoided);
    const monthlySalesAmount = activeInvoices.reduce((sum, inv) => sum + Number(inv.amount), 0);
    const monthlySalesCount = activeInvoices.length;
    const avgTicket = monthlySalesCount > 0 ? monthlySalesAmount / monthlySalesCount : 0;

    // Pending quotations (DRAFT or SENT)
    const pendingQuots = (quotations || []).filter((q) => q.status === 'DRAFT' || q.status === 'SENT');
    const pendingQuotationsTotal = pendingQuots.reduce((sum, q) => sum + Number(q.total), 0);
    const pendingQuotationsCount = pendingQuots.length;

    // Active catalog count
    const activeProductsCount = (products || []).filter((p) => p.isActive).length;

    return {
      monthlySalesAmount,
      monthlySalesCount,
      avgTicket,
      pendingQuotationsTotal,
      pendingQuotationsCount,
      activeProductsCount,
    };
  }, [invoices, quotations, products]);

  if (!companyId) {
    return (
      <Card>
        <CardContent className="pt-3.5">
          <p className="text-muted-foreground text-sm">{t('common.selectCompany')}</p>
        </CardContent>
      </Card>
    );
  }

  const handleConvertQuotation = (quotation: Quotation) => {
    setConvertingQuotation(quotation);
    changeTab('invoices');
  };

  return (
    <div className="space-y-4">

      {/* Page Header */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
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
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-1 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">Ventas del Mes</CardTitle>
            <DollarSign className="w-4 h-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold tracking-tight">{formatCurrency(metrics.monthlySalesAmount)}</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {metrics.monthlySalesCount} {metrics.monthlySalesCount === 1 ? 'factura emitida este mes' : 'facturas emitidas este mes'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-1 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">Cotizaciones Pendientes</CardTitle>
            <FileText className="w-4 h-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold tracking-tight">{formatCurrency(metrics.pendingQuotationsTotal)}</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {metrics.pendingQuotationsCount} {metrics.pendingQuotationsCount === 1 ? 'cotización por aprobar' : 'cotizaciones por aprobar'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-1 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">Catálogo Activo</CardTitle>
            <Package className="w-4 h-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold tracking-tight">{metrics.activeProductsCount}</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Productos y servicios disponibles</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-1 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">Ticket Promedio</CardTitle>
            <TrendingUp className="w-4 h-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold tracking-tight">{formatCurrency(metrics.avgTicket)}</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Promedio por venta emitida</p>
          </CardContent>
        </Card>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-border">
        <button
          onClick={() => changeTab('invoices')}
          className={`px-3.5 py-2 text-xs font-medium border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === 'invoices'
              ? 'border-primary text-primary font-semibold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Receipt className="w-3.5 h-3.5" />
          {t('sales.invoicesTab')}
        </button>
        <button
          onClick={() => changeTab('catalog')}
          className={`px-3.5 py-2 text-xs font-medium border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === 'catalog'
              ? 'border-primary text-primary font-semibold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Package className="w-3.5 h-3.5" />
          {t('sales.catalogTab')}
        </button>
        <button
          onClick={() => changeTab('quotations')}
          className={`px-3.5 py-2 text-xs font-medium border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === 'quotations'
              ? 'border-primary text-primary font-semibold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
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


