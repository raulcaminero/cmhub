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
import { BackButton } from '@/components/ui/back-button';
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
          const statusRes = await getOcrStatus({ companyId, jobId }).unwrap();
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
  const [foreignCountry, setForeignCountry] = useState('US');
  const [foreignTaxId, setForeignTaxId] = useState('');
  const [foreignPaymentType, setForeignPaymentType] = useState('01');

  const [payModalOpen, setPayModalOpen] = useState(false);
  const [expenseToPay, setExpenseToPay] = useState<Expense | null>(null);
  const [payBankId, setPayBankId] = useState('');
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);
  const [payError, setPayError] = useState('');

  async function handlePaySubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!companyId || !expenseToPay) return;
    setPayError('');

    if (!payBankId) {
      setPayError('Por favor selecciona una cuenta de banco/caja.');
      return;
    }

    try {
      await payExpense({
        companyId,
        id: expenseToPay.id,
        body: {
          bankAccountId: payBankId,
          paymentDate: payDate,
        },
      }).unwrap();

      setPayModalOpen(false);
      setExpenseToPay(null);
      setPayBankId('');
    } catch (err: any) {
      setPayError(err.data?.message || 'Error al registrar el pago.');
    }
  }

  const [searchTerm, setSearchTerm] = useState('');

  const metrics = useMemo(() => {
    if (!expenses) return { totalSum: 0, itbisSum: 0, pendingPayable: 0, count: 0 };
    let totalSum = 0;
    let itbisSum = 0;
    let pendingPayable = 0;
    let count = 0;

    for (const exp of expenses) {
      if (exp.isVoided) continue;
      count++;
      totalSum += Number(exp.amount || 0);
      itbisSum += Number(exp.itbis || 0);
      if (exp.paymentMethod === '04' && !exp.paymentDate) {
        pendingPayable += Number(exp.amount || 0);
      }
    }

    return { totalSum, itbisSum, pendingPayable, count };
  }, [expenses]);

  const filteredExpenses = useMemo(() => {
    if (!expenses) return [];
    if (!searchTerm.trim()) return expenses;
    const term = searchTerm.toLowerCase();
    return expenses.filter((exp) => {
      return (
        exp.providerName?.toLowerCase().includes(term) ||
        exp.providerRnc?.toLowerCase().includes(term) ||
        exp.ncf?.toLowerCase().includes(term) ||
        exp.expenseType?.toLowerCase().includes(term)
      );
    });
  }, [expenses, searchTerm]);

  function handleExportCsv() {
    if (!filteredExpenses || filteredExpenses.length === 0) return;

    const headers = ['Fecha', 'Proveedor', 'RNC', 'NCF', 'Tipo Gasto', 'Monto Total', 'ITBIS', 'Metodo Pago', 'Estado'];
    const rows = filteredExpenses.map((exp) => [
      `"${new Date(exp.date).toLocaleDateString()}"`,
      `"${exp.providerName.replace(/"/g, '""')}"`,
      `"${exp.providerRnc}"`,
      `"${exp.ncf}"`,
      `"${exp.expenseType}"`,
      `"${exp.amount}"`,
      `"${exp.itbis}"`,
      `"${exp.paymentMethod}"`,
      `"${exp.isVoided ? 'ANULADA' : 'REGISTRADA'}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `gastos_606_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  const bankAccounts = accounts?.filter((a) => a.code.startsWith('1101') || a.name.toLowerCase().includes('banco') || a.name.toLowerCase().includes('caja')) || [];

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  if (!companyId) {
    return (
      <Card>
        <CardContent className="pt-3.5">
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

    const cleanRnc = isForeignPayment ? providerRnc.trim() : providerRnc.replace(/\D/g, '');
    if (!isForeignPayment && cleanRnc.length !== 9 && cleanRnc.length !== 11) {
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
          bankAccountId: paymentMethod !== '04' && bankAccountId ? bankAccountId : undefined,
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
      setBankAccountId('');
      setIsForeignPayment(false);
      setForeignCountry('US');
      setForeignTaxId('');
      setForeignPaymentType('01');
    } catch (err: any) {
      setErrorMessage(err.data?.message || 'Error al registrar el gasto.');
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <BackButton fallbackHref="/cmhub/accounting" className="mb-1" />
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
              <Receipt className="w-5 h-5 text-primary shrink-0" />
              Registro de Gastos
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">Registra compras de proveedores con NCF y clasifícalos para el reporte 606.</p>
          </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button size="sm" variant="outline" className="gap-2" onClick={handleExportCsv} disabled={!expenses || expenses.length === 0}>
            <Download className="w-4 h-4" />
            Exportar CSV
          </Button>
          <Button size="sm" variant="outline" className="gap-2" onClick={() => setIsOcrOpen(true)}>
            <Camera className="w-4 h-4" />
            Escanear Factura (OCR)
          </Button>
          <Button size="sm" variant="outline" className="gap-2" onClick={() => setIsExcelOpen(true)}>
            <FileSpreadsheet className="w-4 h-4" />
            Importar Excel / CSV
          </Button>
          <Button size="sm" className="gap-2" onClick={() => setIsOpen(true)}>
            <Plus className="w-4 h-4" />
            Registrar Gasto
          </Button>
        </div>
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
          <div className="flex items-center gap-3 flex-wrap sm:justify-end">
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por proveedor, RNC, NCF..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-8 text-xs"
              />
            </div>
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground">Desde:</span>
              <Input
                type="date"
                className="h-8 text-xs w-[130px] p-2 bg-background"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground">Hasta:</span>
              <Input
                type="date"
                className="h-8 text-xs w-[130px] p-2 bg-background"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setPage(1);
                }}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground py-4">Cargando gastos...</p>
          ) : !filteredExpenses || filteredExpenses.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              {expenses.length === 0 ? 'No hay gastos registrados en esta empresa.' : 'No se encontraron gastos con el filtro aplicado.'}
            </p>
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
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredExpenses.map((exp) => {
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
                      <TableCell className={`font-mono text-sm ${exp.isVoided ? 'line-through text-muted-foreground' : ''}`}>{exp.ncf}</TableCell>
                      <TableCell className="text-xs max-w-[200px] truncate" title={typeLabel}>
                        {typeLabel}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {formatCurrency(Number(exp.amount))}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {formatCurrency(Number(exp.itbis))}
                      </TableCell>
                      <TableCell className="text-xs">
                        {exp.isVoided ? (
                          <span className="text-red-500 font-semibold">ANULADO</span>
                        ) : exp.paymentMethod === '04' ? (
                          exp.paymentDate ? (
                            <span className="text-emerald-600 font-medium">Pagado ({new Date(exp.paymentDate).toLocaleDateString()})</span>
                          ) : (
                            <span className="text-amber-600 font-medium">Pendiente Cuentas por Pagar</span>
                          )
                        ) : (
                          payLabel.split(' - ')[1] || payLabel
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {exp.paymentMethod === '04' && !exp.paymentDate && !exp.isVoided && (
                            <Button
                              type="button"
                              variant="default"
                              size="sm"
                              onClick={() => {
                                setExpenseToPay(exp);
                                setPayModalOpen(true);
                              }}
                              className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                              Pagar
                            </Button>
                          )}
                          {!exp.isVoided && (
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              onClick={async () => {
                                if (confirm(`¿Estás seguro de que deseas ANULAR el gasto NCF ${exp.ncf}? Esto reversará su impacto contable.`)) {
                                  try {
                                    await voidExpense({ companyId, id: exp.id }).unwrap();
                                  } catch (err: any) {
                                    alert(err.data?.message || 'Error al anular el gasto.');
                                  }
                                }
                              }}
                              className="h-7 text-xs bg-red-600 hover:bg-red-700 text-white"
                            >
                              Anular
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}

          {/* Pagination Controls */}
          {expenses && expenses.length > 0 && (
            <div className="flex items-center justify-between border-t pt-4 mt-4 flex-wrap gap-2">
              <span className="text-xs text-muted-foreground">
                Mostrando {expenses.length} de {totalCount} gastos (Página {page} de {totalPages})
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(p - 1, 1))}
                  disabled={page === 1}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                  disabled={page === totalPages}
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
                {paymentMethod !== '04' && bankAccounts.length > 0 && (
                  <div className="space-y-1">
                    <Label htmlFor="gasto-bank">Cuenta de Banco / Caja</Label>
                    <select
                      id="gasto-bank"
                      value={bankAccountId}
                      onChange={(e) => setBankAccountId(e.target.value)}
                      className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      <option value="">Por defecto (Caja General 1101)</option>
                      {bankAccounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.code} - {a.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
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

              <div className="flex items-center space-x-2 my-2 py-1">
                <input
                  type="checkbox"
                  id="is-foreign-payment"
                  checked={isForeignPayment}
                  onChange={(e) => setIsForeignPayment(e.target.checked)}
                  className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4"
                />
                <Label htmlFor="is-foreign-payment" className="text-sm font-semibold cursor-pointer">
                  ¿Es un pago al exterior / no residente? (Reporte 609)
                </Label>
              </div>

              {isForeignPayment && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border p-3 rounded bg-blue-50/20 dark:bg-blue-950/10">
                  <div className="space-y-1">
                    <Label htmlFor="foreign-country">Código de País</Label>
                    <Input
                      id="foreign-country"
                      placeholder="Ej. US, ES, CA"
                      value={foreignCountry}
                      onChange={(e) => setForeignCountry(e.target.value.toUpperCase())}
                      maxLength={2}
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="foreign-taxid">Tax ID / ID Tributario Extranjero</Label>
                    <Input
                      id="foreign-taxid"
                      placeholder="Ej. 12-3456789"
                      value={foreignTaxId}
                      onChange={(e) => setForeignTaxId(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="foreign-payment-type">Tipo de Renta al Exterior</Label>
                    <select
                      id="foreign-payment-type"
                      value={foreignPaymentType}
                      onChange={(e) => setForeignPaymentType(e.target.value)}
                      className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      <option value="01">01 - Honorarios / Servicios Independientes</option>
                      <option value="02">02 - Intereses</option>
                      <option value="03">03 - Regalías</option>
                      <option value="04">04 - Dividendos / Utilidades</option>
                      <option value="05">05 - Arrendamientos</option>
                      <option value="06">06 - Enajenación de Bienes</option>
                      <option value="07">07 - Seguros y Reaseguros</option>
                      <option value="08">08 - Otras Rentas</option>
                    </select>
                  </div>
                </div>
              )}

              <div className="border p-4 rounded-md space-y-4 bg-muted/30">
                <span className="text-xs font-semibold block border-b pb-1">Desglose de Montos</span>
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

      {/* Modal Registrar Pago */}
      {payModalOpen && expenseToPay && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto p-4 animate-in fade-in duration-200">
          <div className="bg-card text-card-foreground p-6 rounded-lg w-full max-w-md shadow-xl border relative">
            <h3 className="text-lg font-semibold mb-2">Registrar Pago de Gasto</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Registra el pago del gasto a crédito de <strong>{expenseToPay.providerName}</strong> (NCF <strong>{expenseToPay.ncf}</strong>) por un monto de <strong>{formatCurrency(Number(expenseToPay.amount) - Number(expenseToPay.itbisRetained) - Number(expenseToPay.isrRetained))}</strong> (neto de retenciones).
            </p>
            <form onSubmit={handlePaySubmit} className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="pay-date">Fecha de Pago</Label>
                <Input
                  id="pay-date"
                  type="date"
                  value={payDate}
                  onChange={(e) => setPayDate(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="pay-bank">Cuenta de Banco / Caja de Salida</Label>
                <select
                  id="pay-bank"
                  value={payBankId}
                  onChange={(e) => setPayBankId(e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  required
                >
                  <option value="">Seleccionar cuenta...</option>
                  {bankAccounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.code} - {a.name}
                    </option>
                  ))}
                </select>
              </div>

              {payError && (
                <p className="text-xs text-destructive font-medium">{payError}</p>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setPayModalOpen(false);
                    setExpenseToPay(null);
                    setPayError('');
                  }}
                  disabled={isPaying}
                >
                  Cancelar
                </Button>
                <Button type="submit" size="sm" disabled={isPaying}>
                  {isPaying ? (
                    <>
                      <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                      Procesando...
                    </>
                  ) : (
                    'Confirmar Pago'
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Importar Gastos desde Excel/CSV */}
      {isExcelOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto p-4 animate-in fade-in duration-200">
          <div className="bg-card text-card-foreground p-6 rounded-lg w-full max-w-lg shadow-xl border relative my-8">
            <h3 className="text-lg font-semibold mb-2">Importar Gastos desde Excel / CSV</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Carga un archivo CSV o pega el texto delimitado por comas para registrar tus compras masivamente.
            </p>
            
            <form onSubmit={handleCsvImport} className="space-y-4">
              <div className="border border-dashed border-muted rounded-lg p-4 bg-muted/20 text-center flex flex-col items-center gap-2">
                <Upload className="w-8 h-8 text-muted-foreground" />
                <Label htmlFor="csv-expense-file" className="cursor-pointer font-semibold hover:underline text-primary text-sm">
                  Haz clic para subir archivo CSV
                </Label>
                <span className="text-[10px] text-muted-foreground">O arrastra el archivo aquí</span>
                <Input
                  id="csv-expense-file"
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <Label htmlFor="csv-expense-text">Contenido o Vista Previa del CSV</Label>
                  <span className="text-[10px] text-muted-foreground font-mono">Format: Fecha,RNC,Nombre,NCF,Metodo,TipoGasto,Monto,ITBIS</span>
                </div>
                <textarea
                  id="csv-expense-text"
                  rows={6}
                  placeholder="Ejemplo:&#10;Fecha,RNC,Nombre,NCF,Metodo,TipoGasto,Monto,ITBIS&#10;2026-07-17,131792751,CLARO DOMINICANA,B0100000105,02,02,2360.00,360.00"
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
                  href="data:text/csv;charset=utf-8,Fecha,RNC,Nombre,NCF,Metodo,TipoGasto,Monto,ITBIS%0A2026-07-17,131792751,CLARO DOMINICANA,B0100000105,02,02,2360.00,360.00" 
                  download="plantilla_gastos.csv"
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
                      'Importar Gastos'
                    )}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Escaneo Factura (OCR) */}
      {isOcrOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto p-4 animate-in fade-in duration-200">
          <div className="bg-card text-card-foreground p-6 rounded-lg w-full max-w-md shadow-xl border relative">
            <h3 className="text-lg font-semibold mb-2">Escanear Factura / Comprobante (OCR)</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Sube la imagen o el PDF de tu factura de compra. El sistema impulsado por Google Document AI leerá automáticamente los datos.
            </p>
            
            <div className="border border-dashed border-primary rounded-lg p-6 bg-muted/20 text-center flex flex-col items-center gap-3">
              <Camera className="w-10 h-10 text-primary animate-pulse" />
              {isScanning || isPollingOcr ? (
                <div className="space-y-2">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
                  <p className="text-sm font-medium">Analizando imagen con Inteligencia Artificial...</p>
                  <p className="text-[10px] text-muted-foreground">Extrayendo RNC, NCF, montos y fecha.</p>
                </div>
              ) : (
                <>
                  <Label htmlFor="ocr-file" className="cursor-pointer font-semibold hover:underline text-primary text-sm">
                    Sube una foto o PDF de la factura
                  </Label>
                  <span className="text-[10px] text-muted-foreground">Formatos soportados: JPG, PNG, PDF</span>
                  <Input
                    id="ocr-file"
                    type="file"
                    accept="image/*,.pdf"
                    className="hidden"
                    onChange={handleOcrUpload}
                  />
                </>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsOcrOpen(false);
                }}
                disabled={isScanning}
              >
                Cerrar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
