'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { JournalEntriesView } from '@/components/features/accounting/journal-entries-view';
import { InvoicesView } from '@/components/features/accounting/invoices-view';
import { PayrollView } from '@/components/features/accounting/payroll-view';
import { ReconciliationView } from '@/components/features/accounting/reconciliation-view';
import { Button } from '@/components/ui/button';
import { FileText, Receipt, Users, Landmark } from 'lucide-react';
import { useAppSelector } from '@/store/hooks';
import { useCurrency } from '@/hooks/use-company';
import { useGetAccountsQuery } from '@/services/accounting.api';
import { useGetFinancialsQuery } from '@/services/reports.api';
import { useGetInvoicesQuery } from '@/services/invoices.api';
import { useTranslation } from '@/lib/use-translation';

export default function AccountingPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'entries' | 'invoices' | 'payroll' | 'reconciliation'>('entries');
  const companyId = useAppSelector((state) => state.company.active?.id);
  const [mounted, setMounted] = useState(false);
  const formatCurrency = useCurrency();

  const { data: accounts } = useGetAccountsQuery(
    { companyId: companyId! },
    { skip: !companyId || !mounted },
  );

  const { data: financials } = useGetFinancialsQuery(
    { companyId: companyId! },
    { skip: !companyId || !mounted },
  );

  const getStartOfCurrentMonth = () => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split('T')[0];
  };
  const startMonth = getStartOfCurrentMonth();

  const { data: invoicesData } = useGetInvoicesQuery(
    { companyId: companyId!, startDate: startMonth, limit: 1000 },
    { skip: !companyId || !mounted },
  );
  const invoices = invoicesData?.data || [];

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  if (!companyId) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground text-sm">{t('common.selectCompany')}</p>
        </CardContent>
      </Card>
    );
  }

  let totalActivos = 0;
  let totalPasivos = 0;
  let totalPatrimonio = 0;
  let totalIngresos = 0;

  if (financials) {
    financials.balanceSheet.forEach((acc) => {
      if (acc.type === 'ASSET') {
        totalActivos += acc.balance;
      } else if (acc.type === 'LIABILITY') {
        totalPasivos += acc.balance;
      } else if (acc.type === 'EQUITY') {
        totalPatrimonio += acc.balance;
      }
    });
  }

  if (invoices) {
    const now = new Date();
    invoices.forEach((inv) => {
      if (!inv.isVoided) {
        const invDate = new Date(inv.date);
        if (invDate.getMonth() === now.getMonth() && invDate.getFullYear() === now.getFullYear()) {
          totalIngresos += Number(inv.amount);
        }
      }
    });
  }

  const kpis = [
    { title: t('accounting.totalAssets'), value: formatCurrency(totalActivos), description: t('accounting.totalAssetDesc') },
    { title: t('accounting.totalLiabilities'), value: formatCurrency(totalPasivos), description: t('accounting.totalLiabilityDesc') },
    { title: t('accounting.equity'), value: formatCurrency(totalPatrimonio), description: t('accounting.equityDesc') },
    { title: t('accounting.monthlyIncome'), value: formatCurrency(totalIngresos), description: t('accounting.monthlyIncomeDesc') },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('accounting.title')}</h1>
        <p className="text-muted-foreground">{t('accounting.subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
              <p className="text-xs text-muted-foreground">{card.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex items-center justify-between border-b pb-4 gap-4 flex-wrap">
        <div className="flex gap-2">
          <Button
            variant={activeTab === 'entries' ? 'default' : 'outline'}
            onClick={() => setActiveTab('entries')}
            className="gap-2"
          >
            <FileText className="w-4 h-4" />
            {t('accounting.journalEntriesTab')}
          </Button>
          <Button
            variant={activeTab === 'invoices' ? 'default' : 'outline'}
            onClick={() => setActiveTab('invoices')}
            className="gap-2"
          >
            <Receipt className="w-4 h-4" />
            {t('accounting.invoicesTab')}
          </Button>
          <Button
            variant={activeTab === 'payroll' ? 'default' : 'outline'}
            onClick={() => setActiveTab('payroll')}
            className="gap-2"
          >
            <Users className="w-4 h-4" />
            {t('accounting.payrollTab')}
          </Button>
          <Button
            variant={activeTab === 'reconciliation' ? 'default' : 'outline'}
            onClick={() => setActiveTab('reconciliation')}
            className="gap-2"
          >
            <Landmark className="w-4 h-4" />
            {t('accounting.reconciliationTab')}
          </Button>
        </div>
        <div className="flex gap-2">
          <Link href="/cmhub/accounting/expenses" className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent transition-colors">
            {t('accounting.registerExpense')}
          </Link>
        </div>
      </div>

      {activeTab === 'entries' ? (
        <JournalEntriesView />
      ) : activeTab === 'invoices' ? (
        <InvoicesView />
      ) : activeTab === 'payroll' ? (
        <PayrollView />
      ) : (
        <ReconciliationView />
      )}
    </div>
  );
}
