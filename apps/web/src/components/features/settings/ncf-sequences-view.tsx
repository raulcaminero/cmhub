'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAppSelector } from '@/store/hooks';
import { useGetNcfSequencesQuery, useCreateNcfSequenceMutation, useImportNcfSequencesMutation } from '@/services/ncf.api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Loader2, FileSpreadsheet, Upload, Search, Zap, CheckCircle2, AlertTriangle, Clock, Layers, FileText, X } from 'lucide-react';
import { NcfType } from '@cmhub/shared-types';
import { useTranslation } from '@/lib/use-translation';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tooltip } from '@/components/ui/tooltip';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const NCF_TYPE_LABELS: Record<NcfType, string> = {
  [NcfType.B01]: 'Crédito Fiscal (B01)',
  [NcfType.B02]: 'Consumo (B02)',
  [NcfType.B14]: 'Regímenes Especiales (B14)',
  [NcfType.B15]: 'Gubernamental (B15)',
  [NcfType.B16]: 'Exportación (B16)',
  [NcfType.E31]: 'E-Crédito Fiscal (E31)',
  [NcfType.E32]: 'E-Consumo (E32)',
  [NcfType.E33]: 'E-Regímenes Especiales (E33)',
  [NcfType.E34]: 'E-Gubernamental (E34)',
  [NcfType.E41]: 'E-Compras (E41)',
  [NcfType.E43]: 'E-Gastos Menores (E43)',
  [NcfType.E44]: 'E-Regímenes Especiales (E44)',
  [NcfType.E45]: 'E-Gubernamental (E45)',
};

