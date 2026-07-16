'use client';

import { useState, useEffect } from 'react';
import { useAppSelector } from '@/store/hooks';
import { useGetAccountsQuery } from '@/services/accounting.api';
import {
  useGetReconciliationReportQuery,
  useImportStatementCsvMutation,
  useAutoMatchReconciliationMutation,
  useMatchReconciliationMutation,
  useUnmatchReconciliationMutation,
  BankTransaction,
  LedgerLine,
} from '@/services/bank-reconciliation.api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Upload,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  Info,
  X,
  Sparkles,
  Link2,
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export function ReconciliationView() {
  const companyId = useAppSelector((state) => state.company.active?.id);
  const [mounted, setMounted] = useState(false);

  // Selector bank accounts
  const { data: accounts } = useGetAccountsQuery(
    { companyId: companyId! },
    { skip: !companyId }
  );

  // Filter accounts representing bank assets
  const bankAccounts = accounts?.filter((a) => a.code.startsWith('1101')) || [];
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (bankAccounts.length > 0 && !selectedAccountId) {
      setSelectedAccountId(bankAccounts[0].id);
    }
  }, [bankAccounts, selectedAccountId]);

  // Report query
  const { data: report, isLoading: loadingReport, refetch } = useGetReconciliationReportQuery(
    { companyId: companyId!, accountId: selectedAccountId },
    { skip: !companyId || !selectedAccountId || !mounted }
  );

  // Mutations
  const [importStatement, { isLoading: isImporting }] = useImportStatementCsvMutation();
  const [autoMatch, { isLoading: isMatching }] = useAutoMatchReconciliationMutation();
  const [matchManual] = useMatchReconciliationMutation();
  const [unmatch] = useUnmatchReconciliationMutation();

  // Import Dialog
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [csvContent, setCsvContent] = useState('');
  const [importError, setImportError] = useState('');

  // Row selection for manual match
  const [selectedBankTx, setSelectedBankTx] = useState<BankTransaction | null>(null);
  const [selectedLedgerLine, setSelectedLedgerLine] = useState<LedgerLine | null>(null);

  if (!mounted) return null;
  if (!companyId) return null;

  const defaultCsvTemplate = `Fecha,Descripcion,Referencia,Monto
2026-07-01,Deposito Factura NCF-B0100000001,DEP-001,5900.00
2026-07-15,Retencion TSS e Impuesto Nomina,, -15822.42
2026-07-15,Pago Sueldos Netos Periodo 202607,, -125000.00`;

  async function handleImportCsv(e: React.FormEvent) {
    e.preventDefault();
    if (!companyId) return;
    setImportError('');
    if (!selectedAccountId) return;
    
    try {
      const res = await importStatement({
        companyId,
        accountId: selectedAccountId,
        csvContent,
      }).unwrap();
      setIsImportOpen(false);
      setCsvContent('');
      alert(`Se importaron con éxito ${res.importedCount} transacciones bancarias.`);
    } catch (err: any) {
      setImportError(err.data?.message || 'Error al importar extracto CSV.');
    }
  }

  async function handleAutoMatch() {
    if (!companyId || !selectedAccountId) return;
    try {
      const res = await autoMatch({ companyId, accountId: selectedAccountId }).unwrap();
      alert(`Conciliación automática ejecutada. Se emparejaron ${res.matchesCount} movimientos.`);
    } catch (err) {
      alert('Error al ejecutar la conciliación automática.');
    }
  }

  async function handleManualMatch() {
    if (!companyId) return;
    if (!selectedBankTx || !selectedLedgerLine) return;
    try {
      await matchManual({
        companyId,
        bankTransactionId: selectedBankTx.id,
        journalEntryLineId: selectedLedgerLine.id,
      }).unwrap();
      setSelectedBankTx(null);
      setSelectedLedgerLine(null);
    } catch (err) {
      alert('Error al conciliar manualmente.');
    }
  }

  async function handleUnmatch(id: string) {
    if (!companyId) return;
    if (confirm('¿Deseas anular la conciliación de este movimiento?')) {
      try {
        await unmatch({ companyId, id }).unwrap();
      } catch (err) {
        alert('Error al desconciliar el movimiento.');
      }
    }
  }

  return (
    <div className="space-y-6">
      {/* Account selector and imports */}
      <div className="flex flex-wrap gap-4 items-center justify-between bg-card p-4 rounded-lg border">
        <div className="flex items-center gap-3 min-w-[280px]">
          <Label htmlFor="rec-account" className="font-semibold text-sm whitespace-nowrap">
            Cuenta Bancaria:
          </Label>
          {bankAccounts.length === 0 ? (
            <span className="text-xs text-muted-foreground">
              No hay cuentas de banco (1101) creadas.
            </span>
          ) : (
            <select
              id="rec-account"
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
            >
              {bankAccounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.code} - {a.name}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="gap-2"
            onClick={() => setIsImportOpen(true)}
            disabled={!selectedAccountId}
          >
            <Upload className="w-4 h-4" />
            Importar Extracto
          </Button>
          <Button
            size="sm"
            className="gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 shadow-md transition-all"
            onClick={handleAutoMatch}
            disabled={!selectedAccountId || isMatching}
          >
            <Sparkles className="w-4 h-4 animate-pulse" />
            Conciliación Inteligente
          </Button>
          <Button size="sm" variant="ghost" className="h-9 w-9 p-0" onClick={refetch}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {loadingReport ? (
        <p className="text-sm text-muted-foreground text-center py-6">Cargando reporte de conciliación...</p>
      ) : report ? (
        <div className="space-y-6">
          {/* Summary KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider block">
                  Saldo Según Libros
                </span>
                <span className="text-xl font-bold font-mono text-purple-700 block mt-1">
                  RD$ {report.booksBalance.toFixed(2)}
                </span>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider block">
                  Saldo Según Extracto Banco
                </span>
                <span className="text-xl font-bold font-mono text-indigo-700 block mt-1">
                  RD$ {report.bankBalance.toFixed(2)}
                </span>
              </CardContent>
            </Card>

            <Card className={Math.abs(report.difference) < 0.01 ? 'border-green-300 bg-green-50/10' : 'border-amber-300 bg-amber-50/10'}>
              <CardContent className="pt-6 flex justify-between items-start">
                <div>
                  <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider block">
                    Diferencia
                  </span>
                  <span className={`text-xl font-bold font-mono block mt-1 ${Math.abs(report.difference) < 0.01 ? 'text-green-700' : 'text-amber-700'}`}>
                    RD$ {report.difference.toFixed(2)}
                  </span>
                </div>
                {Math.abs(report.difference) < 0.01 ? (
                  <CheckCircle2 className="w-6 h-6 text-green-600" />
                ) : (
                  <AlertTriangle className="w-6 h-6 text-amber-600" />
                )}
              </CardContent>
            </Card>
          </div>

          {/* Manual Reconciliation Double Column */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Bank statement panel */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="text-md font-semibold flex items-center gap-2">
                  🏦 Extracto Bancario ({report.unreconciledBankCount} pendientes)
                </h3>
              </div>
              <div className="border rounded-md max-h-[400px] overflow-y-auto bg-card">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Concepto</TableHead>
                      <TableHead className="text-right">Monto</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.unreconciledBankTransactions.map((tx) => (
                      <TableRow
                        key={tx.id}
                        onClick={() => setSelectedBankTx(selectedBankTx?.id === tx.id ? null : tx)}
                        className={`cursor-pointer ${selectedBankTx?.id === tx.id ? 'bg-indigo-100/50 hover:bg-indigo-100' : 'hover:bg-accent'}`}
                      >
                        <TableCell className="font-mono text-xs whitespace-nowrap">
                          {new Date(tx.date).toISOString().split('T')[0]}
                        </TableCell>
                        <TableCell className="text-xs max-w-[200px] truncate">
                          <p className="font-semibold">{tx.description}</p>
                          {tx.reference && <span className="text-[10px] text-muted-foreground font-mono">Ref: {tx.reference}</span>}
                        </TableCell>
                        <TableCell className={`text-right font-mono text-xs font-bold ${tx.amount > 0 ? 'text-green-700' : 'text-red-700'}`}>
                          RD$ {tx.amount.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                    {report.unreconciledBankTransactions.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-xs text-muted-foreground py-6">
                          No hay transacciones bancarias pendientes de conciliación.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Ledger lines panel */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="text-md font-semibold flex items-center gap-2">
                  📖 Libro Contable ({report.unreconciledBooksCount} pendientes)
                </h3>
              </div>
              <div className="border rounded-md max-h-[400px] overflow-y-auto bg-card">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Referencia</TableHead>
                      <TableHead className="text-right">Debito</TableHead>
                      <TableHead className="text-right">Credito</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.unreconciledBooksLines.map((line) => (
                      <TableRow
                        key={line.id}
                        onClick={() => setSelectedLedgerLine(selectedLedgerLine?.id === line.id ? null : line)}
                        className={`cursor-pointer ${selectedLedgerLine?.id === line.id ? 'bg-purple-100/50 hover:bg-purple-100' : 'hover:bg-accent'}`}
                      >
                        <TableCell className="font-mono text-xs whitespace-nowrap">
                          {new Date(line.date).toISOString().split('T')[0]}
                        </TableCell>
                        <TableCell className="text-xs max-w-[200px] truncate">
                          <p className="font-semibold">{line.entryDescription}</p>
                          {line.reference && <span className="text-[10px] text-muted-foreground font-mono">Ref: {line.reference}</span>}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs text-green-700">
                          {line.debit > 0 ? `RD$ ${line.debit.toFixed(2)}` : '-'}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs text-red-700">
                          {line.credit > 0 ? `RD$ ${line.credit.toFixed(2)}` : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                    {report.unreconciledBooksLines.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-xs text-muted-foreground py-6">
                          No hay movimientos contables pendientes de conciliación.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>

          {/* Floating Action Bar for manual match */}
          {(selectedBankTx || selectedLedgerLine) && (
            <div className="bg-accent border border-accent-foreground/20 p-4 rounded-lg flex flex-wrap gap-4 items-center justify-between animate-in slide-in-from-bottom duration-300">
              <div className="flex items-center gap-4 text-xs">
                <div className="space-y-1">
                  <span className="text-xxs text-muted-foreground font-semibold block uppercase">Selección Banco:</span>
                  {selectedBankTx ? (
                    <span className="font-semibold font-mono text-indigo-700 bg-indigo-100/30 px-2 py-0.5 rounded">
                      {selectedBankTx.description} (RD$ {selectedBankTx.amount.toFixed(2)})
                    </span>
                  ) : (
                    <span className="text-muted-foreground italic">Ninguno</span>
                  )}
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground" />
                <div className="space-y-1">
                  <span className="text-xxs text-muted-foreground font-semibold block uppercase">Selección Libros:</span>
                  {selectedLedgerLine ? (
                    <span className="font-semibold font-mono text-purple-700 bg-purple-100/30 px-2 py-0.5 rounded">
                      {selectedLedgerLine.entryDescription} (RD$ {(selectedLedgerLine.debit || selectedLedgerLine.credit).toFixed(2)})
                    </span>
                  ) : (
                    <span className="text-muted-foreground italic">Ninguno</span>
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setSelectedBankTx(null);
                    setSelectedLedgerLine(null);
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  className="gap-2"
                  onClick={handleManualMatch}
                  disabled={!selectedBankTx || !selectedLedgerLine}
                >
                  <Link2 className="w-4 h-4" />
                  Conciliar Selección
                </Button>
              </div>
            </div>
          )}

          {/* Reconciled list */}
          <div className="space-y-3 pt-4">
            <h3 className="text-md font-semibold">🔗 Transacciones Conciliadas</h3>
            <div className="border rounded-md max-h-[300px] overflow-y-auto bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Extracto Banco</TableHead>
                    <TableHead className="text-right">Monto</TableHead>
                    <TableHead>Diario Relacionado</TableHead>
                    <TableHead className="text-right">Acción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.reconciledBankTransactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell className="font-mono text-xs whitespace-nowrap">
                        {new Date(tx.date).toISOString().split('T')[0]}
                      </TableCell>
                      <TableCell className="text-xs">
                        <p className="font-semibold">{tx.description}</p>
                        {tx.reference && <span className="text-[10px] text-muted-foreground">Ref: {tx.reference}</span>}
                      </TableCell>
                      <TableCell className={`text-right font-mono text-xs font-bold ${tx.amount > 0 ? 'text-green-700' : 'text-red-700'}`}>
                        RD$ {tx.amount.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        <p className="font-semibold text-foreground">{tx.journalEntryDescription || '-'}</p>
                        {tx.journalEntryReference && <span>Ref: {tx.journalEntryReference}</span>}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleUnmatch(tx.id)}
                          className="h-8 text-destructive hover:bg-destructive/10 text-xs"
                        >
                          Desconciliar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {report.reconciledBankTransactions.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-xs text-muted-foreground py-6">
                        No hay movimientos conciliados aún.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-card p-6 rounded-lg border text-center space-y-4">
          <Info className="w-12 h-12 text-muted-foreground mx-auto" />
          <h3 className="text-lg font-bold">Sin información de Conciliación</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Selecciona una cuenta contable bancaria para ver el reporte comparativo e importar tus movimientos.
          </p>
        </div>
      )}

      {/* Import CSV Modal */}
      {isImportOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto p-4 animate-in fade-in duration-200">
          <div className="bg-card text-card-foreground p-6 rounded-lg w-full max-w-lg shadow-xl border relative">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-semibold">Importar Extracto Bancario</h3>
                <p className="text-xs text-muted-foreground">
                  Pega el contenido CSV del extracto de tu banco dominicano.
                </p>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 p-0" onClick={() => setIsImportOpen(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            <form onSubmit={handleImportCsv} className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="csv-data">Datos CSV (Delimitado por coma o punto y coma)</Label>
                <textarea
                  id="csv-data"
                  rows={8}
                  className="w-full rounded-md border bg-transparent p-2 font-mono text-xs focus:ring-1 focus:ring-ring focus:outline-none"
                  placeholder={defaultCsvTemplate}
                  value={csvContent}
                  onChange={(e) => setCsvContent(e.target.value)}
                  required
                />
              </div>

              {importError && (
                <p className="text-xs text-destructive font-medium">{importError}</p>
              )}

              <div className="flex justify-between pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setCsvContent(defaultCsvTemplate)}
                >
                  Cargar Plantilla Ejemplo
                </Button>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsImportOpen(false)}
                    disabled={isImporting}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" size="sm" disabled={isImporting}>
                    {isImporting ? 'Importando...' : 'Importar'}
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
