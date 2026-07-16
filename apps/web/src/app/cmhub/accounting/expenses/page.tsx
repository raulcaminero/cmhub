'use client';

import { useState, useEffect } from 'react';
import { useAppSelector } from '@/store/hooks';
import { useGetExpensesQuery, useCreateExpenseMutation } from '@/services/expenses.api';
import { useGetContactsQuery } from '@/services/contacts.api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Loader2 } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const EXPENSE_TYPES = [
  { code: '01', label: '01 - Gastos de Personal' },
  { code: '02', label: '02 - Gastos por Trabajos, Suministros y Servicios' },
  { code: '03', label: '03 - Arrendamientos' },
  { code: '04', label: '04 - Gastos de Activos Fijos' },
  { code: '05', label: '05 - Gastos de Representación' },
  { code: '06', label: '06 - Otras Deducciones Admitidas' },
  { code: '07', label: '07 - Gastos Financieros' },
  { code: '08', label: '08 - Gastos Extraordinarios' },
  { code: '09', label: '09 - Compras y Gastos que Formarán Parte del Costo de Ventas' },
  { code: '10', label: '10 - Adquisiciones de Activos' },
  { code: '11', label: '11 - Gastos de Seguros' },
];

const PAYMENT_METHODS = [
  { code: '01', label: '01 - Efectivo' },
  { code: '02', label: '02 - Cheques/Transferencias/Depósitos' },
  { code: '03', label: '03 - Tarjeta de Crédito/Débito' },
  { code: '04', label: '04 - Compra a Crédito (Cuentas por Pagar)' },
  { code: '05', label: '05 - Permuta' },
  { code: '06', label: '06 - Notas de Crédito' },
  { code: '07', label: '07 - Mixto' },
];

