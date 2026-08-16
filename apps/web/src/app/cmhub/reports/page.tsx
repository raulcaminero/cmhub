'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAppSelector } from '@/store/hooks';
import { useCurrency } from '@/hooks/use-company';
import { useGetFinancialsQuery, useGetIt1SummaryQuery } from '@/services/reports.api';
import { useTranslation } from '@/lib/use-translation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  FileText, 
  Download, 
  BarChart2, 
  Calendar, 
  BookMarked, 
  BarChart3,
  Percent,
  PieChart,
  Scale,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  Activity,
  DollarSign,
  Printer,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { GeneralLedgerView } from '@/components/features/accounting/general-ledger-view';

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => String(currentYear - i));
const MONTHS = [
  { code: '01', name: 'Enero' },
  { code: '02', name: 'Febrero' },
  { code: '03', name: 'Marzo' },
  { code: '04', name: 'Abril' },
  { code: '05', name: 'Mayo' },
  { code: '06', name: 'Junio' },
  { code: '07', name: 'Julio' },
  { code: '08', name: 'Agosto' },
  { code: '09', name: 'Septiembre' },
  { code: '10', name: 'Octubre' },
  { code: '11', name: 'Noviembre' },
  { code: '12', name: 'Diciembre' },
];

import { useTabMemory } from '@/hooks/use-tab-memory';

type ReportsTab = 'tax' | 'financials' | 'ledger';
const VALID_TABS: ReportsTab[] = ['tax', 'financials', 'ledger'];

