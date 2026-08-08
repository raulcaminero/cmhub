'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useAppSelector } from '@/store/hooks';
import { useCurrency } from '@/hooks/use-company';
import { useGetIt1SummaryQuery, useGetTaxFilingsQuery, useCreateTaxFilingMutation } from '@/services/reports.api';
import { Download, Calendar, Calculator, FileText, Clock, Send, ShieldCheck, Loader2, X, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useTranslation } from '@/lib/use-translation';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { calculateRetentions, RETENTION_TEMPLATES } from '@/lib/financial-calculations';

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => String(currentYear - i));
const MONTH_CODES = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'] as const;
const MONTH_KEYS: Record<string, string> = {
  '01': 'january', '02': 'february', '03': 'march', '04': 'april',
  '05': 'may', '06': 'june', '07': 'july', '08': 'august',
  '09': 'september', '10': 'october', '11': 'november', '12': 'december',
};

export default function TaxPage() {
  const { t, locale } = useTranslation();
  const companyId = useAppSelector((state) => state.company.active?.id);
  const accessToken = useAppSelector((state) => state.auth.accessToken);
  const [mounted, setMounted] = useState(false);
  const formatCurrency = useCurrency();
  // TODO: When multi-country engine is ready, gate this page using useModules().showTaxModule

  // Period Selector States
  const [selectedYear, setSelectedYear] = useState(() => String(new Date().getFullYear()));
  const [selectedMonth, setSelectedMonth] = useState(() => String(new Date().getMonth() + 1).padStart(2, '0'));

  // Calculator States
  const [calcTemplate, setCalcTemplate] = useState('honorarios');
  const [calcGross, setCalcGross] = useState<number>(10000);
  const [calcItbis, setCalcItbis] = useState<number>(0);
  const [calcItbisRetained, setCalcItbisRetained] = useState<number>(0);
  const [calcIsrRetained, setCalcIsrRetained] = useState<number>(0);
  const [calcNetToProvider, setCalcNetToProvider] = useState<number>(0);
  const [calcTotalToDgi, setCalcTotalToDgi] = useState<number>(0);

  // Fetch IT-1 figures
  const periodStr = `${selectedYear}${selectedMonth}`;
  const { data: it1Summary, isLoading: loadingIt1 } = useGetIt1SummaryQuery(
    { companyId: companyId!, period: periodStr },
    { skip: !companyId || !mounted }
  );

  // Fetch filings history
  const { data: taxFilings, isLoading: loadingFilings } = useGetTaxFilingsQuery(
    { companyId: companyId! },
    { skip: !companyId || !mounted }
  );

  const [createTaxFiling, { isLoading: isSubmitting }] = useCreateTaxFilingMutation();
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState('');

  const isPeriodFiled = taxFilings?.some((f) => f.period === periodStr && f.taxType === 'IT1');

  const [confirmFilingOpen, setConfirmFilingOpen] = useState(false);
  const [resultModal, setResultModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    type: 'success' | 'error';
  } | null>(null);

  async function handleFilingSubmit() {
    if (!companyId) return;
    setSubmitError('');
    setSubmitSuccess('');
    setConfirmFilingOpen(false);

    try {
      await createTaxFiling({
        companyId,
        body: { period: periodStr, taxType: 'IT1' },
      }).unwrap();
      setResultModal({
        isOpen: true,
        type: 'success',
        title: 'Declaración IT-1 Presentada',
        description: t('tax.filingSuccess'),
      });
    } catch (err: any) {
      setResultModal({
        isOpen: true,
        type: 'error',
        title: 'Error al Presentar',
        description: err.data?.message || t('tax.filingError'),
      });
    }
  }

  useEffect(() => {
    setMounted(true);
  }, []);

  // Update calculator calculations
  useEffect(() => {
    const res = calculateRetentions(calcGross, calcTemplate, 0.18);
    setCalcItbis(res.itbis);
    setCalcItbisRetained(res.itbisRetained);
    setCalcIsrRetained(res.isrRetained);
    setCalcNetToProvider(res.netToProvider);
    setCalcTotalToDgi(res.totalToDgi);
  }, [calcTemplate, calcGross]);

  if (!mounted) return null;

  const handleDownload = async (reportType: '606' | '607' | '608' | '609') => {
    if (!companyId) return;
    try {
      const url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/companies/${companyId}/accounting/reports/${reportType}?period=${periodStr}`;
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(t('tax.reportError'));
      }

      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.setAttribute('download', `DGII_${reportType}_${periodStr}.txt`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err: any) {
      setResultModal({
        isOpen: true,
        type: 'error',
        title: 'Error en Descarga',
        description: err.message || t('tax.downloadError'),
      });
    }
  };

  // Tax Calendar Deadlines calculation based on selected period
  const getNextMonthDeadline = (day: number): Date => {
    const year = parseInt(selectedYear);
    const month = parseInt(selectedMonth); // 1-12
    const targetMonth = month === 12 ? 0 : month;
    const targetYear = month === 12 ? year + 1 : year;
    return new Date(targetYear, targetMonth, day);
  };

  const getDeadlineDate = (day: number) => {
    const date = getNextMonthDeadline(day);
    return date.toLocaleDateString(locale === 'en' ? 'en-US' : 'es-DO', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const getDaysRemaining = (day: number) => {
    const deadline = getNextMonthDeadline(day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffTime = deadline.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };


  return (
    <div className="space-y-4">
      {/* Header with Period Selector */}
      <div>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
              <Calculator className="w-5 h-5 text-primary shrink-0" />
              {t('tax.title')}
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">{t('tax.subtitle')}</p>
          </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            <Label htmlFor="taxYearSelect" className="text-xs font-semibold text-muted-foreground">{t('common.year')}:</Label>
            <Select value={selectedYear} onValueChange={(val) => setSelectedYear(val)}>
              <SelectTrigger id="taxYearSelect" className="h-9 w-28 text-xs font-medium">
                <SelectValue placeholder={t('common.year')} />
              </SelectTrigger>
              <SelectContent>
                {YEARS.map((y) => (
                  <SelectItem key={y} value={y}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-1.5">
            <Label htmlFor="taxMonthSelect" className="text-xs font-semibold text-muted-foreground">{t('common.month')}:</Label>
            <Select value={selectedMonth} onValueChange={(val) => setSelectedMonth(val)}>
              <SelectTrigger id="taxMonthSelect" className="h-9 w-36 text-xs font-medium">
                <SelectValue placeholder={t('common.month')} />
              </SelectTrigger>
              <SelectContent>
                {MONTH_CODES.map((code) => (
                  <SelectItem key={code} value={code}>{t(`tax.${MONTH_KEYS[code]}`)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
      </div>

      {!companyId ? (
        <Card>
          <CardContent className="pt-3.5">
            <p className="text-muted-foreground text-sm">{t('common.selectCompany')}</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Top row: Summary & Exports */}
          <div className="grid gap-6 md:grid-cols-3">
            {/* Obligaciones Card */}
            <Card className="md:col-span-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  {t('tax.obligationsTitle')} ({selectedYear}-{selectedMonth})
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground mt-0.5">{t('tax.obligationsDesc')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {loadingIt1 ? (
                  <div className="space-y-2 py-4">
                    <div className="h-4 bg-muted animate-pulse rounded w-3/4"></div>
                    <div className="h-4 bg-muted animate-pulse rounded w-1/2"></div>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-b pb-4">
                      <div className="p-3 bg-muted/40 rounded-md">
                        <span className="text-xs text-muted-foreground block font-medium">{t('tax.itbisDue')}</span>
                        <span className="text-lg font-bold tracking-tight">{formatCurrency(it1Summary?.salesItbis ?? 0)}</span>
                      </div>
                      <div className="p-3 bg-muted/40 rounded-md">
                        <span className="text-xs text-muted-foreground block font-medium">{t('tax.itbisAdvanced')}</span>
                        <span className="text-lg font-bold tracking-tight">{formatCurrency(it1Summary?.purchasesItbis ?? 0)}</span>
                      </div>
                      <div className="p-3 bg-emerald-50 dark:bg-emerald-950/15 rounded-md">
                        <span className="text-xs text-emerald-700 dark:text-emerald-400 block font-medium">{t('tax.itbisNet')}</span>
                        <span className="text-lg font-bold tracking-tight text-emerald-600">{formatCurrency(it1Summary?.itbisToPay ?? 0)}</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-sm py-1">
                        <span className="text-muted-foreground">{t('tax.grossSales')}</span>
                        <span className="font-semibold">{formatCurrency(it1Summary?.salesAmount ?? 0)}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm py-1">
                        <span className="text-muted-foreground">{t('tax.grossPurchases')}</span>
                        <span className="font-semibold">{formatCurrency(it1Summary?.purchasesAmount ?? 0)}</span>
                      </div>
                    </div>

                    <div className="border-t pt-4 mt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        {isPeriodFiled ? (
                          <div className="flex items-center gap-2 text-emerald-600 text-sm font-semibold">
                            <ShieldCheck className="w-5 h-5 text-emerald-600" />
                            {t('tax.periodFiled')}
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-amber-600 text-xs">
                            <Clock className="w-4 h-4 text-amber-600" />
                            {t('tax.periodOpen')}
                          </div>
                        )}
                      </div>
                      
                      {!isPeriodFiled && (
                        <Button
                          type="button"
                          onClick={() => setConfirmFilingOpen(true)}
                          disabled={isSubmitting}
                          className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2 font-medium"
                          size="sm"
                        >
                          {isSubmitting ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              {t('tax.submitting')}
                            </>
                          ) : (
                            <>
                              <Send className="w-4 h-4" />
                              {t('tax.submitDeclaration')}
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                    {submitSuccess && <p className="text-xs text-green-600 font-semibold mt-2">{submitSuccess}</p>}
                    {submitError && <p className="text-xs text-red-600 font-semibold mt-2">{submitError}</p>}
                  </>
                )}
              </CardContent>
            </Card>

            {/* Descargas Card */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Download className="w-4 h-4 text-blue-600 shrink-0" />
                  {t('tax.downloadsTitle')}
                </CardTitle>
                 <CardDescription className="text-xs text-muted-foreground mt-0.5">{t('tax.downloadsDesc')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full justify-start text-left gap-2 text-xs font-mono" onClick={() => handleDownload('606')}>
                  <FileText className="w-4 h-4 text-orange-500" />
                  {t('tax.download606')}
                </Button>
                <Button variant="outline" className="w-full justify-start text-left gap-2 text-xs font-mono" onClick={() => handleDownload('607')}>
                  <FileText className="w-4 h-4 text-emerald-500" />
                  {t('tax.download607')}
                </Button>
                <Button variant="outline" className="w-full justify-start text-left gap-2 text-xs font-mono" onClick={() => handleDownload('608')}>
                  <FileText className="w-4 h-4 text-red-500" />
                  {t('tax.download608')}
                </Button>
                <Button variant="outline" className="w-full justify-start text-left gap-2 text-xs font-mono" onClick={() => handleDownload('609')}>
                  <FileText className="w-4 h-4 text-purple-500" />
                  {t('tax.download609')}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Bottom row: Deadlines & Interactive Calculator */}
          <div className="grid gap-6 md:grid-cols-3">
            {/* Calendar */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-indigo-600 shrink-0" />
                  {t('tax.upcomingDeadlines')}
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground mt-0.5">{t('tax.deadlinesDesc')} ({selectedMonth}/{selectedYear}).</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* IR-3 / TSS */}
                <div className="flex items-start justify-between border-b pb-2">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-foreground">{t('tax.deadlineTss')}</span>
                    <span className="text-[11px] text-muted-foreground block">{getDeadlineDate(10)}</span>
                  </div>
                  <div>
                    {getDaysRemaining(10) > 0 ? (
                      <span className="text-[10px] bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-full font-medium">{t('tax.expiresIn')} {getDaysRemaining(10)} d</span>
                    ) : (
                      <span className="text-[10px] bg-red-50 dark:bg-red-950/80 text-red-700 dark:text-red-300 px-2 py-0.5 rounded-full font-medium">{t('tax.expired')}</span>
                    )}
                  </div>
                </div>

                {/* Envíos 606/7/8/9 */}
                <div className="flex items-start justify-between border-b pb-2">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-foreground">{t('tax.deadlineEnvios')}</span>
                    <span className="text-[11px] text-muted-foreground block">{getDeadlineDate(15)}</span>
                  </div>
                  <div>
                    {getDaysRemaining(15) > 0 ? (
                      <span className="text-[10px] bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-full font-medium">{t('tax.expiresIn')} {getDaysRemaining(15)} d</span>
                    ) : (
                      <span className="text-[10px] bg-red-50 dark:bg-red-950/80 text-red-700 dark:text-red-300 px-2 py-0.5 rounded-full font-medium">{t('tax.expired')}</span>
                    )}
                  </div>
                </div>

                {/* IT-1 ITBIS */}
                <div className="flex items-start justify-between">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-foreground">{t('tax.deadlineIt1')}</span>
                    <span className="text-[11px] text-muted-foreground block">{getDeadlineDate(20)}</span>
                  </div>
                  <div>
                    {getDaysRemaining(20) > 0 ? (
                      <span className="text-[10px] bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-full font-medium">{t('tax.expiresIn')} {getDaysRemaining(20)} d</span>
                    ) : (
                      <span className="text-[10px] bg-red-50 dark:bg-red-950/80 text-red-700 dark:text-red-300 px-2 py-0.5 rounded-full font-medium">{t('tax.expired')}</span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Retention Calculator */}
            <Card className="md:col-span-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-emerald-600 shrink-0" />
                  {t('tax.calculatorTitle')}
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground mt-0.5">{t('tax.calculatorDesc')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="calc-template" className="text-xs font-medium">{t('tax.operationType')}</Label>
                    <Select value={calcTemplate} onValueChange={setCalcTemplate}>
                      <SelectTrigger id="calc-template" className="h-9 w-full text-xs font-medium">
                        <SelectValue placeholder={t('tax.operationType')} />
                      </SelectTrigger>
                      <SelectContent>
                        {RETENTION_TEMPLATES.map((tmpl) => (
                          <SelectItem key={tmpl.id} value={tmpl.id}>
                            {t(`tax.template_${tmpl.id}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="calc-gross" className="text-xs font-medium">{t('tax.grossAmount')}</Label>
                    <Input
                      id="calc-gross"
                      type="number"
                      value={calcGross || ''}
                      onChange={(e) => setCalcGross(Number(e.target.value))}
                      className="h-9 font-mono"
                    />
                  </div>
                </div>

                {/* Calculation Breakdown Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t pt-4">
                  {/* Left Column: Totals details */}
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-1 border-b">
                      <span className="text-muted-foreground">{t('tax.grossAmount')}</span>
                      <span className="font-semibold font-mono">{formatCurrency(calcGross)}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b">
                      <span className="text-muted-foreground">{t('tax.itbisBilled')}</span>
                      <span className="font-semibold font-mono">{formatCurrency(calcItbis)}</span>
                    </div>
                    <div className="flex justify-between py-1 font-bold">
                      <span>{t('tax.totalOriginal')}</span>
                      <span className="font-mono">{formatCurrency(calcGross + calcItbis)}</span>
                    </div>
                  </div>

                  {/* Right Column: Deductions & Net */}
                  <div className="space-y-2 text-xs bg-slate-50 dark:bg-slate-900/40 p-3 rounded-md border border-slate-100 dark:border-slate-800">
                    <div className="flex justify-between py-1 text-red-600">
                      <span>(-) {t('tax.retentionItbis')}</span>
                      <span className="font-semibold font-mono">{formatCurrency(calcItbisRetained)}</span>
                    </div>
                    <div className="flex justify-between py-1 text-red-600">
                      <span>(-) {t('tax.retentionIsr')}</span>
                      <span className="font-semibold font-mono">{formatCurrency(calcIsrRetained)}</span>
                    </div>
                    <div className="flex justify-between py-1 font-bold text-emerald-600 border-t pt-2 mt-1">
                      <span>{t('tax.netToPay')}</span>
                      <span className="font-mono text-sm">{formatCurrency(calcNetToProvider)}</span>
                    </div>
                    <div className="flex justify-between py-0.5 text-[10px] text-muted-foreground">
                      <span>{t('tax.totalToDgi')}</span>
                      <span className="font-mono">{formatCurrency(calcTotalToDgi)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Historial de Declaraciones */}
          <Card className="mt-4">
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-primary shrink-0" />
                {t('tax.filingHistoryTitle')}
              </CardTitle>
              <CardDescription className="text-[11px] text-muted-foreground mt-0.5">{t('tax.filingHistoryDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingFilings ? (
                <p className="text-xs text-muted-foreground animate-pulse">{t('tax.loadingHistory')}</p>
              ) : !taxFilings || taxFilings.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">{t('tax.noFilings')}</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="border-b text-[11px] font-bold uppercase tracking-wider text-muted-foreground bg-muted/50">
                        <th className="py-2 px-3">{t('tax.period')}</th>
                        <th className="py-2 px-3">{t('common.type')}</th>
                        <th className="py-2 px-3 text-right">{t('tax.salesAmount')}</th>
                        <th className="py-2 px-3 text-right">{t('tax.purchasesAmount')}</th>
                        <th className="py-2 px-3 text-right">{t('tax.taxResult')}</th>
                        <th className="py-2 px-3">{t('tax.filedDate')}</th>
                        <th className="py-2 px-3">{t('common.status')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {taxFilings.map((filing) => (
                        <tr key={filing.id} className="hover:bg-muted/40 transition-colors">
                          <td className="py-2 px-3 font-semibold font-mono text-[11px] text-foreground">
                            {filing.period.substring(4, 6)}/{filing.period.substring(0, 4)}
                          </td>
                          <td className="py-2 px-3 font-bold text-[11px] text-foreground">{filing.taxType}</td>
                          <td className="py-2 px-3 text-right font-mono text-[11px] text-foreground">{formatCurrency(Number(filing.salesAmount))}</td>
                          <td className="py-2 px-3 text-right font-mono text-[11px] text-foreground">{formatCurrency(Number(filing.purchasesAmount))}</td>
                          <td className="py-2 px-3 text-right font-mono text-[11px] text-emerald-600 font-bold">{formatCurrency(Number(filing.itbisToPay))}</td>
                          <td className="py-2 px-3 text-[11px] text-muted-foreground font-mono">{new Date(filing.filedAt).toLocaleString()}</td>
                          <td className="py-2 px-3">
                            <span className="text-[11px] bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 px-2 py-0.5 rounded-full font-semibold">
                              {t('tax.filed')}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
      {/* Modal de Confirmación de Presentación (Shadcn UI) */}
      {confirmFilingOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-card text-card-foreground p-6 rounded-xl w-full max-w-md shadow-2xl border relative">
            <button
              type="button"
              onClick={() => setConfirmFilingOpen(false)}
              className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Cerrar</span>
            </button>

            <h3 className="text-sm font-bold flex items-center gap-2">
              <Send className="w-4 h-4 text-primary shrink-0" />
              Confirmar Presentación de IT-1
            </h3>
            <p className="text-xs text-muted-foreground mt-1 mb-4 leading-relaxed">
              {t('tax.confirmFiling', { period: `${selectedMonth}/${selectedYear}` })}
            </p>

            <div className="bg-muted/30 border rounded-lg p-3 text-xs mb-4 flex items-center justify-between">
              <span className="font-semibold text-muted-foreground">Período Fiscal:</span>
              <span className="font-mono font-bold text-foreground bg-background px-2.5 py-1 rounded border">
                {selectedMonth}/{selectedYear}
              </span>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t mt-4">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 text-xs font-medium"
                onClick={() => setConfirmFilingOpen(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={isSubmitting}
                onClick={handleFilingSubmit}
                className="h-8 text-xs font-medium gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    {t('tax.submitting')}
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    {t('tax.submitDeclaration')}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Resultado / Notificación Shadcn UI */}
      {resultModal?.isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-card text-card-foreground p-6 rounded-xl w-full max-w-md shadow-2xl border relative text-center flex flex-col items-center">
            <button
              type="button"
              onClick={() => setResultModal(null)}
              className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Cerrar</span>
            </button>

            {resultModal.type === 'success' ? (
              <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3">
                <CheckCircle2 className="w-6 h-6" />
              </div>
            ) : (
              <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-3">
                <AlertTriangle className="w-6 h-6" />
              </div>
            )}

            <h3 className="text-base font-bold text-foreground">
              {resultModal.title}
            </h3>
            <p className="text-xs text-muted-foreground mt-1 mb-4 max-w-xs leading-relaxed">
              {resultModal.description}
            </p>

            <Button
              onClick={() => setResultModal(null)}
              className="w-full h-9 text-xs font-medium bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              Entendido
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
