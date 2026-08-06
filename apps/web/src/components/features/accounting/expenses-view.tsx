'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAppSelector } from '@/store/hooks';
import { useCurrency } from '@/hooks/use-company';
import { useGetExpensesQuery, useCreateExpenseMutation, usePayExpenseMutation, useVoidExpenseMutation, useImportExpensesMutation, useImportOcrMutation, useLazyGetOcrStatusQuery, Expense } from '@/services/expenses.api';
import { useGetContactsQuery } from '@/services/contacts.api';
import { useGetAccountsQuery } from '@/services/accounting.api';
import { AccountType } from '@cmhub/shared-types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Loader2, FileSpreadsheet, Upload, Camera, Info, Receipt, Search, Download, CreditCard, ShoppingBag, DollarSign, TrendingDown, CheckCircle2 } from 'lucide-react';
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

export function ExpensesView() {
  const companyId = useAppSelector((state) => state.company.active?.id);
  const [mounted, setMounted] = useState(false);
  const formatCurrency = useCurrency();

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  
  const getInitialStartDate = () => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  };
  const [startDate, setStartDate] = useState(getInitialStartDate());
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  const { data: expensesData, isLoading } = useGetExpensesQuery(
    { companyId: companyId!, page, limit, startDate, endDate },
    { skip: !companyId || !mounted },
  );
  const expenses = expensesData?.data || [];
  const totalCount = expensesData?.totalCount || 0;
  const totalPages = Math.ceil(totalCount / limit) || 1;

  const { data: contacts } = useGetContactsQuery(
    { companyId: companyId! },
    { skip: !companyId || !mounted },
  );

  const { data: accounts } = useGetAccountsQuery(
    { companyId: companyId!, type: AccountType.ASSET },
    { skip: !companyId || !mounted },
  );

  const [createExpense, { isLoading: isCreating }] = useCreateExpenseMutation();
  const [payExpense, { isLoading: isPaying }] = usePayExpenseMutation();
  const [voidExpense, { isLoading: isVoiding }] = useVoidExpenseMutation();
  const [importExpenses, { isLoading: isImporting }] = useImportExpensesMutation();
  const [importOcr, { isLoading: isScanning }] = useImportOcrMutation();
  const [getOcrStatus] = useLazyGetOcrStatusQuery();

  const [isPollingOcr, setIsPollingOcr] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isExcelOpen, setIsExcelOpen] = useState(false);
  const [isOcrOpen, setIsOcrOpen] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [importError, setImportError] = useState('');

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
  const [bankAccountId, setBankAccountId] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Foreign payment states
  const [isForeignPayment, setIsForeignPayment] = useState(false);
  const [foreignCountry, setForeignCountry] = useState('US');
  const [foreignTaxId, setForeignTaxId] = useState('');
  const [foreignPaymentType, setForeignPaymentType] = useState('01');

  const [payModalOpen, setPayModalOpen] = useState(false);
  const [expenseToPay, setExpenseToPay] = useState<Expense | null>(null);
  const [payBankId, setPayBankId] = useState('');
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);
  const [payError, setPayError] = useState('');

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
      if (parts.length < 7) continue;

      const dateVal = parts[0];
      const rncVal = parts[1];
      const nameVal = parts[2];
      const ncfVal = parts[3];
      const paymentVal = parts[4];
      const typeVal = parts[5];
      const amountVal = Number(parts[6]);
      const itbisVal = parts[7] ? Number(parts[7]) : 0;
      const itbisRetVal = parts[8] ? Number(parts[8]) : 0;
      const isrRetVal = parts[9] ? Number(parts[9]) : 0;

      if (!dateVal || !rncVal || !nameVal || !ncfVal || !paymentVal || !typeVal || isNaN(amountVal)) {
        setImportError(`Fila ${i + 1} inválida. Verifica los datos.`);
        return;
      }

      payload.push({
        providerRnc: rncVal,
        providerName: nameVal,
        ncf: ncfVal,
        expenseType: typeVal,
        date: new Date(dateVal).toISOString().split('T')[0],
        amount: amountVal,
        itbis: itbisVal,
        itbisRetained: itbisRetVal,
        isrRetained: isrRetVal,
        paymentMethod: paymentVal,
      });
    }

    try {
      await importExpenses({
        companyId,
        body: payload,
      }).unwrap();
      setIsExcelOpen(false);
      setCsvText('');
    } catch (err: any) {
      setImportError(err.data?.message || 'Error al importar los gastos.');
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

  async function handleOcrUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !companyId) return;

    setErrorMessage('');
    const formData = new FormData();
    formData.append('file', file);

    try {
      setIsPollingOcr(true);
      const uploadRes = await importOcr({
        companyId,
        body: formData,
      }).unwrap();

      const jobId = uploadRes.jobId;

      const pollInterval = setInterval(async () => {
        try {
          const statusRes = await getOcrStatus({ companyId, jobId: jobId! }).unwrap();
          if (statusRes.status === 'completed' || statusRes.status === 'finished') {
            clearInterval(pollInterval);
            setIsPollingOcr(false);
            
            const result = statusRes.result;
            if (result) {
              setProviderRnc(result.providerRnc);
              setProviderName(result.providerName);
              setNcf(result.ncf);
              setExpenseType(result.expenseType);
              setAmount(result.amount);
              setItbis(result.itbis);
              setDate(new Date(result.date).toISOString().split('T')[0]);
              setIsOcrOpen(false);
              setIsOpen(true);
            } else {
              alert('Error al leer el contenido de la factura.');
            }
          } else if (statusRes.status === 'failed') {
            clearInterval(pollInterval);
            setIsPollingOcr(false);
            alert(statusRes.result || 'Error durante el análisis del documento.');
          }
        } catch (err: any) {
          clearInterval(pollInterval);
          setIsPollingOcr(false);
          alert('Error de conexión al consultar estado del escaneo.');
        }
      }, 1000);

    } catch (err: any) {
      setIsPollingOcr(false);
      alert(err.data?.message || 'Error al subir la factura para escaneo.');
    }
  }

  async function handlePaySubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!companyId || !expenseToPay) return;

    setPayError('');
    try {
      await payExpense({
        companyId,
        id: expenseToPay.id,
        body: {
          bankAccountId: (payBankId || undefined) as any,
          paymentDate: payDate,
        },
      }).unwrap();
      setPayModalOpen(false);
      setExpenseToPay(null);
    } catch (err: any) {
      setPayError(err.data?.message || 'Error al registrar el pago del gasto.');
    }
  }

  async function handleVoid(expense: Expense) {
    if (!companyId) return;
    if (!confirm(`¿Estás seguro de anular el gasto NCF ${expense.ncf}? Esta acción no se puede deshacer.`)) return;

    try {
      await voidExpense({ companyId, id: expense.id }).unwrap();
    } catch (err: any) {
      alert(err.data?.message || 'Error al anular el gasto.');
    }
  }

  const handleExportCsv = () => {
    if (!expenses || expenses.length === 0) return;

    const headers = [
      'RNC/Cédula Proveedor',
      'Tipo Bienes y Servicios (Tipo Gasto)',
      'NCF',
      'NCF Modificado',
      'Fecha Comprobante',
      'Fecha Pago',
      'Monto Facturado',
      'ITBIS Facturado',
      'ITBIS Retenido',
      'Monto Retención Renta (ISR)',
      'ISR Tipo Retención',
      'Forma de Pago',
    ];

    const rows = expenses.map((e: any) => [
      `"${e.providerRnc || ''}"`,
      `"${e.expenseType || '02'}"`,
      `"${e.ncf || ''}"`,
      `"${e.modifiedNcf || ''}"`,
      `"${e.date ? new Date(e.date).toISOString().split('T')[0] : ''}"`,
      `"${e.paymentDate ? new Date(e.paymentDate).toISOString().split('T')[0] : (e.date ? new Date(e.date).toISOString().split('T')[0] : '')}"`,
      e.amount || 0,
      e.itbis || 0,
      e.itbisRetained || 0,
      e.isrRetained || 0,
      `"${e.isrCategory || ''}"`,
      `"${e.paymentMethod || '02'}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Reporte_606_Gastos_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  const metrics = useMemo(() => {
    if (!expenses || expenses.length === 0) {
      return { totalSum: 0, itbisSum: 0, count: 0, pendingPayable: 0 };
    }
    const valid = expenses.filter((e) => !e.isVoided);
    const totalSum = valid.reduce((sum, e) => sum + Number(e.amount), 0);
    const itbisSum = valid.reduce((sum, e) => sum + Number(e.itbis || 0), 0);
    const pendingPayable = valid
      .filter((e: any) => e.paymentMethod === '04' && !e.isPaid)
      .reduce((sum, e) => sum + Number(e.amount), 0);

    return { totalSum, itbisSum, count: valid.length, pendingPayable };
  }, [expenses]);

  const handleSelectContact = (contactId: string) => {
    const selected = contacts?.find((c) => c.id === contactId);
    if (selected) {
      setProviderRnc(selected.rnc || '');
      setProviderName(selected.name || '');
    }
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!companyId) return;
    setErrorMessage('');

    if (isForeignPayment && (!foreignCountry || !foreignTaxId)) {
      setErrorMessage('Para pagos al exterior debes ingresar el País y el Tax ID del proveedor.');
      return;
    }

    try {
      await createExpense({
        companyId,
        body: {
          providerRnc,
          providerName,
          ncf,
          expenseType,
          date,
          amount: Number(amount),
          itbis: Number(itbis),
          itbisRetained: Number(itbisRetained),
          isrRetained: Number(isrRetained),
          paymentMethod,
          bankAccountId: bankAccountId || undefined,
          isForeignPayment,
          foreignCountry: isForeignPayment ? foreignCountry : undefined,
          foreignTaxId: isForeignPayment ? foreignTaxId : undefined,
          foreignPaymentType: isForeignPayment ? foreignPaymentType : undefined,
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
      setIsForeignPayment(false);
      setForeignCountry('US');
      setForeignTaxId('');
      setForeignPaymentType('01');
    } catch (err: any) {
      setErrorMessage(err.data?.message || 'Error al registrar el gasto.');
    }
  }

  return (
    <div className="space-y-3">
      {/* Action Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between min-h-[32px] gap-3">
        <p className="text-xs text-muted-foreground">
          Registra compras de proveedores con NCF y clasifícalos para la DGII.
        </p>
        <div className="flex items-center gap-2 flex-wrap justify-end">
        <Button
          size="sm"
          className="gap-2 text-xs font-semibold shadow-xs"
          onClick={handleExportCsv}
          disabled={!expenses || expenses.length === 0}
        >
          <Download className="w-3.5 h-3.5" />
          Exportar CSV (606)
        </Button>
        <Button
          size="sm"
          className="gap-2 text-xs font-semibold shadow-xs"
          onClick={() => setIsOcrOpen(true)}
        >
          <Camera className="w-3.5 h-3.5" />
          Escanear OCR
        </Button>
        <Button
          size="sm"
          className="gap-2 text-xs font-semibold shadow-xs"
          onClick={() => setIsExcelOpen(true)}
        >
          <FileSpreadsheet className="w-3.5 h-3.5" />
          Importar Excel
        </Button>
        <Button size="sm" className="gap-2 text-xs font-semibold shadow-xs" onClick={() => setIsOpen(true)}>
          <Plus className="w-3.5 h-3.5" />
          Nuevo Gasto
        </Button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-1 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">Total Gastos (Mes)</CardTitle>
            <TrendingDown className="w-4 h-4 text-rose-500" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold tracking-tight text-card-foreground">{formatCurrency(metrics.totalSum)}</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">{metrics.count} compras/gastos registrados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-1 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">ITBIS Adelantado (606)</CardTitle>
            <Receipt className="w-4 h-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold tracking-tight text-card-foreground">{formatCurrency(metrics.itbisSum)}</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Crédito fiscal generado</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-1 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">Cuentas por Pagar</CardTitle>
            <CreditCard className="w-4 h-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold tracking-tight text-card-foreground">{formatCurrency(metrics.pendingPayable)}</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Compras a crédito pendientes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-1 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">Compras Inventario (09)</CardTitle>
            <ShoppingBag className="w-4 h-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold tracking-tight text-card-foreground">{metrics.count > 0 ? expenses.filter(e => e.expenseType === '09' && !e.isVoided).length : 0}</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Ítems de costo de ventas</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 py-2.5 px-4">
          <CardTitle>Historial de Compras y Gastos (606)</CardTitle>
          
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5">
              <Label htmlFor="startDate" className="text-xs font-medium">Desde:</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-8 text-xs w-36"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <Label htmlFor="endDate" className="text-xs font-medium">Hasta:</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-8 text-xs w-36"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Proveedor</TableHead>
                <TableHead>NCF</TableHead>
                <TableHead>Tipo de Gasto</TableHead>
                <TableHead className="text-right">Monto</TableHead>
                <TableHead className="text-right">ITBIS</TableHead>
                <TableHead className="text-center">Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                    Cargando gastos...
                  </TableCell>
                </TableRow>
              ) : expenses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No se encontraron gastos registrados en este período.
                  </TableCell>
                </TableRow>
              ) : (
                expenses.map((expense) => {
                  const typeLabel = EXPENSE_TYPES.find((t) => t.code === expense.expenseType)?.label || expense.expenseType;
                  return (
                    <TableRow key={expense.id} className={expense.isVoided ? 'opacity-50 line-through bg-muted/20' : ''}>
                      <TableCell className="text-xs">{new Date(expense.date).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <div className="font-medium text-xs">{expense.providerName}</div>
                        <div className="text-[11px] text-muted-foreground">{expense.providerRnc}</div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{expense.ncf}</TableCell>
                      <TableCell className="text-xs">{typeLabel}</TableCell>
                      <TableCell className="text-right font-medium text-xs">{formatCurrency(expense.amount)}</TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground">{formatCurrency(expense.itbis)}</TableCell>
                      <TableCell className="text-center text-xs">
                        {expense.isVoided ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                            Anulado
                          </span>
                        ) : expense.paymentMethod === '04' && !(expense as any).isPaid ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                            Por Pagar
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                            Pagado
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-xs">
                        <div className="flex items-center justify-end gap-1">
                          {expense.paymentMethod === '04' && !(expense as any).isPaid && !expense.isVoided && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2 text-[11px] gap-1 text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/50"
                              onClick={() => {
                                setExpenseToPay(expense);
                                setPayModalOpen(true);
                              }}
                            >
                              <DollarSign className="w-3 h-3" />
                              Pagar
                            </Button>
                          )}
                          {!expense.isVoided && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-[11px] text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/50"
                              onClick={() => handleVoid(expense)}
                              disabled={isVoiding}
                            >
                              Anular
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>

          {/* Pagination Footer */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border">
              <div className="text-xs text-muted-foreground">
                Mostrando página {page} de {totalPages} ({totalCount} registros en total)
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="h-8 text-xs"
                >
                  Anterior
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="h-8 text-xs"
                >
                  Siguiente
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal Registrar Gasto */}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-background rounded-lg border border-border shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-4">
            <h2 className="text-lg font-bold">Registrar Nuevo Gasto / Compra NCF</h2>

            {errorMessage && (
              <div className="p-3 text-xs bg-rose-100 text-rose-700 rounded border border-rose-200">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="contactSelect">Seleccionar Contacto (Opcional)</Label>
                  <select
                    id="contactSelect"
                    onChange={(e) => handleSelectContact(e.target.value)}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs"
                  >
                    <option value="">-- Seleccionar de Contactos --</option>
                    {contacts?.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.rnc || 'Sin RNC'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label htmlFor="providerName">Nombre o Razón Social Proveedor *</Label>
                  <Input
                    id="providerName"
                    value={providerName}
                    onChange={(e) => setProviderName(e.target.value)}
                    required
                    placeholder="Ej. Claro Dominicana"
                  />
                </div>

                <div>
                  <Label htmlFor="providerRnc">RNC / Cédula Proveedor *</Label>
                  <Input
                    id="providerRnc"
                    value={providerRnc}
                    onChange={(e) => setProviderRnc(e.target.value)}
                    required
                    placeholder="Ej. 101010101"
                  />
                </div>

                <div>
                  <Label htmlFor="ncf">NCF (Comprobante Fiscal) *</Label>
                  <Input
                    id="ncf"
                    value={ncf}
                    onChange={(e) => setNcf(e.target.value)}
                    required
                    placeholder="Ej. B0100000001"
                  />
                </div>

                <div>
                  <Label htmlFor="expenseType">Tipo de Bienes y Servicios (606) *</Label>
                  <select
                    id="expenseType"
                    value={expenseType}
                    onChange={(e) => setExpenseType(e.target.value)}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs"
                  >
                    {EXPENSE_TYPES.map((t) => (
                      <option key={t.code} value={t.code}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label htmlFor="date">Fecha Comprobante *</Label>
                  <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
                </div>

                <div>
                  <Label htmlFor="amount">Monto Total Facturado *</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    value={amount || ''}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="itbis">ITBIS Facturado</Label>
                  <Input
                    id="itbis"
                    type="number"
                    step="0.01"
                    value={itbis || ''}
                    onChange={(e) => setItbis(Number(e.target.value))}
                  />
                </div>

                <div>
                  <Label htmlFor="paymentMethod">Forma de Pago *</Label>
                  <select
                    id="paymentMethod"
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs"
                  >
                    {PAYMENT_METHODS.map((m) => (
                      <option key={m.code} value={m.code}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>

                {paymentMethod !== '04' && (
                  <div>
                    <Label htmlFor="bankAccountId">Cuenta de Banco / Caja de Origen</Label>
                    <select
                      id="bankAccountId"
                      value={bankAccountId}
                      onChange={(e) => setBankAccountId(e.target.value)}
                      className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs"
                    >
                      <option value="">-- Pago General --</option>
                      {accounts?.map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.code} - {acc.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Checkbox Pago al Exterior */}
              <div className="border-t border-border pt-3 space-y-3">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isForeignPayment"
                    checked={isForeignPayment}
                    onChange={(e) => setIsForeignPayment(e.target.checked)}
                    className="rounded border-input text-primary"
                  />
                  <Label htmlFor="isForeignPayment" className="text-xs font-semibold cursor-pointer">
                    ¿Es un Pago o Compra Realizada al Exterior (Proveedores no residentes)?
                  </Label>
                </div>

                {isForeignPayment && (
                  <div className="p-3 bg-muted/40 rounded-md border border-border space-y-3">
                    <p className="text-[11px] text-muted-foreground">
                      Los pagos al exterior requieren información adicional para la retención del ISR y el reporte 606.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <Label htmlFor="foreignCountry">País de Origen *</Label>
                        <select
                          id="foreignCountry"
                          value={foreignCountry}
                          onChange={(e) => setForeignCountry(e.target.value)}
                          className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs"
                        >
                          <option value="US">Estados Unidos (US)</option>
                          <option value="ES">España (ES)</option>
                          <option value="MX">México (MX)</option>
                          <option value="CO">Colombia (CO)</option>
                          <option value="PAN">Panamá (PAN)</option>
                          <option value="OTROS">Otros Países</option>
                        </select>
                      </div>

                      <div>
                        <Label htmlFor="foreignTaxId">Tax ID / Identificación Fiscal *</Label>
                        <Input
                          id="foreignTaxId"
                          value={foreignTaxId}
                          onChange={(e) => setForeignTaxId(e.target.value)}
                          placeholder="Ej. EIN / SSN / NIF"
                          required={isForeignPayment}
                        />
                      </div>

                      <div>
                        <Label htmlFor="foreignPaymentType">Tipo de Pago Exterior</Label>
                        <select
                          id="foreignPaymentType"
                          value={foreignPaymentType}
                          onChange={(e) => setForeignPaymentType(e.target.value)}
                          className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs"
                        >
                          <option value="01">01 - Servicios Renta Presunta</option>
                          <option value="02">02 - Intereses y Financiamiento</option>
                          <option value="03">03 - Licencias y Software / Regalías</option>
                          <option value="04">04 - Otros Pagos</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isCreating}>
                  {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Guardar Gasto'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Pagar Gasto Pendiente */}
      {payModalOpen && expenseToPay && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-background rounded-lg border border-border shadow-lg max-w-md w-full p-6 space-y-4">
            <h2 className="text-lg font-bold">Registrar Pago a Proveedor</h2>
            <p className="text-xs text-muted-foreground">
              Proveedor: <strong>{expenseToPay.providerName}</strong> ({expenseToPay.providerRnc})<br />
              NCF: <span className="font-mono">{expenseToPay.ncf}</span> | Monto: <strong>{formatCurrency(expenseToPay.amount)}</strong>
            </p>

            {payError && (
              <div className="p-3 text-xs bg-rose-100 text-rose-700 rounded border border-rose-200">
                {payError}
              </div>
            )}

            <form onSubmit={handlePaySubmit} className="space-y-4">
              <div>
                <Label htmlFor="payDate">Fecha del Pago *</Label>
                <Input
                  id="payDate"
                  type="date"
                  value={payDate}
                  onChange={(e) => setPayDate(e.target.value)}
                  required
                />
              </div>

              <div>
                <Label htmlFor="payBankId">Cuenta de Origen de Fondos</Label>
                <select
                  id="payBankId"
                  value={payBankId}
                  onChange={(e) => setPayBankId(e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs"
                >
                  <option value="">-- Cuenta General / Caja --</option>
                  {accounts?.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.code} - {acc.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <Button type="button" variant="outline" onClick={() => setPayModalOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isPaying} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  {isPaying ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirmar Pago'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Escaneo OCR */}
      {isOcrOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-background rounded-lg border border-border shadow-lg max-w-md w-full p-6 space-y-4">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Camera className="w-5 h-5 text-primary" />
              Escaneo Inteligente de Facturas (OCR)
            </h2>
            <p className="text-xs text-muted-foreground">
              Sube la imagen o foto (JPG, PNG) de tu factura o recibo. El sistema extraerá automáticamente el RNC, NCF, Fecha y Montos para autocompletar el registro.
            </p>

            <div className="border-2 border-dashed border-border rounded-lg p-6 text-center space-y-3">
              {isPollingOcr ? (
                <div className="py-4 space-y-2">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
                  <p className="text-xs font-semibold">Procesando y analizando factura con Inteligencia Artificial...</p>
                  <p className="text-[11px] text-muted-foreground">Por favor espera unos segundos.</p>
                </div>
              ) : (
                <>
                  <Upload className="w-8 h-8 mx-auto text-muted-foreground" />
                  <div>
                    <label htmlFor="ocrFileInput" className="cursor-pointer font-semibold text-primary hover:underline text-xs">
                      Haz clic para seleccionar una factura
                    </label>
                    <input
                      id="ocrFileInput"
                      type="file"
                      accept="image/*"
                      onChange={handleOcrUpload}
                      className="hidden"
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground">Soporta imágenes JPG, PNG</p>
                </>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <Button type="button" variant="outline" onClick={() => setIsOcrOpen(false)} disabled={isPollingOcr}>
                Cerrar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Importar Excel / CSV */}
      {isExcelOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-background rounded-lg border border-border shadow-lg max-w-lg w-full p-6 space-y-4">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-primary" />
              Carga Masiva de Gastos (CSV / Excel)
            </h2>
            <p className="text-xs text-muted-foreground">
              Puedes cargar múltiples compras y gastos desde un archivo CSV o pegando directamente los datos.
            </p>

            {importError && (
              <div className="p-3 text-xs bg-rose-100 text-rose-700 rounded border border-rose-200">
                {importError}
              </div>
            )}

            <form onSubmit={handleCsvImport} className="space-y-4">
              <div>
                <Label htmlFor="csvFile">Seleccionar Archivo CSV</Label>
                <Input id="csvFile" type="file" accept=".csv, .txt" onChange={handleFileChange} className="text-xs" />
              </div>

              <div>
                <Label htmlFor="csvText">O Pega los datos en formato CSV (Fecha, RNC, Nombre, NCF, FormaPago, TipoGasto, Monto, ITBIS, ITBISRet, ISRRet)</Label>
                <textarea
                  id="csvText"
                  rows={5}
                  value={csvText}
                  onChange={(e) => setCsvText(e.target.value)}
                  placeholder="Fecha,RNC,Nombre,NCF,FormaPago,TipoGasto,Monto,ITBIS,ITBISRet,ISRRet&#10;2026-05-10,101010101,Claro,B0100000001,02,02,1500.00,270.00,0,0"
                  className="w-full rounded-md border border-input bg-background p-2 text-xs font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <Button type="button" variant="outline" onClick={() => setIsExcelOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isImporting}>
                  {isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Procesar Importación'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
