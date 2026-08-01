'use client';

import { useState, useEffect } from 'react';
import { useAppSelector } from '@/store/hooks';
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

export default function ReportsPage() {
  const { t } = useTranslation();
  const companyId = useAppSelector((state) => state.company.active?.id);
  const token = useAppSelector((state) => state.auth.accessToken);
  const [mounted, setMounted] = useState(false);

  const [activeTab, setActiveTab] = useState<'tax' | 'financials' | 'ledger'>('tax');
  const [period, setPeriod] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  const [inputPeriod, setInputPeriod] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

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
    const [year, month] = inputPeriod.split('-');
    if (year && month) {
      setPeriod(`${year}${month}`);
    }
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('reports.title')}</h1>
          <p className="text-muted-foreground">{t('reports.subtitle')}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b gap-4 flex-wrap">
        <Button
          variant={activeTab === 'tax' ? 'default' : 'outline'}
          onClick={() => setActiveTab('tax')}
          className="gap-2"
        >
          <Calendar className="w-4 h-4" />
          {t('reports.taxTab')}
        </Button>
        <Button
          variant={activeTab === 'financials' ? 'default' : 'outline'}
          onClick={() => setActiveTab('financials')}
          className="gap-2"
        >
          <BarChart2 className="w-4 h-4" />
          {t('reports.financialsTab')}
        </Button>
        <Button
          variant={activeTab === 'ledger' ? 'default' : 'outline'}
          onClick={() => setActiveTab('ledger')}
          className="gap-2"
        >
          <BookMarked className="w-4 h-4" />
          {t('reports.ledgerTab')}
        </Button>
      </div>


      {activeTab === 'tax' ? (
        <div className="space-y-6">
          {/* Selector de periodo */}
          <Card>
            <CardContent className="pt-6">
              <form onSubmit={handlePeriodChange} className="flex flex-wrap items-end gap-4">
                <div className="space-y-1">
                  <Label htmlFor="report-period">{t('reports.selectPeriod')}</Label>
                  <Input
                    id="report-period"
                    type="month"
                    value={inputPeriod}
                    onChange={(e) => setInputPeriod(e.target.value)}
                  />
                </div>
                <Button type="submit">{t('reports.queryPeriod')}</Button>
              </form>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Exportaciones DGII */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  {t('reports.dgiiFormats')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 border rounded-lg bg-card">
                  <div>
                    <h4 className="font-semibold text-sm">{t('reports.format606Title')}</h4>
                    <p className="text-xs text-muted-foreground">{t('reports.format606Desc')}</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => handleDownload('606')} className="gap-2">
                    <Download className="w-4 h-4" />
                    TXT
                  </Button>
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg bg-card">
                  <div>
                    <h4 className="font-semibold text-sm">{t('reports.format607Title')}</h4>
                    <p className="text-xs text-muted-foreground">{t('reports.format607Desc')}</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => handleDownload('607')} className="gap-2">
                    <Download className="w-4 h-4" />
                    TXT
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Resumen IT-1 */}
            <Card>
              <CardHeader>
                <CardTitle>{t('reports.it1Estimate')}</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingIt1 ? (
                  <p className="text-sm text-muted-foreground">{t('reports.calculating')}</p>
                ) : !it1 ? (
                  <p className="text-sm text-muted-foreground">{t('reports.noDataPeriod')}</p>
                ) : (
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm py-1 border-b">
                      <span>{t('reports.billedIncome')}</span>
                      <span className="font-mono font-medium">RD$ {Number(it1.salesAmount).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm py-1 border-b">
                      <span>{t('reports.billedItbis')}</span>
                      <span className="font-mono font-medium text-destructive">RD$ {Number(it1.salesItbis).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm py-1 border-b">
                      <span>{t('reports.purchasesNet')}</span>
                      <span className="font-mono font-medium">RD$ {Number(it1.purchasesAmount).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm py-1 border-b">
                      <span>{t('reports.paidItbis')}</span>
                      <span className="font-mono font-medium text-green-600">RD$ {Number(it1.purchasesItbis).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-semibold text-base pt-2">
                      <span>{t('reports.totalItbisPay')}</span>
                      <span className="font-mono text-primary">RD$ {Number(it1.itbisToPay).toFixed(2)}</span>
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
                        <span className="font-mono">RD$ {netIncome.toFixed(2)}</span>
                      </div>
                    );
                  })()}
                </div>
              )}
            </CardContent>
          </Card>

        </div>
      )}
    </div>
  );
}
