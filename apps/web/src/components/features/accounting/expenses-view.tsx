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
import { Plus, Loader2, FileSpreadsheet, Upload, Camera, Info, Receipt, Search, Download, CreditCard, ShoppingBag, DollarSign, TrendingDown, CheckCircle2, X, Trash2, Sparkles, AlertTriangle } from 'lucide-react';
import { MobileDesktopNotice } from '@/components/ui/mobile-desktop-notice';
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
  const [selectedFileName, setSelectedFileName] = useState('');

  const parsedExpensesCsvRows = useMemo(() => {
    if (!csvText) return [];
    const lines = csvText.split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) return [];

    const hasHeader = lines[0].toLowerCase().includes('fecha') || lines[0].toLowerCase().includes('rnc') || lines[0].toLowerCase().includes('ncf');
    const dataLines = hasHeader ? lines.slice(1) : lines;

    return dataLines.map((line, idx) => {
      const parts = line.split(',').map((p) => p.trim());
      const date = parts[0] || '';
      const rnc = parts[1] || '';
      const name = parts[2] || '';
      const ncf = parts[3] || '';
      const paymentMethod = parts[4] || 'EFECTIVO';
      const expenseType = parts[5] || '02';
      const amount = parseFloat(parts[6]);
      const itbis = parseFloat(parts[7]) || 0;

      const isValidDate = Boolean(date && date.length >= 8 && !isNaN(Date.parse(date)));
      const isValidAmount = !isNaN(amount) && amount > 0;
      const isValidNcfOrRnc = Boolean(ncf || rnc || name);
      const isValid = isValidDate && isValidAmount && isValidNcfOrRnc;

      return {
        id: idx,
        date: date || 'FECHA INVÁLIDA',
        rnc,
        name: name || 'PROVEEDOR DESCONOCIDO',
        ncf,
        paymentMethod,
        expenseType,
        amount: isNaN(amount) ? 0 : amount,
        itbis,
        lineIndex: hasHeader ? idx + 1 : idx,
        isValid,
      };
    });
  }, [csvText]);

  const hasInvalidExpensesCsvRows = useMemo(() => {
    return parsedExpensesCsvRows.some((r) => !r.isValid);
  }, [parsedExpensesCsvRows]);

  const handleRemoveExpensesCsvRow = (lineIndex: number) => {
    const lines = csvText.split('\n');
    lines.splice(lineIndex, 1);
    setCsvText(lines.join('\n'));
  };

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

  async function handleUnifiedExpenseFileSelect(file: File) {
    if (!file || !companyId) return;

    const isImageOrPdf = file.type.startsWith('image/') || file.type === 'application/pdf' || file.name.endsWith('.pdf');

    if (isImageOrPdf) {
      setImportError('');
      setIsPollingOcr(true);
      const formData = new FormData();
      formData.append('file', file);

      try {
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
                setExpenseType(result.expenseType || '02');
                setAmount(result.amount || 0);
                setItbis(result.itbis || 0);
                if (result.date) setDate(new Date(result.date).toISOString().split('T')[0]);
                setIsExcelOpen(false);
                setIsOpen(true);
              } else {
                setImportError('Error al leer los datos de la factura.');
              }
            } else if (statusRes.status === 'failed') {
              clearInterval(pollInterval);
              setIsPollingOcr(false);
              setImportError(statusRes.result || 'Error durante el análisis inteligente.');
            }
          } catch (err: any) {
            clearInterval(pollInterval);
            setIsPollingOcr(false);
            setImportError('Error de conexión al consultar el estado del análisis.');
          }
        }, 1000);
      } catch (err: any) {
        setIsPollingOcr(false);
        setImportError(err.data?.message || 'Error al subir la factura para escaneo.');
      }
    } else {
      setSelectedFileName(file.name);
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        setCsvText(text);
      };
      reader.readAsText(file);
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
      <MobileDesktopNotice message="El módulo de gastos y Formato 606 te permite consultar todas tus compras registradas. Para importaciones masivas de Excel o escaneo OCR pesado, te recomendamos usar una computadora." />

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
          className="gap-2 text-xs font-semibold shadow-xs bg-primary hover:bg-primary/90 text-primary-foreground"
          onClick={() => setIsExcelOpen(true)}
        >
          <Upload className="w-3.5 h-3.5" />
          Importar / Escanear Facturas
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
                aria-label="Fecha Desde"
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
                aria-label="Fecha Hasta"
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
                <TableHead className="text-[11px] font-bold">Fecha</TableHead>
                <TableHead className="text-[11px] font-bold">Proveedor</TableHead>
                <TableHead className="text-[11px] font-bold">NCF</TableHead>
                <TableHead className="text-[11px] font-bold">Tipo de Gasto</TableHead>
                <TableHead className="text-[11px] font-bold text-right">Monto</TableHead>
                <TableHead className="text-[11px] font-bold text-right">ITBIS</TableHead>
                <TableHead className="text-[11px] font-bold text-center">Estado</TableHead>
                <TableHead className="text-[11px] font-bold text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-xs text-muted-foreground">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                    Cargando gastos...
                  </TableCell>
                </TableRow>
              ) : expenses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-xs text-muted-foreground">
                    No se encontraron gastos registrados en este período.
                  </TableCell>
                </TableRow>
              ) : (
                expenses.map((expense) => {
                  const typeLabel = EXPENSE_TYPES.find((t) => t.code === expense.expenseType)?.label || expense.expenseType;
                  return (
                    <TableRow key={expense.id} className={expense.isVoided ? 'opacity-50 line-through bg-muted/20' : ''}>
                      <TableCell className="text-[11px] font-mono text-muted-foreground">{new Date(expense.date).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <div className="font-medium text-[11px] text-foreground">{expense.providerName}</div>
                        <div className="text-[10px] text-muted-foreground font-mono">{expense.providerRnc}</div>
                      </TableCell>
                      <TableCell className="font-mono text-[11px]">{expense.ncf}</TableCell>
                      <TableCell className="text-[11px] text-muted-foreground">{typeLabel}</TableCell>
                      <TableCell className="text-right font-mono text-[11px] font-bold text-foreground">{formatCurrency(expense.amount)}</TableCell>
                      <TableCell className="text-right font-mono text-[11px] text-muted-foreground">{formatCurrency(expense.itbis)}</TableCell>
                      <TableCell className="text-center text-[11px]">
                        {expense.isVoided ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                            Anulado
                          </span>
                        ) : expense.paymentMethod === '04' && !(expense as any).isPaid ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                            Por Pagar
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                            Pagado
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-[11px]">
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
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-card text-card-foreground p-6 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl border relative">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Cerrar</span>
            </button>
            <h3 className="text-sm font-bold flex items-center gap-2">
              <Receipt className="w-4 h-4 text-primary shrink-0" />
              Registrar Nuevo Gasto / Compra NCF
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5 mb-3">
              Ingresa los datos de la factura o comprobante fiscal para el reporte 606.
            </p>

            {providerName && (
              <div className="flex items-center gap-2 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 px-3 py-2 rounded-lg text-xs font-medium mb-3">
                <Sparkles className="w-4 h-4 text-indigo-600 shrink-0 animate-pulse" />
                <span>Datos autocompletados desde el escaneo inteligente (OCR). Verifica los campos antes de guardar.</span>
              </div>
            )}

            {errorMessage && (
              <div className="p-3 text-xs bg-rose-100 text-rose-700 rounded border border-rose-200 font-semibold mb-3">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="contactSelect" className="text-xs font-semibold text-muted-foreground block mb-1">Seleccionar Contacto (Opcional)</Label>
                  <select
                    id="contactSelect"
                    onChange={(e) => handleSelectContact(e.target.value)}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs font-medium"
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
                  <Label htmlFor="providerName" className="text-xs font-semibold text-muted-foreground block mb-1">Nombre o Razón Social Proveedor *</Label>
                  <Input
                    id="providerName"
                    value={providerName}
                    onChange={(e) => setProviderName(e.target.value)}
                    required
                    placeholder="Ej. Claro Dominicana"
                    className="h-9 text-xs font-medium"
                  />
                </div>

                <div>
                  <Label htmlFor="providerRnc" className="text-xs font-semibold text-muted-foreground block mb-1">RNC / Cédula Proveedor *</Label>
                  <Input
                    id="providerRnc"
                    value={providerRnc}
                    onChange={(e) => setProviderRnc(e.target.value)}
                    required
                    placeholder="Ej. 101010101"
                    className="h-9 text-xs font-mono"
                  />
                </div>

                <div>
                  <Label htmlFor="ncf" className="text-xs font-semibold text-muted-foreground block mb-1">NCF (Comprobante Fiscal) *</Label>
                  <Input
                    id="ncf"
                    value={ncf}
                    onChange={(e) => setNcf(e.target.value)}
                    required
                    placeholder="Ej. B0100000001"
                    className="h-9 text-xs font-mono"
                  />
                </div>

                <div>
                  <Label htmlFor="expenseType" className="text-xs font-semibold text-muted-foreground block mb-1">Tipo de Bienes y Servicios (606) *</Label>
                  <select
                    id="expenseType"
                    value={expenseType}
                    onChange={(e) => setExpenseType(e.target.value)}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs font-medium"
                  >
                    {EXPENSE_TYPES.map((t) => (
                      <option key={t.code} value={t.code}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label htmlFor="date" className="text-xs font-semibold text-muted-foreground block mb-1">Fecha Comprobante *</Label>
                  <Input id="date" type="date" aria-label="Fecha Comprobante" value={date} onChange={(e) => setDate(e.target.value)} required className="h-9 text-xs font-medium" />
                </div>

                <div>
                  <Label htmlFor="amount" className="text-xs font-semibold text-muted-foreground block mb-1">Monto Total Facturado *</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    value={amount || ''}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    required
                    className="h-9 text-xs font-mono font-bold"
                  />
                </div>

                <div>
                  <Label htmlFor="itbis" className="text-xs font-semibold text-muted-foreground block mb-1">ITBIS Facturado</Label>
                  <Input
                    id="itbis"
                    type="number"
                    step="0.01"
                    value={itbis || ''}
                    onChange={(e) => setItbis(Number(e.target.value))}
                    className="h-9 text-xs font-mono"
                  />
                </div>

                <div>
                  <Label htmlFor="paymentMethod" className="text-xs font-semibold text-muted-foreground block mb-1">Forma de Pago *</Label>
                  <select
                    id="paymentMethod"
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs font-medium"
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
                    <Label htmlFor="bankAccountId" className="text-xs font-semibold text-muted-foreground block mb-1">Cuenta de Banco / Caja de Origen</Label>
                    <select
                      id="bankAccountId"
                      value={bankAccountId}
                      onChange={(e) => setBankAccountId(e.target.value)}
                      className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs font-medium"
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
              <div className="border-t border-border pt-3 space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isForeignPayment"
                    checked={isForeignPayment}
                    onChange={(e) => setIsForeignPayment(e.target.checked)}
                    className="rounded border-input text-primary h-4 w-4"
                  />
                  <Label htmlFor="isForeignPayment" className="text-xs font-semibold cursor-pointer text-foreground">
                    ¿Es un Pago o Compra Realizada al Exterior (Proveedores no residentes)?
                  </Label>
                </div>

                {isForeignPayment && (
                  <div className="p-3 bg-muted/40 rounded-lg border border-border space-y-3">
                    <p className="text-[11px] text-muted-foreground">
                      Los pagos al exterior requieren información adicional para la retención del ISR y el reporte 606.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <Label htmlFor="foreignCountry" className="text-xs font-semibold text-muted-foreground block mb-1">País de Origen *</Label>
                        <select
                          id="foreignCountry"
                          value={foreignCountry}
                          onChange={(e) => setForeignCountry(e.target.value)}
                          className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs font-medium"
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
                        <Label htmlFor="foreignTaxId" className="text-xs font-semibold text-muted-foreground block mb-1">Tax ID / Identificación Fiscal *</Label>
                        <Input
                          id="foreignTaxId"
                          value={foreignTaxId}
                          onChange={(e) => setForeignTaxId(e.target.value)}
                          placeholder="Ej. EIN / SSN / NIF"
                          required={isForeignPayment}
                          className="h-9 text-xs font-mono"
                        />
                      </div>

                      <div>
                        <Label htmlFor="foreignPaymentType" className="text-xs font-semibold text-muted-foreground block mb-1">Tipo de Pago Exterior</Label>
                        <select
                          id="foreignPaymentType"
                          value={foreignPaymentType}
                          onChange={(e) => setForeignPaymentType(e.target.value)}
                          className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs font-medium"
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

              <div className="flex justify-end gap-2 pt-3 border-t mt-4">
                <Button type="button" variant="outline" size="sm" className="h-8 text-xs font-medium" onClick={() => setIsOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" size="sm" disabled={isCreating} className="h-8 text-xs font-medium gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground">
                  {isCreating ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Guardando...
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

      {/* Modal Pagar Gasto Pendiente */}
      {payModalOpen && expenseToPay && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-card text-card-foreground p-6 rounded-xl w-full max-w-md shadow-2xl border relative">
            <button
              type="button"
              onClick={() => setPayModalOpen(false)}
              className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Cerrar</span>
            </button>
            <h3 className="text-sm font-bold flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-primary shrink-0" />
              Registrar Pago a Proveedor
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5 mb-4">
              Proveedor: <strong>{expenseToPay.providerName}</strong> ({expenseToPay.providerRnc})<br />
              NCF: <span className="font-mono">{expenseToPay.ncf}</span> | Monto: <strong>{formatCurrency(expenseToPay.amount)}</strong>
            </p>

            {payError && (
              <div className="p-3 text-xs bg-rose-100 text-rose-700 rounded border border-rose-200 font-semibold mb-3">
                {payError}
              </div>
            )}

            <form onSubmit={handlePaySubmit} className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="payDate" className="text-xs font-semibold text-muted-foreground">Fecha del Pago *</Label>
                <Input
                  id="payDate"
                  type="date"
                  aria-label="Fecha del Pago"
                  value={payDate}
                  onChange={(e) => setPayDate(e.target.value)}
                  className="h-9 text-xs font-medium"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="payBankId" className="text-xs font-semibold text-muted-foreground">Cuenta de Origen de Fondos</Label>
                <select
                  id="payBankId"
                  value={payBankId}
                  onChange={(e) => setPayBankId(e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs font-medium"
                >
                  <option value="">-- Cuenta General / Caja --</option>
                  {accounts?.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.code} - {acc.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t mt-4">
                <Button type="button" variant="outline" size="sm" className="h-8 text-xs font-medium" onClick={() => setPayModalOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" size="sm" disabled={isPaying} className="h-8 text-xs font-medium gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white">
                  {isPaying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Confirmar Pago'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Importar Excel / CSV */}
      {isExcelOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-card text-card-foreground p-6 rounded-xl w-full max-w-xl shadow-2xl border relative">
            <button
              type="button"
              onClick={() => setIsExcelOpen(false)}
              className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Cerrar</span>
            </button>
            <h3 className="text-sm font-bold flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-primary shrink-0" />
              Carga Masiva de Gastos (Formulario DGII 606)
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5 mb-4">
              Sube tu archivo CSV/Excel o revisa la previsualización de facturas detectadas.
            </p>

            {importError && (
              <div className="p-3 text-xs bg-rose-100 text-rose-700 rounded border border-rose-200 font-semibold mb-3">
                {importError}
              </div>
            )}

            <form onSubmit={handleCsvImport} className="space-y-4">
              {/* Drag and Drop Zone / Compact Status Bar */}
              {isPollingOcr ? (
                <div className="border-2 border-dashed border-primary/40 rounded-xl p-4 bg-muted/20 text-center flex flex-col items-center justify-center gap-2">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
                  <p className="text-xs font-semibold">Procesando y analizando factura con Inteligencia Artificial (Gemini)...</p>
                  <p className="text-[10px] text-muted-foreground">Por favor espera unos segundos mientras se autocompleta la información.</p>
                </div>
              ) : parsedExpensesCsvRows.length > 0 ? (
                <div className="flex items-center justify-between bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-lg p-2.5 text-xs">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span className="font-semibold text-emerald-900 dark:text-emerald-200 truncate">
                      {parsedExpensesCsvRows.length} comprobantes detectados
                    </span>
                    <span className="text-[10px] text-muted-foreground hidden sm:inline">
                      (puedes anexar más archivos)
                    </span>
                  </div>
                  <label htmlFor="excelFileInputCompact" className="cursor-pointer font-semibold text-primary hover:underline flex items-center gap-1 text-xs shrink-0 bg-background px-2.5 py-1 rounded-md border shadow-2xs">
                    <Plus className="w-3.5 h-3.5 text-primary" />
                    Añadir archivo
                    <input
                      id="excelFileInputCompact"
                      type="file"
                      accept=".csv,.txt,.xlsx,.xls,image/*,.pdf"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleUnifiedExpenseFileSelect(f);
                      }}
                      className="hidden"
                    />
                  </label>
                </div>
              ) : (
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-muted-foreground block">
                    Seleccionar Archivo (CSV, Excel, Foto o PDF) *
                  </Label>
                  <div className="border-2 border-dashed border-primary/40 hover:border-primary rounded-xl p-5 bg-muted/20 hover:bg-muted/30 transition-all text-center flex flex-col items-center justify-center gap-2 cursor-pointer relative group">
                    <input
                      id="excelFileInput"
                      type="file"
                      accept=".csv,.txt,.xlsx,.xls,image/*,.pdf"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleUnifiedExpenseFileSelect(f);
                      }}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                    />
                    <div className="flex flex-col items-center gap-1 z-0 py-1">
                      <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Sparkles className="w-4.5 h-4.5" />
                      </div>
                      <span className="font-semibold text-xs text-primary group-hover:underline block">
                        Haz clic o arrastra tu archivo aquí (CSV, Excel, Foto o PDF)
                      </span>
                      <span className="text-[10px] text-muted-foreground block">
                        Soporta archivos masivos CSV/Excel o imágenes/PDFs escaneados por IA
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Parsed Table Preview */}
              {parsedExpensesCsvRows.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  {hasInvalidExpensesCsvRows && (
                    <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg text-amber-800 dark:text-amber-300 text-xs flex items-center gap-2 font-medium">
                      <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
                      <span>Hay comprobantes con datos obligatorios incompletos (Fecha/Monto/NCF). Quítalos con 🗑️ para continuar.</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center text-xs font-semibold text-muted-foreground">
                    <span>Previsualización de Facturas ({parsedExpensesCsvRows.length})</span>
                    <span className="text-[10px] text-muted-foreground font-normal">Puedes quitar cualquier fila errónea antes de importar</span>
                  </div>
                  <div className="border rounded-lg max-h-[280px] overflow-y-auto bg-card">
                    <Table>
                      <TableHeader className="bg-muted/50 sticky top-0 z-10">
                        <TableRow className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                          <TableHead className="w-24">Fecha</TableHead>
                          <TableHead>Proveedor / RNC</TableHead>
                          <TableHead>NCF</TableHead>
                          <TableHead className="text-right">Monto (RD$)</TableHead>
                          <TableHead className="text-right w-10">Quitar</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {parsedExpensesCsvRows.map((row) => (
                          <TableRow key={row.id} className={`text-[11px] ${!row.isValid ? 'bg-amber-50/70 dark:bg-amber-950/30' : 'hover:bg-accent/50'}`}>
                            <TableCell className="font-mono text-muted-foreground whitespace-nowrap">
                              {row.date}
                            </TableCell>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-1.5">
                                <p className="text-foreground">{row.name}</p>
                                {!row.isValid && (
                                  <span className="text-[9px] font-bold text-amber-700 bg-amber-100 dark:bg-amber-900/60 px-1.5 py-0.5 rounded border border-amber-300">
                                    ⚠️ Incompleto
                                  </span>
                                )}
                              </div>
                              {row.rnc && <span className="text-[10px] text-muted-foreground font-mono">RNC: {row.rnc}</span>}
                            </TableCell>
                            <TableCell className="font-mono font-semibold text-indigo-600 dark:text-indigo-400">
                              {row.ncf || '-'}
                            </TableCell>
                            <TableCell className="text-right font-mono font-bold text-foreground">
                              {formatCurrency(row.amount)}
                            </TableCell>
                            <TableCell className="text-right p-1">
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6 text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                                onClick={() => handleRemoveExpensesCsvRow(row.lineIndex)}
                                title="Descartar esta factura"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              <div className="flex justify-between items-center pt-3 border-t mt-4">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs font-medium"
                  onClick={() => setIsExcelOpen(false)}
                  disabled={isImporting}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isImporting || parsedExpensesCsvRows.length === 0 || hasInvalidExpensesCsvRows}
                  className="h-8 text-xs font-medium gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  {isImporting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Importando Comprobantes...
                    </>
                  ) : (
                    `Confirmar e Importar Comprobantes (${parsedExpensesCsvRows.length})`
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