export default function AccountingExpensesPage() {
  const companyId = useAppSelector((state) => state.company.active?.id);
  const [mounted, setMounted] = useState(false);

  const { data: expenses, isLoading } = useGetExpensesQuery(
    { companyId: companyId! },
    { skip: !companyId || !mounted },
  );

  const { data: contacts } = useGetContactsQuery(
    { companyId: companyId! },
    { skip: !companyId || !mounted },
  );

  const [createExpense, { isLoading: isCreating }] = useCreateExpenseMutation();

  const [isOpen, setIsOpen] = useState(false);
  const [providerRnc, setProviderRnc] = useState('');
  const [providerName, setProviderName] = useState('');
  const [ncf, setNcf] = useState('');
  const [expenseType, setExpenseType] = useState('02');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [amount, setAmount] = useState(0);
  const [itbis, setItbis] = useState(0);
  const [itbisRetained, setItbisRetained] = useState(0);
  const [isrRetained, setIsrRetained] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('02');
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
          <p className="text-muted-foreground text-sm">Selecciona una empresa para ver los gastos.</p>
        </CardContent>
      </Card>
    );
  }

  function handleRncChange(val: string) {
    setProviderRnc(val);
    const clean = val.replace(/\D/g, '');
    const found = contacts?.find((c) => c.rnc === clean);
    if (found) {
      setProviderName(found.name);
    }
  }

  // Auto-calculate standard DR ITBIS (18%) as suggestion
  function handleAmountChange(val: number) {
    setAmount(val);
    // Suggest standard ITBIS (18%) but allow modification
    setItbis(Number((val * 0.18).toFixed(2)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!companyId) return;
    setErrorMessage('');

    const cleanRnc = providerRnc.replace(/\D/g, '');
    if (cleanRnc.length !== 9 && cleanRnc.length !== 11) {
      setErrorMessage('El RNC del proveedor debe tener 9 o 11 dígitos.');
      return;
    }

    const cleanNcf = ncf.trim().toUpperCase();
    // Validate NCF format (B0100000123 / E310000000123 etc.)
    const ncfRegex = /^(B|E)\d{10,12}$/i;
    if (!ncfRegex.test(cleanNcf)) {
      setErrorMessage('El formato de NCF es inválido. Debe ser una Serie (B o E) seguida de 10 o 12 dígitos.');
      return;
    }

    try {
      await createExpense({
        companyId,
        body: {
          providerRnc: cleanRnc,
          providerName,
          ncf: cleanNcf,
          expenseType,
          date,
          amount: Number(amount),
          itbis: Number(itbis),
          itbisRetained: Number(itbisRetained),
          isrRetained: Number(isrRetained),
          paymentMethod,
        },
      }).unwrap();
      
      setIsOpen(false);
      setProviderRnc('');
      setProviderName('');
      setNcf('');
      setAmount(0);
      setItbis(0);
      setItbisRetained(0);
      setIsrRetained(0);
    } catch (err: any) {
      setErrorMessage(err.data?.message || 'Error al registrar el gasto.');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Registro de Gastos</h1>
          <p className="text-muted-foreground">Registra compras de proveedores con NCF y clasifícalos para el reporte 606.</p>
        </div>
        <Button size="sm" className="gap-2" onClick={() => setIsOpen(true)}>
          <Plus className="w-4 h-4" />
          Registrar Gasto
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Historial de Compras y Gastos (606)</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Cargando gastos...</p>
          ) : !expenses || expenses.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No hay gastos registrados en esta empresa.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Proveedor (RNC)</TableHead>
                  <TableHead>NCF</TableHead>
                  <TableHead>Tipo Gasto</TableHead>
                  <TableHead className="text-right">Monto Total</TableHead>
                  <TableHead className="text-right">ITBIS</TableHead>
                  <TableHead>Método</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.map((exp) => {
                  const typeLabel = EXPENSE_TYPES.find((t) => t.code === exp.expenseType)?.label || exp.expenseType;
                  const payLabel = PAYMENT_METHODS.find((p) => p.code === exp.paymentMethod)?.label || exp.paymentMethod;
                  
                  return (
                    <TableRow key={exp.id}>
                      <TableCell className="text-sm">
                        {new Date(exp.date).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-sm">{exp.providerName}</div>
                        <div className="text-xs text-muted-foreground font-mono">{exp.providerRnc}</div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{exp.ncf}</TableCell>
                      <TableCell className="text-xs max-w-[200px] truncate" title={typeLabel}>
                        {typeLabel}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        RD$ {Number(exp.amount).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        RD$ {Number(exp.itbis).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-xs">
                        {payLabel.split(' - ')[1] || payLabel}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Modal Registrar Gasto */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto p-4 animate-in fade-in duration-200">
          <div className="bg-card text-card-foreground p-6 rounded-lg w-full max-w-2xl shadow-xl border relative my-8">
            <h3 className="text-lg font-semibold mb-2">Registrar Gasto del Proveedor</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Ingresa los datos fiscales del comprobante de compra para procesar el reporte y la contabilidad.
            </p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="provider-rnc">RNC o Cédula del Proveedor</Label>
                  <Input
                    id="provider-rnc"
                    placeholder="Ej. 131234567 (9 u 11 dígitos)"
                    value={providerRnc}
                    onChange={(e) => handleRncChange(e.target.value)}
                    list="provider-rnc-list"
                    required
                  />
                  <datalist id="provider-rnc-list">
                    {contacts
                      ?.filter((c) => c.type === 'PROVIDER' || c.type === 'BOTH')
                      .map((c) => (
                        <option key={c.id} value={c.rnc}>
                          {c.name}
                        </option>
                      ))}
                  </datalist>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="provider-name">Razón Social del Proveedor</Label>
                  <Input
                    id="provider-name"
                    placeholder="Ej. Distribuidora Dominicana SRL"
                    value={providerName}
                    onChange={(e) => setProviderName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="gasto-ncf">NCF de Compra (Comprobante)</Label>
                  <Input
                    id="gasto-ncf"
                    placeholder="Ej. B0100000123"
                    value={ncf}
                    onChange={(e) => setNcf(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="gasto-date">Fecha de Emisión</Label>
                  <Input
                    id="gasto-date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="gasto-payment">Forma de Pago (DGII)</Label>
                  <select
                    id="gasto-payment"
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    {PAYMENT_METHODS.map((p) => (
                      <option key={p.code} value={p.code}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1 col-span-2">
                  <Label htmlFor="gasto-type">Tipo de Gasto (Clasificación DGII 606)</Label>
                  <select
                    id="gasto-type"
                    value={expenseType}
                    onChange={(e) => setExpenseType(e.target.value)}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    {EXPENSE_TYPES.map((t) => (
                      <option key={t.code} value={t.code}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="border p-4 rounded-md space-y-4 bg-muted/30">
                <span className="text-xs font-semibold block border-b pb-1">Desglose de Montos (RD$)</span>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="gasto-total">Monto Total (Con ITBIS)</Label>
                    <Input
                      id="gasto-total"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={amount || ''}
                      onChange={(e) => handleAmountChange(Number(e.target.value))}
                      required
                      min={0.01}
                      className="font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="gasto-itbis">ITBIS Facturado</Label>
                    <Input
                      id="gasto-itbis"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={itbis || ''}
                      onChange={(e) => setItbis(Number(e.target.value))}
                      required
                      className="font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="gasto-itbis-ret">ITBIS Retenido</Label>
                    <Input
                      id="gasto-itbis-ret"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={itbisRetained || ''}
                      onChange={(e) => setItbisRetained(Number(e.target.value))}
                      className="font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="gasto-isr-ret">Retención de ISR</Label>
                    <Input
                      id="gasto-isr-ret"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={isrRetained || ''}
                      onChange={(e) => setIsrRetained(Number(e.target.value))}
                      className="font-mono"
                    />
                  </div>
                </div>
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
                    'Guardar Gasto'
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
