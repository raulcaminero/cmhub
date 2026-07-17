'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useAppSelector } from '@/store/hooks';
import { useGetIt1SummaryQuery, useGetTaxFilingsQuery, useCreateTaxFilingMutation } from '@/services/reports.api';
import { Download, Calendar, Calculator, FileText, DollarSign, Clock, Send, ShieldCheck, Loader2 } from 'lucide-react';

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
  const companyId = useAppSelector((state) => state.company.active?.id);
  const accessToken = useAppSelector((state) => state.auth.accessToken);
  const [mounted, setMounted] = useState(false);

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
  const getDeadlineDate = (day: number) => {
    const year = parseInt(selectedYear);
    const month = parseInt(selectedMonth); // 1-12
    // Deadline is the next month
    const targetMonth = month === 12 ? 0 : month;
    const targetYear = month === 12 ? year + 1 : year;
    const date = new Date(targetYear, targetMonth, day);
    return date.toLocaleDateString('es-DO', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const getDaysRemaining = (day: number) => {
    const year = parseInt(selectedYear);
    const month = parseInt(selectedMonth);
    const targetMonth = month === 12 ? 0 : month;
    const targetYear = month === 12 ? year + 1 : year;
    const deadline = new Date(targetYear, targetMonth, day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffTime = deadline.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <div className="space-y-6">
      {/* Header with Period Selector */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Impuestos y Retenciones</h1>
          <p className="text-muted-foreground">Monitorea tus obligaciones fiscales con la DGII y descarga los archivos de envío (606, 607, 608, 609).</p>
        </div>
        <div className="flex items-center gap-2 bg-card border rounded-md p-2 shadow-sm self-start">
          <Label className="text-xs font-semibold px-1">Período Fiscal:</Label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="h-8 rounded border border-input bg-background px-2 text-xs focus-visible:outline-none"
          >
            {YEARS.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="h-8 rounded border border-input bg-background px-2 text-xs focus-visible:outline-none"
          >
            {MONTHS.map((m) => (
              <option key={m.code} value={m.code}>{m.name}</option>
            ))}
          </select>
        </div>
      </div>

      {!companyId ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground text-sm">Selecciona una empresa en la barra superior o en configuración para ver el tablero fiscal.</p>
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
                  Obligaciones Estimadas del Período ({selectedYear}-{selectedMonth})
                </CardTitle>
                <CardDescription>Resumen acumulado del ITBIS y retenciones calculadas en base a facturas y gastos registrados.</CardDescription>
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
                        <span className="text-xs text-muted-foreground block font-medium">ITBIS por Pagar (Ventas)</span>
                        <span className="text-lg font-bold font-mono">RD$ {it1Summary?.salesItbis.toFixed(2) || '0.00'}</span>
                      </div>
                      <div className="p-3 bg-muted/40 rounded-md">
                        <span className="text-xs text-muted-foreground block font-medium">ITBIS Adelantado (Compras)</span>
                        <span className="text-lg font-bold font-mono">RD$ {it1Summary?.purchasesItbis.toFixed(2) || '0.00'}</span>
                      </div>
                      <div className="p-3 bg-emerald-50 dark:bg-emerald-950/15 rounded-md">
                        <span className="text-xs text-emerald-700 dark:text-emerald-400 block font-medium">ITBIS Neto a Declarar</span>
                        <span className="text-lg font-bold font-mono text-emerald-600">RD$ {it1Summary?.itbisToPay.toFixed(2) || '0.00'}</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-sm py-1">
                        <span className="text-muted-foreground">Ventas Brutas Declaradas (Sin impuestos)</span>
                        <span className="font-semibold font-mono">RD$ {it1Summary?.salesAmount.toFixed(2) || '0.00'}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm py-1">
                        <span className="text-muted-foreground">Compras Brutas Declaradas (Sin impuestos)</span>
                        <span className="font-semibold font-mono">RD$ {it1Summary?.purchasesAmount.toFixed(2) || '0.00'}</span>
                      </div>
                    </div>

                    <div className="border-t pt-4 mt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        {isPeriodFiled ? (
                          <div className="flex items-center gap-2 text-emerald-600 text-sm font-semibold">
                            <ShieldCheck className="w-5 h-5 text-emerald-600" />
                            Este período fiscal ha sido presentado y bloqueado.
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-amber-600 text-xs">
                            <Clock className="w-4 h-4 text-amber-600" />
                            Este período está abierto y puede recibir facturas y gastos.
                          </div>
                        )}
                      </div>
                      
                      {!isPeriodFiled && (
                        <Button
                          type="button"
                          onClick={handleFilingSubmit}
                          disabled={isSubmitting}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
                          size="sm"
                        >
                          {isSubmitting ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Presentando...
                            </>
                          ) : (
                            <>
                              <Send className="w-4 h-4" />
                              Presentar Declaración IT-1
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
                  Archivos de Envío (TXT)
                </CardTitle>
                <CardDescription>Genera y descarga el archivo comprimido/plano delimitado por pipe (`|`) para subir al portal DGII.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full justify-start text-left gap-2 text-xs font-mono" onClick={() => handleDownload('606')}>
                  <FileText className="w-4 h-4 text-orange-500" />
                  Descargar Reporte 606 (Gastos)
                </Button>
                <Button variant="outline" className="w-full justify-start text-left gap-2 text-xs font-mono" onClick={() => handleDownload('607')}>
                  <FileText className="w-4 h-4 text-emerald-500" />
                  Descargar Reporte 607 (Ventas)
                </Button>
                <Button variant="outline" className="w-full justify-start text-left gap-2 text-xs font-mono" onClick={() => handleDownload('608')}>
                  <FileText className="w-4 h-4 text-red-500" />
                  Descargar Reporte 608 (Anulados)
                </Button>
                <Button variant="outline" className="w-full justify-start text-left gap-2 text-xs font-mono" onClick={() => handleDownload('609')}>
                  <FileText className="w-4 h-4 text-purple-500" />
                  Descargar Reporte 609 (Extranjero)
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
                  Próximos Vencimientos Fiscales
                </CardTitle>
                <CardDescription>Fechas límites para declarar el período {selectedMonth}/{selectedYear}.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* IR-3 / TSS */}
                <div className="flex items-start justify-between border-b pb-2">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-100">Pago TSS e IR-3 (Retenciones Salarios)</span>
                    <span className="text-[11px] text-muted-foreground block">{getDeadlineDate(10)}</span>
                  </div>
                  <div>
                    {getDaysRemaining(10) > 0 ? (
                      <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-medium">Vence en {getDaysRemaining(10)} d</span>
                    ) : (
                      <span className="text-[10px] bg-red-50 text-red-700 px-2 py-0.5 rounded-full font-medium">Vencido</span>
                    )}
                  </div>
                </div>

                {/* Envíos 606/7/8/9 */}
                <div className="flex items-start justify-between border-b pb-2">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-100">Envíos de Datos (606, 607, 608, 609)</span>
                    <span className="text-[11px] text-muted-foreground block">{getDeadlineDate(15)}</span>
                  </div>
                  <div>
                    {getDaysRemaining(15) > 0 ? (
                      <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-medium">Vence en {getDaysRemaining(15)} d</span>
                    ) : (
                      <span className="text-[10px] bg-red-50 text-red-700 px-2 py-0.5 rounded-full font-medium">Vencido</span>
                    )}
                  </div>
                </div>

                {/* IT-1 ITBIS */}
                <div className="flex items-start justify-between">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-100">Declaración IT-1 (Pago ITBIS Neto)</span>
                    <span className="text-[11px] text-muted-foreground block">{getDeadlineDate(20)}</span>
                  </div>
                  <div>
                    {getDaysRemaining(20) > 0 ? (
                      <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-medium">Vence en {getDaysRemaining(20)} d</span>
                    ) : (
                      <span className="text-[10px] bg-red-50 text-red-700 px-2 py-0.5 rounded-full font-medium">Vencido</span>
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
                  Calculadora y Simulador de Retenciones DGII
                </CardTitle>
                <CardDescription>Simula retenciones de ITBIS e ISR para prestadores de servicios o proveedores informales.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="calc-template" className="text-xs font-medium">Tipo de Operación y Tasa Legal</Label>
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
                    <Label htmlFor="calc-gross" className="text-xs font-medium">Monto Bruto Facturado (RD$)</Label>
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
                      <span className="text-muted-foreground">Monto Bruto / Subtotal</span>
                      <span className="font-semibold font-mono">RD$ {calcGross.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b">
                      <span className="text-muted-foreground">ITBIS Facturado (18%)</span>
                      <span className="font-semibold font-mono">RD$ {calcItbis.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between py-1 font-bold">
                      <span>Total Facturado Original</span>
                      <span className="font-mono">RD$ {(calcGross + calcItbis).toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Right Column: Deductions & Net */}
                  <div className="space-y-2 text-xs bg-slate-50 dark:bg-slate-900/40 p-3 rounded-md border border-slate-100 dark:border-slate-800">
                    <div className="flex justify-between py-1 text-red-600">
                      <span>(-) Retención ITBIS</span>
                      <span className="font-semibold font-mono">RD$ {calcItbisRetained.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between py-1 text-red-600">
                      <span>(-) Retención ISR</span>
                      <span className="font-semibold font-mono">RD$ {calcIsrRetained.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between py-1 font-bold text-emerald-600 border-t pt-2 mt-1">
                      <span>Neto a Pagar al Proveedor</span>
                      <span className="font-mono text-sm">RD$ {calcNetToProvider.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between py-0.5 text-[10px] text-muted-foreground">
                      <span>Total Retenciones a Enterar a DGII</span>
                      <span className="font-mono">RD$ {calcTotalToDgi.toFixed(2)}</span>
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
                Historial de Declaraciones de Impuestos (IT-1)
              </CardTitle>
              <CardDescription>Registro histórico de los formularios presentados y los períodos cerrados.</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingFilings ? (
                <p className="text-sm text-muted-foreground animate-pulse">Cargando historial...</p>
              ) : !taxFilings || taxFilings.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">Aún no se han presentado declaraciones de impuestos para esta empresa.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead>
                      <tr className="border-b text-xs uppercase text-muted-foreground">
                        <th className="py-2">Período</th>
                        <th className="py-2">Impuesto</th>
                        <th className="py-2 text-right">Monto Ventas</th>
                        <th className="py-2 text-right">Monto Compras</th>
                        <th className="py-2 text-right">Impuesto Resultante</th>
                        <th className="py-2">Fecha Presentación</th>
                        <th className="py-2">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {taxFilings.map((filing) => (
                        <tr key={filing.id} className="border-b hover:bg-muted/30">
                          <td className="py-2 font-semibold font-mono">
                            {filing.period.substring(4, 6)}/{filing.period.substring(0, 4)}
                          </td>
                          <td className="py-2 font-bold">{filing.taxType}</td>
                          <td className="py-2 text-right font-mono">RD$ {Number(filing.salesAmount).toFixed(2)}</td>
                          <td className="py-2 text-right font-mono">RD$ {Number(filing.purchasesAmount).toFixed(2)}</td>
                          <td className="py-2 text-right font-mono text-emerald-600 font-semibold">RD$ {Number(filing.itbisToPay).toFixed(2)}</td>
                          <td className="py-2 text-muted-foreground">{new Date(filing.filedAt).toLocaleString()}</td>
                          <td className="py-2">
                            <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-bold">
                              PRESENTADA
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
