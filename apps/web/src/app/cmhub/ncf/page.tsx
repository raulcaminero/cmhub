'use client';

import { useState, useEffect } from 'react';
import { useAppSelector } from '@/store/hooks';
import { useGetNcfSequencesQuery, useCreateNcfSequenceMutation, useImportNcfSequencesMutation } from '@/services/ncf.api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Loader2, Info, FileSpreadsheet, Upload } from 'lucide-react';
import { NcfType } from '@cmhub/shared-types';
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

export default function NcfPage() {
  const companyId = useAppSelector((state) => state.company.active?.id);
  const [mounted, setMounted] = useState(false);

  const { data: sequences, isLoading } = useGetNcfSequencesQuery(
    { companyId: companyId! },
    { skip: !companyId || !mounted },
  );

  const [createSequence, { isLoading: isCreating }] = useCreateNcfSequenceMutation();
  const [importNcfSequences, { isLoading: isImporting }] = useImportNcfSequencesMutation();

  const [isOpen, setIsOpen] = useState(false);
  const [isExcelOpen, setIsExcelOpen] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [importError, setImportError] = useState('');

  const [type, setType] = useState<NcfType>(NcfType.B01);
  const [prefix, setPrefix] = useState('B01');
  const [max, setMax] = useState(100);
  const [expiresAt, setExpiresAt] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

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
          <p className="text-muted-foreground text-sm">Selecciona una empresa para ver las secuencias NCF.</p>
        </CardContent>
      </Card>
    );
  }

  function handleTypeChange(selectedType: NcfType) {
    setType(selectedType);
    setPrefix(selectedType); // Default prefix matches type (e.g. B01 prefix is B01)
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

    const lines = csvText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (lines.length <= 1) {
      setImportError('El archivo o texto está vacío.');
      return;
    }

    const payload: any[] = [];
    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(p => p.trim().replace(/^["']|["']$/g, ''));
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
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight">NCF (Comprobantes Fiscales)</h1>
            <div className="relative group">
              <Info className="w-5 h-5 text-muted-foreground cursor-help hover:text-primary transition-colors" />
              <div className="absolute left-1/2 -translate-x-1/2 lg:left-full lg:translate-x-0 top-full lg:top-1/2 lg:-translate-y-1/2 mt-2 lg:mt-0 lg:ml-2 w-72 bg-slate-800 text-white text-xs p-3 rounded-lg shadow-xl hidden group-hover:block z-50 leading-relaxed font-normal normal-case">
                <p className="font-semibold mb-1">¿Qué es esta página?</p>
                Aquí administras las secuencias autorizadas por la DGII (B01, B02, etc.). 
                <br /><br />
                Al registrar tus rangos, el sistema generará automáticamente el NCF de tus facturas de venta, evitándote la digitación manual.
              </div>
            </div>
          </div>
          <p className="text-muted-foreground">Administración de secuencias y rangos autorizados por la DGII.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="gap-2" onClick={() => setIsExcelOpen(true)}>
            <FileSpreadsheet className="w-4 h-4" />
            Importar Excel / CSV
          </Button>
          <Button size="sm" className="gap-2" onClick={() => setIsOpen(true)}>
            <Plus className="w-4 h-4" />
            Registrar Secuencia
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Rangos Autorizados</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Cargando secuencias...</p>
          ) : !sequences || sequences.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No hay rangos de NCF registrados. Agrega uno para poder emitir comprobantes.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo de Comprobante</TableHead>
                  <TableHead>Prefijo</TableHead>
                  <TableHead className="text-right">Siguiente Secuencia</TableHead>
                  <TableHead className="text-right">Límite Máximo</TableHead>
                  <TableHead>Vencimiento</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sequences.map((seq) => {
                  const isElectronic = seq.type.startsWith('E');
                  const nextNum = seq.current + 1;
                  const paddedNext = String(nextNum).padStart(isElectronic ? 10 : 8, '0');
                  const isExpired = new Date(seq.expiresAt) < new Date();
                  
                  return (
                    <TableRow key={seq.id}>
                      <TableCell className="font-medium">
                        {NCF_TYPE_LABELS[seq.type] || seq.type}
                      </TableCell>
                      <TableCell className="font-mono text-sm">{seq.prefix}</TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {nextNum <= seq.max ? `${seq.prefix}${paddedNext}` : 'Agotado'}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">{seq.max}</TableCell>
                      <TableCell className={isExpired ? 'text-destructive font-medium' : ''}>
                        {new Date(seq.expiresAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          seq.isActive && !isExpired
                            ? 'bg-green-50 text-green-700 border border-green-200' 
                            : 'bg-red-50 text-red-700 border border-red-200'
                        }`}>
                          {seq.isActive && !isExpired ? 'Activo' : isExpired ? 'Vencido' : 'Inactivo'}
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-in fade-in duration-200">
          <div className="bg-card text-card-foreground p-6 rounded-lg w-full max-w-md shadow-xl border relative">
            <h3 className="text-lg font-semibold mb-2">Registrar Secuencia NCF</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Ingresa los datos del rango de comprobantes autorizados por la DGII.
            </p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="ncf-type">Tipo de NCF</Label>
                <select
                  id="ncf-type"
                  value={type}
                  onChange={(e) => handleTypeChange(e.target.value as NcfType)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  {Object.values(NcfType).map((t) => (
                    <option key={t} value={t}>
                      {NCF_TYPE_LABELS[t] || t}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="ncf-prefix">Prefijo de Secuencia</Label>
                <Input
                  id="ncf-prefix"
                  placeholder="Ej. B01 o E31"
                  value={prefix}
                  onChange={(e) => setPrefix(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="ncf-max">Cantidad Autorizada (Máximo)</Label>
                <Input
                  id="ncf-max"
                  type="number"
                  placeholder="Ej. 100"
                  value={max}
                  onChange={(e) => setMax(Number(e.target.value))}
                  required
                  min={1}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="ncf-expiry">Fecha de Vencimiento</Label>
                <Input
                  id="ncf-expiry"
                  type="date"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  required
                />
              </div>

              {errorMessage && (
                <p className="text-xs text-destructive font-medium">{errorMessage}</p>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsOpen(false);
                    setErrorMessage('');
                  }}
                  disabled={isCreating}
                >
                  Cancelar
                </Button>
                <Button type="submit" size="sm" disabled={isCreating}>
                  {isCreating ? (
                    <>
                      <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                      Registrando...
                    </>
                  ) : (
                    'Registrar'
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Importar NCF desde Excel/CSV */}
      {isExcelOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-in fade-in duration-200">
          <div className="bg-card text-card-foreground p-6 rounded-lg w-full max-w-lg shadow-xl border relative">
            <h3 className="text-lg font-semibold mb-2">Importar Secuencias NCF desde Excel / CSV</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Carga un archivo CSV o pega el texto en formato delimitado por comas con las columnas autorizadas por la DGII.
            </p>
            
            <form onSubmit={handleCsvImport} className="space-y-4">
              <div className="border border-dashed border-muted rounded-lg p-4 bg-muted/20 text-center flex flex-col items-center gap-2">
                <Upload className="w-8 h-8 text-muted-foreground" />
                <Label htmlFor="csv-file" className="cursor-pointer font-semibold hover:underline text-primary text-sm">
                  Haz clic para subir archivo CSV
                </Label>
                <span className="text-[10px] text-muted-foreground">O arrastra el archivo aquí</span>
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
                  <Label htmlFor="csv-text">Contenido o Vista Previa del CSV</Label>
                  <span className="text-[10px] text-muted-foreground font-mono">Formato: Tipo,Prefijo,Max,Vencimiento</span>
                </div>
                <textarea
                  id="csv-text"
                  rows={6}
                  placeholder="Ejemplo:&#10;Tipo,Prefijo,Max,Vencimiento&#10;B01,B01,100,2026-12-31&#10;B02,B02,500,2026-12-31"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs font-mono shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={csvText}
                  onChange={(e) => setCsvText(e.target.value)}
                  required
                />
              </div>

              {importError && (
                <p className="text-xs text-destructive font-medium">{importError}</p>
              )}

              <div className="flex justify-between items-center pt-2">
                <a 
                  href="data:text/csv;charset=utf-8,Tipo,Prefijo,Max,Vencimiento%0AB01,B01,100,2026-12-31%0AB02,B02,500,2026-12-31" 
                  download="plantilla_ncf.csv"
                  className="text-xs text-primary hover:underline flex items-center gap-1 font-medium"
                >
                  Descargar Plantilla CSV
                </a>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsExcelOpen(false);
                      setCsvText('');
                      setImportError('');
                    }}
                    disabled={isImporting}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" size="sm" disabled={isImporting}>
                    {isImporting ? (
                      <>
                        <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                        Importando...
                      </>
                    ) : (
                      'Importar Rangos'
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
