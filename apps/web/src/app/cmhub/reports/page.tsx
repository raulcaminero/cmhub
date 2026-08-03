'use client';

import { useState, useEffect } from 'react';
import { useAppSelector } from '@/store/hooks';
import { useCurrency, useIsDominicanCompany } from '@/hooks/use-company';
import { useGetFinancialsQuery, useGetIt1SummaryQuery } from '@/services/reports.api';
import { useTranslation } from '@/lib/use-translation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FileText, Download, BarChart2, Calendar, BookMarked } from 'lucide-react';
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

export default function ReportsPage() {
  const { t } = useTranslation();
  const companyId = useAppSelector((state) => state.company.active?.id);
  const token = useAppSelector((state) => state.auth.accessToken);
  const [mounted, setMounted] = useState(false);
  const formatCurrency = useCurrency();
  const isDominicanCompany = useIsDominicanCompany();

  const [activeTab, setActiveTab] = useState<'tax' | 'financials' | 'ledger'>('financials');
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

  function handlePeriodChange(e: React.FormEvent) {
    e.preventDefault();
    // Period updates automatically via selectedYear and selectedMonth state
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('reports.title')}</h1>
          <p className="text-muted-foreground">{t('reports.subtitle')}</p>
        </div>

        <div className="flex gap-2">
          {isDominicanCompany && (
            <Button
              variant={activeTab === 'tax' ? 'default' : 'outline'}
              onClick={() => setActiveTab('tax')}
              className="flex items-center gap-2"
            >
              <BarChart2 className="w-4 h-4" />
              {t('reports.tabTax')}
            </Button>
          )}
          <Button
            variant={activeTab === 'financials' ? 'default' : 'outline'}
            onClick={() => setActiveTab('financials')}
            className="flex items-center gap-2"
          >
            <FileText className="w-4 h-4" />
            {t('reports.tabFinancials')}
          </Button>
          <Button
            variant={activeTab === 'ledger' ? 'default' : 'outline'}
            onClick={() => setActiveTab('ledger')}
            className="flex items-center gap-2"
          >
            <BookMarked className="w-4 h-4" />
            {t('reports.tabLedger')}
          </Button>
        </div>
      </div>

      {activeTab === 'tax' ? (
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Calendar className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                {t('reports.selectPeriod')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePeriodChange} className="flex flex-wrap items-end gap-3 max-w-md">
                <div className="space-y-1">
                  <Label htmlFor="yearSelect" className="text-xs font-semibold text-muted-foreground block">Año</Label>
                  <select
                    id="yearSelect"
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    className="h-9 rounded-md border border-input bg-background text-foreground px-3 text-xs focus-visible:outline-none"
                  >
                    {YEARS.map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="monthSelect" className="text-xs font-semibold text-muted-foreground block">Mes</Label>
                  <select
                    id="monthSelect"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="h-9 rounded-md border border-input bg-background text-foreground px-3 text-xs focus-visible:outline-none font-medium"
                  >
                    {MONTHS.map((m) => (
                      <option key={m.code} value={m.code}>{m.name}</option>
                    ))}
                  </select>
                </div>

                <Button type="submit" size="sm" className="h-9 gap-1.5 font-medium">
                  {t('reports.update')}
                </Button>
              </form>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>{t('reports.dgiiFormats')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="font-semibold text-sm">{t('reports.format606')}</p>
                    <p className="text-xs text-muted-foreground">{t('reports.format606Desc')}</p>
                  </div>
                  <Button size="sm" onClick={() => handleDownload('606')} className="flex items-center gap-2">
                    <Download className="w-4 h-4" />
                    {t('reports.download606')}
                  </Button>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="font-semibold text-sm">{t('reports.format607')}</p>
                    <p className="text-xs text-muted-foreground">{t('reports.format607Desc')}</p>
                  </div>
                  <Button size="sm" onClick={() => handleDownload('607')} className="flex items-center gap-2">
                    <Download className="w-4 h-4" />
                    {t('reports.download607')}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('reports.it1Summary')}</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingIt1 ? (
                  <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
                ) : !it1 ? (
                  <p className="text-sm text-muted-foreground">{t('reports.noDataPeriod')}</p>
                ) : (
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm py-1 border-b">
                      <span>{t('reports.billedIncome')}</span>
                      <span className="font-mono font-medium">{formatCurrency(Number(it1.salesAmount))}</span>
                    </div>
                    <div className="flex justify-between text-sm py-1 border-b">
                      <span>{t('reports.billedItbis')}</span>
                      <span className="font-mono font-medium text-destructive">{formatCurrency(Number(it1.salesItbis))}</span>
                    </div>
                    <div className="flex justify-between text-sm py-1 border-b">
                      <span>{t('reports.purchasesNet')}</span>
                      <span className="font-mono font-medium">{formatCurrency(Number(it1.purchasesAmount))}</span>
                    </div>
                    <div className="flex justify-between text-sm py-1 border-b">
                      <span>{t('reports.paidItbis')}</span>
                      <span className="font-mono font-medium text-green-600">{formatCurrency(Number(it1.purchasesItbis))}</span>
                    </div>
                    <div className="flex justify-between font-semibold text-base pt-2">
                      <span>{t('reports.totalItbisPay')}</span>
                      <span className="font-mono text-primary">{formatCurrency(Number(it1.itbisToPay))}</span>
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
        <div className="space-y-4">
          <div className="flex justify-end gap-3 print:hidden">
            <Button variant="outline" onClick={handleDownloadFinancials} className="flex items-center gap-2">
              <Download className="w-4 h-4" />
              Exportar a Excel (.csv)
            </Button>
            <Button variant="outline" onClick={handlePrint} className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Imprimir / PDF
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Balance Sheet */}
            <Card>
              <CardHeader>
                <CardTitle>{t('reports.balanceSheetTitle')}</CardTitle>
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
                      <TableHead>{t('reports.code')}</TableHead>
                      <TableHead>{t('reports.accountName')}</TableHead>
                      <TableHead className="text-right">{t('reports.balance')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {financials.balanceSheet.map((acc) => (
                      <TableRow key={acc.id} className={acc.code.length <= 2 ? 'font-semibold bg-muted/20' : ''}>
                        <TableCell className="font-mono text-xs">{acc.code}</TableCell>
                        <TableCell className="text-sm">{acc.name}</TableCell>
                        <TableCell className="text-right font-mono text-sm">
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
            <CardHeader>
              <CardTitle>{t('reports.incomeStatementTitle')}</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingFinancials ? (
                <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
              ) : !financials || financials.incomeStatement.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t('common.noData')}</p>
              ) : (
                <div className="space-y-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('reports.code')}</TableHead>
                        <TableHead>{t('reports.accountName')}</TableHead>
                        <TableHead className="text-right">{t('reports.balance')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {financials.incomeStatement.map((acc) => (
                        <TableRow key={acc.id} className={acc.code.length <= 2 ? 'font-semibold bg-muted/20' : ''}>
                          <TableCell className="font-mono text-xs">{acc.code}</TableCell>
                          <TableCell className="text-sm">{acc.name}</TableCell>
                          <TableCell className="text-right font-mono text-sm">
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
                      <div className="flex justify-between items-center p-3 rounded-lg border bg-primary/5 text-primary font-semibold text-lg">
                        <span>{t('reports.netIncome')}</span>
                        <span className="font-mono">{formatCurrency(netIncome)}</span>
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
