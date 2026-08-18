'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAppSelector } from '@/store/hooks';
import { useCurrency } from '@/hooks/use-company';
import { useGetInvoicesQuery } from '@/services/invoices.api';
import { useGetExpensesQuery } from '@/services/expenses.api';
import { useTranslation } from '@/lib/use-translation';
import { 
  Building2, 
  ArrowUpRight, 
  ArrowDownRight, 
  TrendingUp, 
  Receipt,
  FileText,
  Calendar,
  DollarSign,
  TrendingDown,
  LayoutDashboard
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default function DashboardPage() {
  const { t } = useTranslation();
  const activeCompany = useAppSelector((state) => state.company.active);
  const companyId = activeCompany?.id;
  const [mounted, setMounted] = useState(false);
  const formatCurrency = useCurrency();

  const getDashboardStartDate = () => {
    const d = new Date();
    d.setMonth(d.getMonth() - 6);
    d.setDate(1);
    return d.toISOString().split('T')[0];
  };
  const dashStartDate = getDashboardStartDate();

  const { data: invoicesData, isLoading: loadingInvoices } = useGetInvoicesQuery(
    { companyId: companyId!, startDate: dashStartDate, limit: 1000 },
    { skip: !companyId }
  );
  const invoices = invoicesData?.data || [];

  const { data: expensesData, isLoading: loadingExpenses } = useGetExpensesQuery(
    { companyId: companyId!, startDate: dashStartDate, limit: 1000 },
    { skip: !companyId }
  );
  const expenses = expensesData?.data || [];

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  if (!companyId) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('dashboard.title')}</h1>
          <p className="text-muted-foreground">{t('nav.companyManagement')}</p>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-12 text-center">
            <Building2 className="w-12 h-12 text-muted-foreground/60 mb-4" />
            <CardTitle className="text-xl font-bold mb-2">{t('common.noCompanySelected')}</CardTitle>
            <CardDescription className="max-w-md">
              {t('common.noCompanyDesc')}
            </CardDescription>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loadingInvoices || loadingExpenses) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-2">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm text-muted-foreground">{t('dashboard.loadingDashboard')}</p>
      </div>
    );
  }

  // Calculate totals (excluding voided invoices and expenses)
  const activeInvoices = invoices?.filter(inv => !inv.isVoided) || [];
  const activeExpenses = expenses?.filter(exp => !exp.isVoided) || [];

  const totalInvoicesSum = activeInvoices.reduce((sum, inv) => sum + Number(inv.amount), 0);
  const totalInvoicesItbis = activeInvoices.reduce((sum, inv) => sum + Number(inv.itbis), 0);
  const totalExpensesSum = activeExpenses.reduce((sum, exp) => sum + Number(exp.amount), 0);
  const totalExpensesItbis = activeExpenses.reduce((sum, exp) => sum + Number(exp.itbis), 0);

  const netCashFlow = totalInvoicesSum - totalExpensesSum;
  const itbisBalance = totalInvoicesItbis - totalExpensesItbis;

  // Process data for the 6-month chart
  const last6Months = Array.from({ length: 6 }).map((_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    return {
      monthKey: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: d.toLocaleString('es-ES', { month: 'short' }),
      income: 0,
      expense: 0,
    };
  }).reverse();

  activeInvoices.forEach((inv) => {
    const dateStr = inv.date.substring(0, 7); // "YYYY-MM"
    const month = last6Months.find(m => m.monthKey === dateStr);
    if (month) {
      month.income += Number(inv.amount);
    }
  });

  activeExpenses.forEach((exp) => {
    const dateStr = exp.date.substring(0, 7); // "YYYY-MM"
    const month = last6Months.find(m => m.monthKey === dateStr);
    if (month) {
      month.expense += Number(exp.amount);
    }
  });

  const maxVal = Math.max(...last6Months.map(m => Math.max(m.income, m.expense)), 1000);

  // Combine recent invoices and expenses for the recent activity list
  const recentActivities = [
    ...(invoices?.map(inv => ({
      id: inv.id,
      date: inv.date,
      description: `${t('dashboard.invoiceFor')} ${inv.clientName} (${inv.ncf})`,
      amount: Number(inv.amount),
      type: 'INCOME' as const,
      paymentMethod: inv.paymentMethod,
    })) || []),
    ...(expenses?.map(exp => ({
      id: exp.id,
      date: exp.date,
      description: `${t('dashboard.expenseFrom')} ${exp.providerName} (${exp.ncf})`,
      amount: Number(exp.amount),
      type: 'EXPENSE' as const,
      paymentMethod: exp.paymentMethod,
    })) || []),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
   .slice(0, 5);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <LayoutDashboard className="w-5 h-5 text-primary shrink-0" />
            {t('nav.dashboard')}
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {activeCompany ? `${t('dashboard.subtitle')} ${activeCompany.name}` : 'Resumen financiero y operativo.'}
          </p>
        </div>
        
        {activeCompany && (
          <div className="flex items-center gap-3 px-4 py-2 border rounded-lg bg-card text-card-foreground">
            <Building2 className="w-5 h-5 text-primary" />
            <div>
              <p className="text-sm font-semibold leading-none">{activeCompany.name}</p>
              {activeCompany.rnc && (
                <p className="text-xs text-muted-foreground">
                  {activeCompany.country === 'US' ? 'EIN' : activeCompany.country === 'MX' ? 'RFC' : 'RNC'}: {activeCompany.rnc}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-1 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">{t('dashboard.invoicing')}</CardTitle>
            <ArrowUpRight className="w-4 h-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold tracking-tight text-card-foreground">{formatCurrency(totalInvoicesSum)}</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">{t('dashboard.invoicingDesc')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-1 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">{t('dashboard.expenses')}</CardTitle>
            <ArrowDownRight className="w-4 h-4 text-rose-500" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold tracking-tight text-card-foreground">{formatCurrency(totalExpensesSum)}</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">{t('dashboard.expensesDesc')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-1 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">{t('dashboard.netFlow')}</CardTitle>
            {netCashFlow >= 0 ? (
              <TrendingUp className="w-4 h-4 text-emerald-500" />
            ) : (
              <TrendingDown className="w-4 h-4 text-rose-500" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold tracking-tight text-card-foreground">
              {formatCurrency(netCashFlow)}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">{t('dashboard.netFlowDesc')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-1 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">{t('dashboard.itbisNet')}</CardTitle>
            <Receipt className="w-4 h-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold tracking-tight text-card-foreground">
              {formatCurrency(itbisBalance)}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {itbisBalance >= 0 ? t('dashboard.itbisToPay') : t('dashboard.itbisInFavor')}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Monthly Trend Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{t('dashboard.chartTitle')}</CardTitle>
            <CardDescription>{t('dashboard.chartDesc')}</CardDescription>
          </CardHeader>
          <CardContent className="pt-4 overflow-x-auto pb-4">
            <div className="relative min-w-[480px] md:min-w-0 w-full h-[240px] flex items-end justify-between border-b pb-6 px-4">
              {/* Grid Lines */}
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-6">
                <div className="border-t border-muted/50 w-full"></div>
                <div className="border-t border-muted/50 w-full"></div>
                <div className="border-t border-muted/50 w-full"></div>
                <div className="border-t border-muted/50 w-full"></div>
              </div>

              {/* Bars */}
              <div className="flex-1 flex justify-around items-end h-[180px] z-10 w-full">
                {last6Months.map((m) => {
                  const incHeight = (m.income / maxVal) * 160;
                  const expHeight = (m.expense / maxVal) * 160;

                  return (
                    <div key={m.monthKey} className="flex flex-col items-center gap-2 w-16">
                      <div className="flex items-end gap-1.5 h-[160px]">
                        {/* Income Bar */}
                        <div 
                          style={{ height: `${Math.max(incHeight, 4)}px` }} 
                          className="w-4 bg-primary/80 rounded-t-sm transition-all duration-500 hover:brightness-95 relative group"
                        >
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block bg-slate-800 text-white text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap z-50">
                            {formatCurrency(m.income, { maximumFractionDigits: 0 })}
                          </div>
                        </div>
                        {/* Expense Bar */}
                        <div 
                          style={{ height: `${Math.max(expHeight, 4)}px` }} 
                          className="w-4 bg-slate-400 rounded-t-sm transition-all duration-500 hover:brightness-95 relative group"
                        >
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block bg-slate-800 text-white text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap z-50">
                            {formatCurrency(m.expense, { maximumFractionDigits: 0 })}
                          </div>
                        </div>
                      </div>
                      <span className="text-[11px] font-medium text-muted-foreground uppercase">{m.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-6 mt-4 justify-center text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-primary/80 rounded-sm"></div>
                <span className="text-muted-foreground">{t('dashboard.legendIncome')}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-slate-400 rounded-sm"></div>
                <span className="text-muted-foreground">{t('dashboard.legendExpense')}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Links / Guide */}
        <Card>
          <CardHeader>
            <CardTitle>{t('dashboard.quickLinks')}</CardTitle>
            <CardDescription>{t('dashboard.quickLinksDesc')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href={'/cmhub/accounting' as any} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded bg-blue-500/10 text-blue-600">
                  <DollarSign className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold">{t('dashboard.recordEntry')}</p>
                  <p className="text-xs text-muted-foreground">{t('dashboard.dailyTransactions')}</p>
                </div>
              </div>
              <ArrowUpRight className="w-4 h-4 text-muted-foreground" />
            </Link>

            <Link href={'/cmhub/ncf' as any} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded bg-purple-500/10 text-purple-600">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold">{t('dashboard.ncfSequences')}</p>
                  <p className="text-xs text-muted-foreground">{t('dashboard.authorizedVouchers')}</p>
                </div>
              </div>
              <ArrowUpRight className="w-4 h-4 text-muted-foreground" />
            </Link>

            <Link href={'/cmhub/tax' as any} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded bg-amber-500/10 text-amber-600">
                  <Receipt className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold">{t('dashboard.taxIt1')}</p>
                  <p className="text-xs text-muted-foreground">{t('dashboard.periodLiquidation')}</p>
                </div>
              </div>
              <ArrowUpRight className="w-4 h-4 text-muted-foreground" />
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity Table */}
      <Card>
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm font-bold">{t('dashboard.recentActivity')}</CardTitle>
          <CardDescription className="text-[11px] text-muted-foreground mt-0.5">{t('dashboard.recentActivityDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          {recentActivities.length === 0 ? (
            <div className="text-center py-6 text-xs text-muted-foreground">
              {t('common.noRecentActivity')}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-[11px] font-bold">{t('common.date')}</TableHead>
                  <TableHead className="text-[11px] font-bold">{t('common.description')}</TableHead>
                  <TableHead className="text-[11px] font-bold">{t('common.type')}</TableHead>
                  <TableHead className="text-[11px] font-bold">{t('common.method')}</TableHead>
                  <TableHead className="text-[11px] font-bold text-right">{t('common.amount')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentActivities.map((act) => (
                  <TableRow key={act.id}>
                    <TableCell className="text-[11px] text-muted-foreground font-mono">
                      {new Date(act.date).toLocaleDateString('es-ES')}
                    </TableCell>
                    <TableCell className="text-[11px] font-medium">{act.description}</TableCell>
                    <TableCell>
                      <Badge variant={act.type === 'INCOME' ? 'default' : 'destructive'} className="text-[11px]">
                        {act.type === 'INCOME' ? t('common.income') : t('common.expense')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-[11px] text-muted-foreground capitalize">
                      {act.paymentMethod.replace('_', ' ')}
                    </TableCell>
                    <TableCell className={`text-right font-mono text-[11px] font-bold ${act.type === 'INCOME' ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {formatCurrency(act.amount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