function ReportsContent() {
  const { t } = useTranslation();
  const companyId = useAppSelector((state) => state.company.active?.id);
  const token = useAppSelector((state) => state.auth.accessToken);
  const [mounted, setMounted] = useState(false);
  const formatCurrency = useCurrency();
  // TODO: When multi-country engine is ready, gate the Tax tab using useModules().showDgiiReports

  const { activeTab, changeTab } = useTabMemory<ReportsTab>('financials', VALID_TABS);
  const [selectedYear, setSelectedYear] = useState(() => String(new Date().getFullYear()));
  const [selectedMonth, setSelectedMonth] = useState(() => String(new Date().getMonth() + 1).padStart(2, '0'));

  const period = `${selectedYear}${selectedMonth}`;

  const { data: it1, isLoading: isLoadingIt1 } = useGetIt1SummaryQuery(
    { companyId: companyId!, period },
    { skip: !companyId || activeTab !== 'tax' || !mounted },
  );

  const { data: financials, isLoading: isLoadingFinancials } = useGetFinancialsQuery(
    { companyId: companyId! },
    { skip: !companyId || activeTab !== 'financials' || !mounted },
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  // Calculate financial KPIs and charts data
  const financialMetrics = useMemo(() => {
    if (!financials) {
      return {
        totalRevenue: 0,
        totalExpense: 0,
        netIncome: 0,
        netMargin: 0,
        totalAssets: 0,
        totalLiabilities: 0,
        totalEquity: 0,
        currentRatio: 0,
        expenseAccounts: [],
      };
    }

    const revenueAccounts = financials.incomeStatement.filter((a) => a.type === 'REVENUE');
    const expenseAccounts = financials.incomeStatement.filter((a) => a.type === 'EXPENSE');
    const assetAccounts = financials.balanceSheet.filter((a) => a.type === 'ASSET');
    const liabilityAccounts = financials.balanceSheet.filter((a) => a.type === 'LIABILITY');
    const equityAccounts = financials.balanceSheet.filter((a) => a.type === 'EQUITY');

    const totalRevenue = revenueAccounts.reduce((sum, a) => sum + a.balance, 0);
    const totalExpense = expenseAccounts.reduce((sum, a) => sum + a.balance, 0);
    const netIncome = totalRevenue - totalExpense;
    const netMargin = totalRevenue > 0 ? (netIncome / totalRevenue) * 100 : 0;

    const totalAssets = assetAccounts.reduce((sum, a) => sum + a.balance, 0);
    const totalLiabilities = liabilityAccounts.reduce((sum, a) => sum + a.balance, 0);
    const totalEquity = equityAccounts.reduce((sum, a) => sum + a.balance, 0);
    const currentRatio = totalLiabilities > 0 ? totalAssets / totalLiabilities : totalAssets > 0 ? totalAssets : 0;

    const sortedExpenses = [...expenseAccounts].sort((a, b) => b.balance - a.balance);

    return {
      totalRevenue,
      totalExpense,
      netIncome,
      netMargin,
      totalAssets,
      totalLiabilities,
      totalEquity,
      currentRatio,
      expenseAccounts: sortedExpenses,
    };
  }, [financials]);

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

  function handlePeriodChange(e: React.FormEvent) {
    e.preventDefault();
  }

  const handleDownload = async (format: '606' | '607') => {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';
      const response = await fetch(`${baseUrl}/companies/${companyId}/accounting/reports/${format}?period=${period}`, {
        headers: {
          'Authorization': `Bearer ${token || ''}`,
        }
      });
      if (!response.ok) throw new Error(t('common.error'));
      const text = await response.text();
      
      const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `DGII_${format}_${period}.txt`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert(t('common.error'));
    }
  };

  const handleDownloadFinancials = async () => {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';
      const response = await fetch(`${baseUrl}/companies/${companyId}/accounting/reports/financials/export`, {
        headers: {
          'Authorization': `Bearer ${token || ''}`,
        }
      });
      if (!response.ok) throw new Error(t('common.error'));
      const text = await response.text();
      
      const blob = new Blob([text], { type: 'text/csv;charset=utf-8' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Estados_Financieros_${period}.csv`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert(t('common.error'));
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Helper to render Donut Chart for Expense Distribution
  const renderExpenseDonut = () => {
    const { totalExpense, expenseAccounts } = financialMetrics;
    if (totalExpense <= 0 || expenseAccounts.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-48 text-muted-foreground text-xs">
          <PieChart className="w-10 h-10 mb-2 opacity-40" />
          No hay gastos registrados para analizar.
        </div>
      );
    }

    let accumulatedPercent = 0;
    const colors = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#06b6d4', '#f97316'];

    const segments = expenseAccounts.map((acc, index) => {
      const percent = (acc.balance / totalExpense) * 100;
      const startAngle = (accumulatedPercent / 100) * 360;
      accumulatedPercent += percent;

      return {
        ...acc,
        percent,
        color: colors[index % colors.length],
        startAngle,
      };
    });

    return (
      <div className="flex flex-col sm:flex-row items-center gap-6 py-2">
        {/* SVG Donut */}
        <div className="relative w-36 h-36 shrink-0">
          <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
            {segments.map((seg, i) => {
              const strokeDasharray = `${(seg.percent / 100) * 283} 283`;
              const strokeDashoffset = -((seg.startAngle / 360) * 283);
              return (
                <circle
                  key={seg.id || i}
                  cx="50"
                  cy="50"
                  r="45"
                  fill="transparent"
                  stroke={seg.color}
                  strokeWidth="10"
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                  className="transition-all duration-500 hover:opacity-80"
                />
              );
            })}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-[10px] text-muted-foreground font-medium uppercase">Total Gastos</span>
            <span className="text-xs font-bold tracking-tight font-mono">
              {formatCurrency(totalExpense, { maximumFractionDigits: 0 })}
            </span>
          </div>
        </div>

        {/* Legend List */}
        <div className="flex-1 space-y-2 w-full max-h-44 overflow-y-auto pr-1">
          {segments.map((seg) => (
            <div key={seg.id} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 truncate pr-2">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: seg.color }}></span>
                <span className="truncate font-medium">{seg.name}</span>
              </div>
              <div className="text-right shrink-0 font-mono">
                <span className="font-semibold">{formatCurrency(seg.balance, { maximumFractionDigits: 0 })}</span>
                <span className="text-[10px] text-muted-foreground ml-1.5 font-bold">({seg.percent.toFixed(1)}%)</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">

      <div>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary shrink-0" />
              {t('reports.title')}
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">{t('reports.subtitle')}</p>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-border">
        <button
          onClick={() => changeTab('tax')}
          className={`px-3.5 py-2 text-xs font-medium border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === 'tax'
              ? 'border-primary text-primary font-semibold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <BarChart2 className="w-3.5 h-3.5" />
          {t('reports.tabTax')}
        </button>
        <button
          onClick={() => changeTab('financials')}
          className={`px-3.5 py-2 text-xs font-medium border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === 'financials'
              ? 'border-primary text-primary font-semibold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          {t('reports.tabFinancials')}
        </button>
        <button
          onClick={() => changeTab('ledger')}
          className={`px-3.5 py-2 text-xs font-medium border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === 'ledger'
              ? 'border-primary text-primary font-semibold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <BookMarked className="w-3.5 h-3.5" />
          {t('reports.tabLedger')}
        </button>
      </div>

      {activeTab === 'tax' ? (
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary shrink-0" />
                {t('reports.selectPeriod')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePeriodChange} className="flex flex-wrap items-end gap-3 max-w-md">
                <div className="space-y-1">
                  <Label htmlFor="yearSelect" className="text-xs font-semibold text-muted-foreground block">Año</Label>
                  <Select value={selectedYear} onValueChange={(val) => setSelectedYear(val)}>
                    <SelectTrigger id="yearSelect" className="h-9 w-28 text-xs font-medium">
                      <SelectValue placeholder="Año" />
                    </SelectTrigger>
                    <SelectContent>
                      {YEARS.map((y) => (
                        <SelectItem key={y} value={y}>{y}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="monthSelect" className="text-xs font-semibold text-muted-foreground block">Mes</Label>
                  <Select value={selectedMonth} onValueChange={(val) => setSelectedMonth(val)}>
                    <SelectTrigger id="monthSelect" className="h-9 w-36 text-xs font-medium">
                      <SelectValue placeholder="Mes" />
                    </SelectTrigger>
                    <SelectContent>
                      {MONTHS.map((m) => (
                        <SelectItem key={m.code} value={m.code}>{m.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button type="submit" size="sm" className="h-8 text-xs gap-1.5 font-semibold shadow-2xs">
                  {t('reports.update')}
                </Button>
              </form>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary shrink-0" />
                  {t('reports.dgiiFormats')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between p-2.5 rounded-lg border">
                  <div>
                    <p className="font-semibold text-xs">{t('reports.format606')}</p>
                    <p className="text-[11px] text-muted-foreground">{t('reports.format606Desc')}</p>
                  </div>
                  <Button size="sm" onClick={() => handleDownload('606')} className="h-8 text-xs gap-1.5 font-semibold shadow-2xs">
                    <Download className="w-3.5 h-3.5" />
                    {t('reports.download606')}
                  </Button>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-lg border">
                  <div>
                    <p className="font-semibold text-xs">{t('reports.format607')}</p>
                    <p className="text-[11px] text-muted-foreground">{t('reports.format607Desc')}</p>
                  </div>
                  <Button size="sm" onClick={() => handleDownload('607')} className="h-8 text-xs gap-1.5 font-semibold shadow-2xs">
                    <Download className="w-3.5 h-3.5" />
                    {t('reports.download607')}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-primary shrink-0" />
                  {t('reports.it1Summary')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingIt1 ? (
                  <p className="text-xs text-muted-foreground">{t('common.loading')}</p>
                ) : !it1 ? (
                  <p className="text-xs text-muted-foreground">{t('reports.noDataPeriod')}</p>
                ) : (
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs py-1.5 border-b border-border/50">
                      <span className="text-muted-foreground font-medium">{t('reports.billedIncome')}</span>
                      <span className="font-mono font-semibold">{formatCurrency(Number(it1.salesAmount))}</span>
                    </div>
                    <div className="flex justify-between text-xs py-1.5 border-b border-border/50">
                      <span className="text-muted-foreground font-medium">{t('reports.billedItbis')}</span>
                      <span className="font-mono font-semibold text-destructive">{formatCurrency(Number(it1.salesItbis))}</span>
                    </div>
                    <div className="flex justify-between text-xs py-1.5 border-b border-border/50">
                      <span className="text-muted-foreground font-medium">{t('reports.purchasesNet')}</span>
                      <span className="font-mono font-semibold">{formatCurrency(Number(it1.purchasesAmount))}</span>
                    </div>
                    <div className="flex justify-between text-xs py-1.5 border-b border-border/50">
                      <span className="text-muted-foreground font-medium">{t('reports.paidItbis')}</span>
                      <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">{formatCurrency(Number(it1.purchasesItbis))}</span>
                    </div>
                    <div className="flex justify-between font-bold text-xs pt-2">
                      <span>{t('reports.totalItbisPay')}</span>
                      <span className="font-mono text-sm text-primary">{formatCurrency(Number(it1.itbisToPay))}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      ) : activeTab === 'ledger' ? (
        <GeneralLedgerView companyId={companyId} />
      ) : (
        <div className="space-y-6">
          {/* Top Actions */}
          <div className="flex justify-end gap-3 print:hidden">
            <Button size="sm" onClick={handleDownloadFinancials} className="h-8 text-xs gap-1.5 font-semibold shadow-2xs">
              <Download className="w-3.5 h-3.5" />
              Exportar a Excel (.csv)
            </Button>
            <Button size="sm" onClick={handlePrint} className="h-8 text-xs gap-1.5 font-semibold shadow-2xs">
              <Printer className="w-3.5 h-3.5" />
              Imprimir / PDF
            </Button>
          </div>

          {/* Financial Ratios & KPIs */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-1 space-y-0">
                <CardTitle className="text-xs font-medium text-muted-foreground">Margen de Utilidad Neta</CardTitle>
                <Percent className="w-4 h-4 text-emerald-500" />
              </CardHeader>
              <CardContent>
                <div className={`text-lg font-bold tracking-tight ${financialMetrics.netMargin >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                  {financialMetrics.netMargin.toFixed(1)}%
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">Utilidad Neta / Ingresos Totales</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-1 space-y-0">
                <CardTitle className="text-xs font-medium text-muted-foreground">Razón Corriente / Liquidez</CardTitle>
                <Scale className="w-4 h-4 text-indigo-500" />
              </CardHeader>
              <CardContent>
                <div className="text-lg font-bold tracking-tight text-foreground font-mono">
                  {financialMetrics.currentRatio.toFixed(2)}x
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">Activos / Pasivos (Capacidad pago)</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-1 space-y-0">
                <CardTitle className="text-xs font-medium text-muted-foreground">Utilidad Neta del Período</CardTitle>
                <DollarSign className="w-4 h-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className={`text-lg font-bold tracking-tight ${financialMetrics.netIncome >= 0 ? 'text-foreground' : 'text-rose-600'}`}>
                  {formatCurrency(financialMetrics.netIncome)}
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">Ingresos menos Gastos</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-1 space-y-0">
                <CardTitle className="text-xs font-medium text-muted-foreground">Patrimonio Neto</CardTitle>
                <ShieldCheck className="w-4 h-4 text-purple-500" />
              </CardHeader>
              <CardContent>
                <div className="text-lg font-bold tracking-tight text-foreground">
                  {formatCurrency(financialMetrics.totalEquity)}
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">Capital y reservas de empresa</p>
              </CardContent>
            </Card>
          </div>

          {/* Visual Analysis Section: Income vs Expense comparison & Expense Distribution Donut */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Income vs Expenses Visual Comparison */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Scale className="w-4 h-4 text-primary shrink-0" />
                    Comparativo Ingresos vs Gastos
                  </span>
                  <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold border ${
                    financialMetrics.netIncome >= 0
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400'
                      : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400'
                  }`}>
                    {financialMetrics.netIncome >= 0 ? `Ganancia: ${formatCurrency(financialMetrics.netIncome)}` : `Pérdida: ${formatCurrency(financialMetrics.netIncome)}`}
                  </span>
                </CardTitle>
                <CardDescription className="text-[11px] mt-0.5">Proporción y resultado operativo del período</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-2">
                <div className="space-y-3">
                  {/* Income Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                        <ArrowUpRight className="w-3.5 h-3.5" /> Ingresos Totales
                      </span>
                      <span className="font-mono">{formatCurrency(financialMetrics.totalRevenue)}</span>
                    </div>
                    <div className="h-3 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                        style={{ width: `${financialMetrics.totalRevenue > 0 ? Math.min((financialMetrics.totalRevenue / (financialMetrics.totalRevenue + financialMetrics.totalExpense)) * 100, 100) : 0}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Expense Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400">
                        <ArrowDownRight className="w-3.5 h-3.5" /> Gastos Totales
                      </span>
                      <span className="font-mono">{formatCurrency(financialMetrics.totalExpense)}</span>
                    </div>
                    <div className="h-3 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-rose-500 rounded-full transition-all duration-500"
                        style={{ width: `${financialMetrics.totalExpense > 0 ? Math.min((financialMetrics.totalExpense / (financialMetrics.totalRevenue + financialMetrics.totalExpense)) * 100, 100) : 0}%` }}
                      ></div>
                    </div>
                  </div>
                </div>

                {/* Efficiency KPI */}
                <div className="p-3 bg-muted/30 rounded-lg border text-xs flex items-center justify-between">
                  <span className="text-muted-foreground font-medium">Relación Gastos / Ingresos</span>
                  <span className="font-bold font-mono">
                    {financialMetrics.totalRevenue > 0 ? `${((financialMetrics.totalExpense / financialMetrics.totalRevenue) * 100).toFixed(1)}%` : 'N/A'}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Expense Categories Distribution Chart */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <PieChart className="w-4 h-4 text-primary shrink-0" />
                  Distribución de Gastos por Categoría
                </CardTitle>
                <CardDescription className="text-[11px] mt-0.5">Desglose porcentual de gastos por cuenta contable</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingFinancials ? (
                  <p className="text-xs text-muted-foreground animate-pulse py-6">Cargando gráfico...</p>
                ) : (
                  renderExpenseDonut()
                )}
              </CardContent>
            </Card>
          </div>

          {/* Financial Statements Tables */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Balance Sheet */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Scale className="w-4 h-4 text-primary shrink-0" />
                  {t('reports.balanceSheetTitle')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingFinancials ? (
                  <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
                ) : !financials || financials.balanceSheet.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t('common.noData')}</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-[11px] font-bold">{t('reports.code')}</TableHead>
                        <TableHead className="text-[11px] font-bold">{t('reports.accountName')}</TableHead>
                        <TableHead className="text-[11px] font-bold text-right">{t('reports.balance')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {financials.balanceSheet.map((acc) => (
                        <TableRow key={acc.id} className={acc.code.length <= 2 ? 'font-semibold bg-muted/20' : ''}>
                          <TableCell className="font-mono text-[11px]">{acc.code}</TableCell>
                          <TableCell className="text-[11px] font-medium">{acc.name}</TableCell>
                          <TableCell className="text-right font-mono text-[11px] font-bold text-foreground">
                            {acc.balance.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* Income Statement */}
            <Card>
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary shrink-0" />
                  {t('reports.incomeStatementTitle')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingFinancials ? (
                  <p className="text-xs text-muted-foreground">{t('common.loading')}</p>
                ) : !financials || financials.incomeStatement.length === 0 ? (
                  <p className="text-xs text-muted-foreground">{t('common.noData')}</p>
                ) : (
                  <div className="space-y-4">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-[11px] font-bold">{t('reports.code')}</TableHead>
                          <TableHead className="text-[11px] font-bold">{t('reports.accountName')}</TableHead>
                          <TableHead className="text-[11px] font-bold text-right">{t('reports.balance')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {financials.incomeStatement.map((acc) => (
                          <TableRow key={acc.id} className={acc.code.length <= 2 ? 'font-semibold bg-muted/20' : ''}>
                            <TableCell className="font-mono text-[11px]">{acc.code}</TableCell>
                            <TableCell className="text-[11px] font-medium">{acc.name}</TableCell>
                            <TableCell className="text-right font-mono text-[11px] font-bold text-foreground">
                              {acc.balance.toFixed(2)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>

                    {(() => {
                      const rev = financials.incomeStatement.find((a) => a.type === 'REVENUE')?.balance || 0;
                      const exp = financials.incomeStatement.filter((a) => a.type === 'EXPENSE').reduce((sum, a) => sum + a.balance, 0);
                      const netIncome = rev - exp;

                      return (
                        <div className="flex justify-between items-center p-2.5 rounded-md border bg-primary/5 text-primary font-bold text-xs">
                          <span>{t('reports.netIncome')}</span>
                          <span className="font-mono text-sm">{formatCurrency(netIncome)}</span>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ReportsPage() {
  return (
    <Suspense fallback={null}>
      <ReportsContent />
    </Suspense>
  );
}

