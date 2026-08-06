'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { JournalEntriesView } from '@/components/features/accounting/journal-entries-view';
import { InvoicesView } from '@/components/features/accounting/invoices-view';
import { ExpensesView } from '@/components/features/accounting/expenses-view';
import { PayrollView } from '@/components/features/accounting/payroll-view';
import { ReconciliationView } from '@/components/features/accounting/reconciliation-view';
import { FileText, Receipt, Users, Landmark, BookOpen, CreditCard } from 'lucide-react';
import { useAppSelector } from '@/store/hooks';
import { useCurrency } from '@/hooks/use-company';
import { useGetFinancialsQuery } from '@/services/reports.api';
import { useGetInvoicesQuery } from '@/services/invoices.api';
import { useTranslation } from '@/lib/use-translation';

import { useTabMemory } from '@/hooks/use-tab-memory';

type AccountingTab = 'entries' | 'invoices' | 'expenses' | 'payroll' | 'reconciliation';
const VALID_TABS: AccountingTab[] = ['entries', 'invoices', 'expenses', 'payroll', 'reconciliation'];

export default function AccountingPage() {
  const { t } = useTranslation();
  const { activeTab, changeTab } = useTabMemory<AccountingTab>('entries', VALID_TABS);
  const companyId = useAppSelector((state) => state.company.active?.id);
  const [mounted, setMounted] = useState(false);
  const formatCurrency = useCurrency();

  const { data: financials } = useGetFinancialsQuery(
    { companyId: companyId! },
    { skip: !companyId || !mounted },
  );

  const getStartOfCurrentMonth = () => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split('T')[0];
  };

  const { data: monthlyInvoices } = useGetInvoicesQuery(
    { companyId: companyId!, startDate: getStartOfCurrentMonth() },
    { skip: !companyId || !mounted },
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  if (!companyId) {
    return (
      <Card>
        <CardContent className="pt-3.5">
          <p className="text-muted-foreground text-sm">{t('common.selectCompany')}</p>
        </CardContent>
      </Card>
    );
  }

  let totalActivos = 0;
  let totalPasivos = 0;
  let totalPatrimonio = 0;

  if (financials?.balanceSheet) {
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

  const totalIngresos = (monthlyInvoices?.data || [])
    .filter((inv) => !inv.isVoided)
    .reduce((sum, inv) => sum + Number(inv.amount), 0);

  const kpis = [
    { title: t('accounting.totalAssets'), value: formatCurrency(totalActivos), description: t('accounting.totalAssetsDesc') },
    { title: t('accounting.totalLiabilities'), value: formatCurrency(totalPasivos), description: t('accounting.totalLiabilitiesDesc') },
    { title: t('accounting.equity'), value: formatCurrency(totalPatrimonio), description: t('accounting.equityDesc') },
    { title: t('accounting.monthlyIncome'), value: formatCurrency(totalIngresos), description: t('accounting.monthlyIncomeDesc') },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary shrink-0" />
            {t('accounting.title')}
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">{t('accounting.subtitle')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-1 space-y-0">
              <CardTitle className="text-xs font-medium text-muted-foreground">{card.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold tracking-tight">{card.value}</div>
              <p className="text-[11px] text-muted-foreground mt-0.5">{card.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex border-b border-border overflow-x-auto">
        <button
          onClick={() => changeTab('entries')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'entries'
              ? 'border-primary text-primary font-bold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <FileText className="w-4 h-4" />
          {t('accounting.journalEntriesTab')}
        </button>
        <button
          onClick={() => changeTab('invoices')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'invoices'
              ? 'border-primary text-primary font-bold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Receipt className="w-4 h-4" />
          {t('accounting.invoicesTab')}
        </button>
        <button
          onClick={() => changeTab('expenses')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'expenses'
              ? 'border-primary text-primary font-bold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          Gastos y Compras (606)
        </button>
        <button
          onClick={() => changeTab('payroll')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'payroll'
              ? 'border-primary text-primary font-bold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Users className="w-4 h-4" />
          {t('accounting.payrollTab')}
        </button>
        <button
          onClick={() => changeTab('reconciliation')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'reconciliation'
              ? 'border-primary text-primary font-bold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Landmark className="w-4 h-4" />
          {t('accounting.reconciliationTab')}
        </button>
      </div>

      {activeTab === 'entries' ? (
        <JournalEntriesView />
      ) : activeTab === 'invoices' ? (
        <InvoicesView />
      ) : activeTab === 'expenses' ? (
        <ExpensesView />
      ) : activeTab === 'payroll' ? (
        <PayrollView />
      ) : (
        <ReconciliationView />
      )}
    </div>
  );
}