export function NcfSequencesView() {
  const { t } = useTranslation();
  const companyId = useAppSelector((state) => state.company.active?.id);
  const [mounted, setMounted] = useState(false);

  const { data: sequences = [], isLoading } = useGetNcfSequencesQuery(
    { companyId: companyId! },
    { skip: !companyId || !mounted },
  );

  const [createSequence, { isLoading: isCreating }] = useCreateNcfSequenceMutation();
  const [importNcfSequences, { isLoading: isImporting }] = useImportNcfSequencesMutation();

  const [isOpen, setIsOpen] = useState(false);
  const [isExcelOpen, setIsExcelOpen] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [importError, setImportError] = useState('');

  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'PHYSICAL' | 'ELECTRONIC'>('ALL');

  const [type, setType] = useState<NcfType>(NcfType.B01);
  const [prefix, setPrefix] = useState('B01');
  const [max, setMax] = useState(100);
  const [expiresAt, setExpiresAt] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isPresetLoading, setIsPresetLoading] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Compute Fiscal KPIs
  const metrics = useMemo(() => {
    const total = sequences.length;
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const active = sequences.filter((s) => s.isActive && new Date(s.expiresAt) > now).length;
    const lowCapacity = sequences.filter((s) => {
      const remaining = s.max - s.current;
      return remaining > 0 && remaining / s.max <= 0.2;
    }).length;
    const expiringSoon = sequences.filter((s) => {
      const exp = new Date(s.expiresAt);
      return exp > now && exp <= thirtyDaysFromNow;
    }).length;

    return { total, active, lowCapacity, expiringSoon };
  }, [sequences]);

  // Filter Sequences List
  const filteredSequences = useMemo(() => {
    return sequences.filter((seq) => {
      const typeName = NCF_TYPE_LABELS[seq.type] || seq.type;
      const matchesSearch =
        seq.prefix.toLowerCase().includes(searchTerm.toLowerCase()) ||
        typeName.toLowerCase().includes(searchTerm.toLowerCase());

      const isElectronic = seq.type.startsWith('E');
      const matchesCategory =
        filterType === 'ALL'
          ? true
          : filterType === 'PHYSICAL'
          ? !isElectronic
          : isElectronic;

      return matchesSearch && matchesCategory;
    });
  }, [sequences, searchTerm, filterType]);

  // Load 1-Click Initial Presets manually if requested
  async function handleLoadPresets() {
    if (!companyId) return;

    setIsPresetLoading(true);
    const twoYearsLater = new Date();
    twoYearsLater.setFullYear(twoYearsLater.getFullYear() + 2);
    const expiryStr = twoYearsLater.toISOString();

    const presets = [
      { type: NcfType.B01, prefix: 'B01', max: 100, expiresAt: expiryStr },
      { type: NcfType.B02, prefix: 'B02', max: 500, expiresAt: expiryStr },
      { type: NcfType.E31, prefix: 'E31', max: 100, expiresAt: expiryStr },
      { type: NcfType.E32, prefix: 'E32', max: 500, expiresAt: expiryStr },
    ];

    try {
      await importNcfSequences({
        companyId,
        body: presets,
      }).unwrap();
    } catch (err: any) {
      alert(err.data?.message || 'Error al cargar las secuencias iniciales.');
    } finally {
      setIsPresetLoading(false);
    }
  }

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

  function handleTypeChange(selectedType: NcfType) {
    setType(selectedType);
    setPrefix(selectedType);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!companyId) return;
    setErrorMessage('');

    try {
      await createSequence({
        companyId,
        body: {
          type,
          prefix,
          max: Number(max),
          expiresAt: new Date(expiresAt).toISOString(),
        },
      }).unwrap();
      
      setIsOpen(false);
      setExpiresAt('');
    } catch (err: any) {
      setErrorMessage(err.data?.message || 'Error al registrar la secuencia NCF.');
    }
  }

  async function handleCsvImport(e: React.FormEvent) {
    e.preventDefault();
    if (!companyId) return;
    setImportError('');

    const lines = csvText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (lines.length <= 1) {
      setImportError('El archivo o texto está vacío.');
      return;
    }

    const payload: any[] = [];
    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map((p) => p.trim().replace(/^["']|["']$/g, ''));
      if (parts.length < 4) continue;

      const typeVal = parts[0] as NcfType;
      const prefixVal = parts[1];
      const maxVal = Number(parts[2]);
      const expiresAtVal = parts[3];

      if (!typeVal || !prefixVal || isNaN(maxVal) || !expiresAtVal) {
        setImportError(`Fila ${i + 1} inválida. Verifica los datos.`);
        return;
      }

      payload.push({
        type: typeVal,
        prefix: prefixVal,
        max: maxVal,
        expiresAt: new Date(expiresAtVal).toISOString(),
      });
    }

    try {
      await importNcfSequences({
        companyId,
        body: payload,
      }).unwrap();
      setIsExcelOpen(false);
      setCsvText('');
    } catch (err: any) {
      setImportError(err.data?.message || 'Error al importar las secuencias NCF.');
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCsvText(text);
    };
    reader.readAsText(file);
  }

  return (
    <div className="space-y-4">
      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-1 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">{t('ncf.totalSequences')}</CardTitle>
            <Layers className="w-4 h-4 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold tracking-tight">{metrics.total}</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">{t('ncf.totalSequencesDesc')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-1 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">{t('ncf.activeSequences')}</CardTitle>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold tracking-tight">{metrics.active}</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">{t('ncf.activeSequencesDesc')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-1 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">{t('ncf.lowSequences')}</CardTitle>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold tracking-tight">{metrics.lowCapacity}</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">{t('ncf.lowSequencesDesc')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-1 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">{t('ncf.expiringSoon')}</CardTitle>
            <Clock className="w-4 h-4 text-rose-500" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold tracking-tight">{metrics.expiringSoon}</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">{t('ncf.expiringSoonDesc')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Main NCF Sequences Card */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 py-2.5 px-4">
          <div>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary shrink-0" />
              {t('ncf.cardTitle')}
            </CardTitle>
            <p className="text-[11px] text-muted-foreground mt-0.5">{t('ncf.subtitle')}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Tooltip content="Importar secuencias NCF desde archivo Excel" align="end">
              <Button size="sm" className="gap-2 font-semibold shadow-2xs" onClick={() => setIsExcelOpen(true)}>
                <FileSpreadsheet className="w-4 h-4" />
                {t('contacts.importCsv')}
              </Button>
            </Tooltip>
            <Tooltip content="Registrar nueva secuencia autorizada de NCF" align="end">
              <Button size="sm" className="gap-2 font-semibold shadow-2xs" onClick={() => setIsOpen(true)}>
                <Plus className="w-4 h-4" />
                {t('ncf.registerSequence')}
              </Button>
            </Tooltip>
          </div>
        </CardHeader>

        {/* Filter Controls Bar */}
        <div className="px-4 pb-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b">
          {/* Search Input */}
          <div className="relative w-full sm:w-56">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t('ncf.searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 h-8 text-xs"
            />
          </div>
          {/* Category Filter Tabs */}
          <div className="inline-flex items-center rounded-lg bg-muted p-0.5 text-xs font-medium">
            <button
              type="button"
              onClick={() => setFilterType('ALL')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                filterType === 'ALL'
                  ? 'bg-background text-foreground shadow-sm font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t('ncf.allTab')}
            </button>
            <button
              type="button"
              onClick={() => setFilterType('PHYSICAL')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                filterType === 'PHYSICAL'
                  ? 'bg-background text-foreground shadow-sm font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t('ncf.physicalTab')}
            </button>
            <button
              type="button"
              onClick={() => setFilterType('ELECTRONIC')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                filterType === 'ELECTRONIC'
                  ? 'bg-background text-foreground shadow-sm font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t('ncf.electronicTab')}
            </button>
          </div>
        </div>

        <CardContent className="pt-3.5">
          {isLoading ? (
            <p className="text-sm text-muted-foreground py-4">{t('ncf.loading')}</p>
          ) : !filteredSequences || filteredSequences.length === 0 ? (
            <div className="text-center py-10 max-w-md mx-auto space-y-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
                <Layers className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-base font-semibold tracking-tight">No hay secuencias NCF configuradas</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Si tu empresa es nueva en la DGII, puedes cargar la plantilla inicial predeterminada. Si ya cuentas con rangos autorizados, impórtalos o regístralos manualmente.
                </p>
              </div>
              {sequences.length === 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-2">
                  <Button size="sm" className="gap-2 font-semibold shadow-2xs w-full sm:w-auto" onClick={handleLoadPresets} disabled={isPresetLoading}>
                    {isPresetLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4 fill-current" />}
                    Cargar Plantilla Inicial (B01, B02, E31, E32)
                  </Button>
                  <Button size="sm" variant="outline" className="gap-2 font-semibold shadow-2xs w-full sm:w-auto" onClick={() => setIsExcelOpen(true)}>
                    <FileSpreadsheet className="w-4 h-4" />
                    Importar Excel
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-[11px] font-bold">{t('ncf.voucherType')}</TableHead>
                  <TableHead className="text-[11px] font-bold">{t('ncf.prefix')}</TableHead>
                  <TableHead className="text-[11px] font-bold w-56">{t('ncf.consumptionHeader')}</TableHead>
                  <TableHead className="text-[11px] font-bold text-right">{t('ncf.nextSequence')}</TableHead>
                  <TableHead className="text-[11px] font-bold">{t('ncf.expiration')}</TableHead>
                  <TableHead className="text-[11px] font-bold">{t('common.status')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSequences.map((seq) => {
                  const isElectronic = seq.type.startsWith('E');
                  const nextNum = seq.current + 1;
                  const paddedNext = String(nextNum).padStart(isElectronic ? 10 : 8, '0');
                  const isExpired = new Date(seq.expiresAt) < new Date();
                  
                  const used = seq.current;
                  const pct = Math.min(Math.round((used / seq.max) * 100), 100);
                  const isLow = (seq.max - used) / seq.max <= 0.2;

                  return (
                    <TableRow key={seq.id}>
                      <TableCell className="font-medium text-[11px]">
                        {NCF_TYPE_LABELS[seq.type] || seq.type}
                      </TableCell>
                      <TableCell className="font-mono text-[11px]">{seq.prefix}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex justify-between items-center text-[11px] font-mono">
                            <span>{used} / {seq.max}</span>
                            <span className="font-semibold text-muted-foreground">{pct}%</span>
                          </div>
                          <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                pct >= 90 || isExpired
                                  ? 'bg-rose-500'
                                  : pct >= 70
                                  ? 'bg-amber-500'
                                  : 'bg-emerald-500'
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono text-[11px] font-semibold">
                        {nextNum <= seq.max ? `${seq.prefix}${paddedNext}` : t('ncf.exhausted')}
                      </TableCell>
                      <TableCell className={isExpired ? 'text-destructive font-semibold text-[11px]' : 'text-[11px]'}>
                        {new Date(seq.expiresAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                            seq.isActive && !isExpired
                              ? isLow
                                ? 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/20 dark:text-amber-400'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400'
                              : 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/20 dark:text-rose-400'
                          }`}
                        >
                          {seq.isActive && !isExpired
                            ? isLow
                              ? 'Casi Agotado'
                              : t('ncf.active')
                            : isExpired
                            ? t('ncf.expired')
                            : t('ncf.inactive')}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Modal Nueva Secuencia */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-card text-card-foreground p-6 rounded-xl w-full max-w-md shadow-2xl border relative">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                setErrorMessage('');
              }}
              className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Cerrar</span>
            </button>
            <h3 className="text-sm font-bold flex items-center gap-2">
              <Plus className="w-4 h-4 text-primary shrink-0" />
              {t('ncf.registerTitle')}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5 mb-4">
              {t('ncf.registerSubtitle')}
            </p>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="ncf-type" className="text-xs font-semibold text-muted-foreground">{t('ncf.ncfType')} *</Label>
                <Select value={type} onValueChange={(val) => handleTypeChange(val as NcfType)}>
                  <SelectTrigger id="ncf-type" className="w-full h-9 text-xs font-medium">
                    <SelectValue placeholder={t('ncf.ncfType')} />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(NcfType).map((tVal) => (
                      <SelectItem key={tVal} value={tVal} className="text-xs">
                        {NCF_TYPE_LABELS[tVal] || tVal}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="ncf-prefix" className="text-xs font-semibold text-muted-foreground">{t('ncf.prefixLabel')} *</Label>
                <Input
                  id="ncf-prefix"
                  placeholder="Ej. B01 o E31"
                  value={prefix}
                  onChange={(e) => setPrefix(e.target.value)}
                  className="h-9 text-xs font-mono"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="ncf-max" className="text-xs font-semibold text-muted-foreground">{t('ncf.maxLabel')} *</Label>
                <Input
                  id="ncf-max"
                  type="number"
                  placeholder="Ej. 100"
                  value={max}
                  onChange={(e) => setMax(Number(e.target.value))}
                  className="h-9 text-xs font-mono"
                  required
                  min={1}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="ncf-expiry" className="text-xs font-semibold text-muted-foreground">{t('ncf.expiryLabel')} *</Label>
                <Input
                  id="ncf-expiry"
                  type="date"
                  aria-label={t('ncf.expiryLabel')}
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  className="h-9 text-xs"
                  required
                />
              </div>

              {errorMessage && (
                <p className="text-xs text-destructive font-semibold mt-2">{errorMessage}</p>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t mt-4">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs font-medium"
                  onClick={() => {
                    setIsOpen(false);
                    setErrorMessage('');
                  }}
                  disabled={isCreating}
                >
                  {t('common.cancel')}
                </Button>
                <Button type="submit" size="sm" disabled={isCreating} className="h-8 text-xs font-medium gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground">
                  {isCreating ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      {t('common.saving')}
                    </>
                  ) : (
                    t('common.save')
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Importar NCF desde Excel/CSV */}
      {isExcelOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-card text-card-foreground p-6 rounded-xl w-full max-w-lg shadow-2xl border relative">
            <button
              type="button"
              onClick={() => {
                setIsExcelOpen(false);
                setCsvText('');
                setImportError('');
              }}
              className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Cerrar</span>
            </button>
            <h3 className="text-sm font-bold flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
              {t('ncf.importTitle')}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5 mb-4">
              {t('ncf.importSubtitle')}
            </p>
            
            <form onSubmit={handleCsvImport} className="space-y-3">
              <div className="border border-dashed border-muted rounded-lg p-4 bg-muted/20 text-center flex flex-col items-center gap-2">
                <Upload className="w-8 h-8 text-muted-foreground" />
                <Label htmlFor="csv-file" className="cursor-pointer font-semibold hover:underline text-primary text-xs">
                  {t('contacts.uploadCsv')}
                </Label>
                <span className="text-[10px] text-muted-foreground">{t('contacts.dragCsv')}</span>
                <Input
                  id="csv-file"
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <Label htmlFor="csv-text" className="text-xs font-semibold text-muted-foreground">{t('contacts.csvPreview')}</Label>
                  <span className="text-[10px] text-muted-foreground font-mono">Formato: Tipo,Prefijo,Max,Vencimiento</span>
                </div>
                <textarea
                  id="csv-text"
                  rows={5}
                  placeholder="Ejemplo:&#10;Tipo,Prefijo,Max,Vencimiento&#10;B01,B01,100,2026-12-31&#10;B02,B02,500,2026-12-31"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs font-mono shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={csvText}
                  onChange={(e) => setCsvText(e.target.value)}
                  required
                />
              </div>

              {importError && (
                <p className="text-xs text-destructive font-semibold mt-2">{importError}</p>
              )}

              <div className="flex justify-between items-center pt-3 border-t mt-4">
                <a 
                  href="data:text/csv;charset=utf-8,Tipo,Prefijo,Max,Vencimiento%0AB01,B01,100,2026-12-31%0AB02,B02,500,2026-12-31" 
                  download="plantilla_ncf.csv"
                  className="text-xs text-primary hover:underline flex items-center gap-1 font-medium"
                >
                  {t('contacts.downloadTemplate')}
                </a>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs font-medium"
                    onClick={() => {
                      setIsExcelOpen(false);
                      setCsvText('');
                      setImportError('');
                    }}
                    disabled={isImporting}
                  >
                    {t('common.cancel')}
                  </Button>
                  <Button type="submit" size="sm" disabled={isImporting} className="h-8 text-xs font-medium gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground">
                    {isImporting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        {t('contacts.importing')}
                      </>
                    ) : (
                      t('ncf.importRanges')
                    )}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
