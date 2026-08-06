'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useAppSelector } from '@/store/hooks';
import { useCurrency } from '@/hooks/use-company';
import { useGetIt1SummaryQuery, useGetTaxFilingsQuery, useCreateTaxFilingMutation } from '@/services/reports.api';
import { Download, Calendar, Calculator, FileText, DollarSign, Clock, Send, ShieldCheck, Loader2 } from 'lucide-react';
import { useTranslation } from '@/lib/use-translation';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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

const RETENTION_TEMPLATES = [
  { id: 'alquiler', label: 'Alquiler Comercial (10% ISR / 100% ITBIS)', isrRate: 0.10, itbisRetainedRate: 1.0 },
  { id: 'honorarios', label: 'Honorarios Profesionales (10% ISR / 30% ITBIS)', isrRate: 0.10, itbisRetainedRate: 0.30 },
  { id: 'servicios_tecnicos', label: 'Servicios Técnicos y Otros (2% ISR / 30% ITBIS)', isrRate: 0.02, itbisRetainedRate: 0.30 },
  { id: 'limpieza_seguridad', label: 'Servicios de Seguridad/Limpieza (2% ISR / 100% ITBIS)', isrRate: 0.02, itbisRetainedRate: 1.0 },
  { id: 'informal', label: 'Compra a Proveedor Informal (Sin ISR / 100% ITBIS)', isrRate: 0.0, itbisRetainedRate: 1.0 },
];

export default function TaxPage() {
  const { t } = useTranslation();
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

  async function handleFilingSubmit() {
    if (!companyId) return;
    setSubmitError('');
    setSubmitSuccess('');

    if (confirm(`¿Estás seguro de presentar el IT-1 para el período ${selectedMonth}/${selectedYear}? Esto bloqueará el registro de facturas o gastos en este mes.`)) {
      try {
        await createTaxFiling({
          companyId,
          body: { period: periodStr, taxType: 'IT1' },
        }).unwrap();
        setSubmitSuccess('Declaración presentada con éxito y período contable cerrado.');
        setTimeout(() => setSubmitSuccess(''), 4000);
      } catch (err: any) {
        setSubmitError(err.data?.message || 'Error al presentar la declaración.');
      }
    }
  }

  useEffect(() => {
    setMounted(true);
  }, []);

  // Update calculator calculations
  useEffect(() => {
    const template = RETENTION_TEMPLATES.find((t) => t.id === calcTemplate);
    if (!template) return;

    const itbisCalculated = Number((calcGross * 0.18).toFixed(2));
    const itbisRet = Number((itbisCalculated * template.itbisRetainedRate).toFixed(2));
    const isrRet = Number((calcGross * template.isrRate).toFixed(2));
    const net = Number((calcGross + itbisCalculated - itbisRet - isrRet).toFixed(2));
    const toDgi = Number((itbisRet + isrRet).toFixed(2));

    setCalcItbis(itbisCalculated);
    setCalcItbisRetained(itbisRet);
    setCalcIsrRetained(isrRet);
    setCalcNetToProvider(net);
    setCalcTotalToDgi(toDgi);
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
        throw new Error('Error al generar el reporte.');
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
      alert(err.message || 'Error descargando el archivo.');
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
    return date.toLocaleDateString('es-DO', { day: 'numeric', month: 'long', year: 'numeric' });
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
            <Label htmlFor="taxYearSelect" className="text-xs font-semibold text-muted-foreground">Año:</Label>
            <Select value={selectedYear} onValueChange={(val) => setSelectedYear(val)}>
              <SelectTrigger id="taxYearSelect" className="h-9 w-28 text-xs font-medium">
                <SelectValue placeholder="Año" />
              </SelectTrigger>
              <SelectContent>
                {YEARS.map((y) => (
                  <SelectItem key={y} value={y}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-1.5">
            <Label htmlFor="taxMonthSelect" className="text-xs font-semibold text-muted-foreground">Mes:</Label>
            <Select value={selectedMonth} onValueChange={(val) => setSelectedMonth(val)}>
              <SelectTrigger id="taxMonthSelect" className="h-9 w-36 text-xs font-medium">
                <SelectValue placeholder="Mes" />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map((m) => (
                  <SelectItem key={m.code} value={m.code}>{m.name}</SelectItem>
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
                <CardTitle className="text-lg flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-emerald-600" />
                  {t('tax.obligationsTitle')} ({selectedYear}-{selectedMonth})
                </CardTitle>
                <CardDescription>{t('tax.obligationsDesc')}</CardDescription>
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
                          onClick={handleFilingSubmit}
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
                <CardTitle className="text-lg flex items-center gap-2">
                  <Download className="w-5 h-5 text-blue-600" />
                  {t('tax.downloadsTitle')}
                </CardTitle>
                 <CardDescription>{t('tax.downloadsDesc')}</CardDescription>
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
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-indigo-600" />
                  {t('tax.upcomingDeadlines')}
                </CardTitle>
                <CardDescription>{t('tax.deadlinesDesc')} {selectedMonth}/{selectedYear}.</CardDescription>
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
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calculator className="w-5 h-5 text-emerald-600" />
                  {t('tax.calculatorTitle')}
                </CardTitle>
                <CardDescription>{t('tax.calculatorDesc')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="calc-template" className="text-xs font-medium">{t('tax.operationType')}</Label>
                    <select
                      id="calc-template"
                      value={calcTemplate}
                      onChange={(e) => setCalcTemplate(e.target.value)}
                      className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none"
                    >
                      {RETENTION_TEMPLATES.map((t) => (
                        <option key={t.id} value={t.id}>{t.label}</option>
                      ))}
                    </select>
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
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-indigo-600" />
                {t('tax.filingHistoryTitle')}
              </CardTitle>
              <CardDescription>{t('tax.filingHistoryDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingFilings ? (
                <p className="text-sm text-muted-foreground animate-pulse">{t('tax.loadingHistory')}</p>
              ) : !taxFilings || taxFilings.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">{t('tax.noFilings')}</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead>
                      <tr className="border-b text-xs uppercase text-muted-foreground">
                        <th className="py-2">{t('tax.period')}</th>
                        <th className="py-2">{t('common.type')}</th>
                        <th className="py-2 text-right">{t('tax.salesAmount')}</th>
                        <th className="py-2 text-right">{t('tax.purchasesAmount')}</th>
                        <th className="py-2 text-right">{t('tax.taxResult')}</th>
                        <th className="py-2">{t('tax.filedDate')}</th>
                        <th className="py-2">{t('common.status')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {taxFilings.map((filing) => (
                        <tr key={filing.id} className="border-b hover:bg-muted/30">
                          <td className="py-2 font-semibold font-mono">
                            {filing.period.substring(4, 6)}/{filing.period.substring(0, 4)}
                          </td>
                          <td className="py-2 font-bold">{filing.taxType}</td>
                          <td className="py-2 text-right font-mono">{formatCurrency(Number(filing.salesAmount))}</td>
                          <td className="py-2 text-right font-mono">{formatCurrency(Number(filing.purchasesAmount))}</td>
                          <td className="py-2 text-right font-mono text-emerald-600 font-semibold">{formatCurrency(Number(filing.itbisToPay))}</td>
                          <td className="py-2 text-muted-foreground">{new Date(filing.filedAt).toLocaleString()}</td>
                          <td className="py-2">
                            <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-bold">
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
    </div>
  );
}
