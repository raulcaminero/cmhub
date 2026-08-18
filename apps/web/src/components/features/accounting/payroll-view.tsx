'use client';

import { useState, useEffect } from 'react';
import { useAppSelector } from '@/store/hooks';
import {
  useGetEmployeesQuery,
  useCreateEmployeeMutation,
  useDeleteEmployeeMutation,
} from '@/services/employees.api';
import {
  useGetPayrollsQuery,
  useGetPayrollQuery,
  useCreatePayrollMutation,
  useDeletePayrollMutation,
  useCalculateTaxesMutation,
  Payroll,
  PayrollItem,
} from '@/services/payroll.api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Plus,
  Trash2,
  Users,
  FileText,
  Calculator,
  Loader2,
  Eye,
  Calendar,
  Download,
  Printer,
  X,
} from 'lucide-react';
import { useTranslation } from '@/lib/use-translation';
import { useCurrency } from '@/hooks/use-company';
import { MobileDesktopNotice } from '@/components/ui/mobile-desktop-notice';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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

export function PayrollView() {
  const { t } = useTranslation();
  const activeCompany = useAppSelector((state) => state.company.active);
  const companyId = activeCompany?.id;
  const formatCurrency = useCurrency();
  const [mounted, setMounted] = useState(false);
  const [tab, setTab] = useState<'employees' | 'payrolls'>('payrolls');

  // Queries
  const { data: employees, isLoading: loadingEmps } = useGetEmployeesQuery(
    { companyId: companyId! },
    { skip: !companyId || !mounted },
  );

  const { data: payrolls, isLoading: loadingPayrolls } = useGetPayrollsQuery(
    { companyId: companyId! },
    { skip: !companyId || !mounted },
  );

  const [selectedPayrollId, setSelectedPayrollId] = useState<string | null>(null);
  const { data: payrollDetails, isLoading: loadingDetails } = useGetPayrollQuery(
    { companyId: companyId!, id: selectedPayrollId! },
    { skip: !companyId || !selectedPayrollId },
  );

  // Mutations
  const [createEmployee, { isLoading: isCreatingEmp }] = useCreateEmployeeMutation();
  const [deleteEmployee] = useDeleteEmployeeMutation();
  const [createPayroll, { isLoading: isCreatingPayroll }] = useCreatePayrollMutation();
  const [deletePayroll] = useDeletePayrollMutation();
  const [calculateTaxes] = useCalculateTaxesMutation();

  // Modals / Form States
  const [isEmpModalOpen, setIsEmpModalOpen] = useState(false);
  const [cedula, setCedula] = useState('');
  const [empName, setEmpName] = useState('');
  const [salary, setSalary] = useState<number>(0);
  const [jobTitle, setJobTitle] = useState('');
  const [empError, setEmpError] = useState('');

  // Live tax estimates
  const [liveEstimates, setLiveEstimates] = useState<{
    sfsEmployee: number;
    afpEmployee: number;
    isrDeduction: number;
    netSalary: number;
  } | null>(null);

  // Process payroll state
  const [isPayrollModalOpen, setIsPayrollModalOpen] = useState(false);
  const [selectedYear, setSelectedYear] = useState(() => String(new Date().getFullYear()));
  const [selectedMonth, setSelectedMonth] = useState(() => String(new Date().getMonth() + 1).padStart(2, '0'));
  const [payrollError, setPayrollError] = useState('');

  // Detailed view of a payroll
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  // Payslips (Volantes de Pago) view modal
  const [isPayslipOpen, setIsPayslipOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Update live estimates when salary changes
  useEffect(() => {
    if (salary > 0 && companyId) {
      const delayDebounce = setTimeout(async () => {
        try {
          const res = await calculateTaxes({ companyId, salary }).unwrap();
          setLiveEstimates(res);
        } catch (e) {
          setLiveEstimates(null);
        }
      }, 300);
      return () => clearTimeout(delayDebounce);
    } else {
      setLiveEstimates(null);
    }
  }, [salary, companyId, calculateTaxes]);

  if (!mounted) return null;
  if (!companyId) return null;

  async function handleCreateEmployee(e: React.FormEvent) {
    e.preventDefault();
    if (!companyId) return;
    setEmpError('');
    const cleanCedula = cedula.replace(/\D/g, '');
    if (cleanCedula.length !== 11) {
      setEmpError('La Cédula de Identidad debe tener exactamente 11 dígitos.');
      return;
    }

    try {
      await createEmployee({
        companyId,
        body: {
          cedula: cleanCedula,
          name: empName,
          salary: Number(salary),
          jobTitle: jobTitle || undefined,
        },
      }).unwrap();
      setIsEmpModalOpen(false);
      setCedula('');
      setEmpName('');
      setSalary(0);
      setJobTitle('');
    } catch (err: any) {
      setEmpError(err.data?.message || 'Error al registrar el empleado.');
    }
  }

  async function handleDeleteEmployee(id: string) {
    if (!companyId) return;
    if (confirm('¿Estás seguro de que deseas eliminar este empleado?')) {
      try {
        await deleteEmployee({ companyId, id }).unwrap();
      } catch (err) {
        alert('Error al eliminar el empleado.');
      }
    }
  }

  async function handleProcessPayroll(e: React.FormEvent) {
    e.preventDefault();
    if (!companyId) return;
    setPayrollError('');

    try {
      await createPayroll({
        companyId,
        body: { period: `${selectedYear}${selectedMonth}` },
      }).unwrap();
      setIsPayrollModalOpen(false);
    } catch (err: any) {
      setPayrollError(err.data?.message || 'Error al procesar la nómina.');
    }
  }

  async function handleDeletePayroll(id: string) {
    if (!companyId) return;
    if (confirm('¿Estás seguro de que deseas eliminar (anular) esta nómina? El asiento contable asociado también será eliminado.')) {
      try {
        await deletePayroll({ companyId, id }).unwrap();
      } catch (err) {
        alert('Error al eliminar la nómina.');
      }
    }
  }

  // TSS SUIR TXT File Export
  const handleDownloadTSS = (pay: Payroll) => {
    const items = pay.items || [];
    if (items.length === 0) {
      alert('Esta nómina no tiene ítems de empleados para exportar.');
      return;
    }

    // Format per TSS SUIR specifications: Cédula (11 dígitos sin guiones), Sueldo Bruto (2 decimales), Tipo de Ingreso N (Normal)
    const lines = items.map((item) => {
      const cleanCedula = item.employeeCedula.replace(/\D/g, '').padStart(11, '0');
      const gross = Number(item.grossSalary).toFixed(2);
      return `${cleanCedula},${gross},N`;
    });

    const content = lines.join('\r\n');
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `TSS_SUIR_Nomina_${pay.period}.txt`);
    document.body.appendChild(link);
    link.click();
    link.parentNode?.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const handlePrintPayslips = () => {
    window.print();
  };

  const formatPeriod = (p: string) => {
    if (p.length !== 6) return p;
    const y = p.substring(0, 4);
    const m = p.substring(4, 6);
    const months = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    return `${months[parseInt(m) - 1]} ${y}`;
  };

  return (
    <div className="space-y-3">
      <MobileDesktopNotice message="El módulo de nómina te permite consultar el historial de pagos y empleados. Para el cálculo y procesamiento masivo de TSS y retenciones, te recomendamos usar una computadora." />

      {/* Header Description Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between min-h-[32px] gap-3">
        <p className="text-xs text-muted-foreground">
          Administra empleados, salarios brutos e historial de nóminas procesadas.
        </p>
      </div>
      {/* Sub tabs */}
      <div className="flex gap-2 border-b pb-2">
        <Button
          variant={tab === 'payrolls' ? 'default' : 'ghost'}
          onClick={() => setTab('payrolls')}
          size="sm"
          className="gap-2"
        >
          <Calendar className="w-4 h-4" />
          Historial de Nóminas
        </Button>
        <Button
          variant={tab === 'employees' ? 'default' : 'ghost'}
          onClick={() => setTab('employees')}
          size="sm"
          className="gap-2"
        >
          <Users className="w-4 h-4" />
          Listado de Empleados
        </Button>
      </div>

      {tab === 'employees' ? (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold tracking-tight">Empleados Registrados</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Gestiona tus empleados y salarios brutos.</p>
            </div>
            <Button size="sm" className="gap-2" onClick={() => setIsEmpModalOpen(true)}>
              <Plus className="w-4 h-4" />
              {t('payrollView.addEmployee')}
            </Button>
          </div>

          <Card>
            <CardContent className="pt-6">
              {loadingEmps ? (
                <p className="text-sm text-muted-foreground">Cargando empleados...</p>
              ) : !employees || employees.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  No hay empleados registrados. Agrega tu primer empleado para poder liquidar nóminas.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-[11px] font-bold">Nombre</TableHead>
                      <TableHead className="text-[11px] font-bold">Cédula</TableHead>
                      <TableHead className="text-[11px] font-bold">Cargo</TableHead>
                      <TableHead className="text-[11px] font-bold text-right">Salario Mensual</TableHead>
                      <TableHead className="text-[11px] font-bold text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {employees.map((emp) => (
                      <TableRow key={emp.id}>
                        <TableCell className="font-medium text-[11px] text-foreground">{emp.name}</TableCell>
                        <TableCell className="font-mono text-[11px] text-muted-foreground">{emp.cedula}</TableCell>
                        <TableCell className="text-[11px] text-muted-foreground">{emp.jobTitle || '-'}</TableCell>
                        <TableCell className="text-right font-mono text-[11px] font-bold text-foreground">
                          {formatCurrency(Number(emp.salary))}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteEmployee(emp.id)}
                            className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-sm font-bold tracking-tight">{t('payrollView.title')}</h2>
              <p className="text-[11px] text-muted-foreground mt-0.5">{t('payrollView.subtitle')}</p>
            </div>
            <Button size="sm" className="h-8 text-xs gap-1.5 font-semibold shadow-2xs" onClick={() => setIsPayrollModalOpen(true)}>
              <Calculator className="w-3.5 h-3.5" />
              {t('payrollView.processPayroll')}
            </Button>
          </div>

          <Card>
            <CardContent className="pt-6">
              {loadingPayrolls ? (
                <p className="text-xs text-muted-foreground">Cargando historial...</p>
              ) : !payrolls || payrolls.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">
                  No hay nóminas procesadas aún en esta empresa.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-[11px] font-bold">Período</TableHead>
                      <TableHead className="text-[11px] font-bold text-right">Salario Bruto</TableHead>
                      <TableHead className="text-[11px] font-bold text-right">TSS Empleados</TableHead>
                      <TableHead className="text-[11px] font-bold text-right">TSS Patronal</TableHead>
                      <TableHead className="text-[11px] font-bold text-right">Retenciones ISR</TableHead>
                      <TableHead className="text-[11px] font-bold text-right">Neto Pagado</TableHead>
                      <TableHead className="text-[11px] font-bold text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payrolls.map((pay) => {
                      const tssEmp = pay.sfsEmployee + pay.afpEmployee;
                      const tssPat = pay.sfsEmployer + pay.afpEmployer + pay.arlEmployer;
                      return (
                        <TableRow key={pay.id}>
                          <TableCell className="font-semibold text-[11px]">{formatPeriod(pay.period)}</TableCell>
                          <TableCell className="text-right font-mono text-[11px] font-bold text-foreground">
                            {formatCurrency(Number(pay.grossSalary))}
                          </TableCell>
                          <TableCell className="text-right font-mono text-[11px] text-amber-700 dark:text-amber-400">
                            {formatCurrency(tssEmp)}
                          </TableCell>
                          <TableCell className="text-right font-mono text-[11px] text-purple-700 dark:text-purple-400">
                            {formatCurrency(tssPat)}
                          </TableCell>
                          <TableCell className="text-right font-mono text-[11px] text-rose-600 dark:text-rose-400">
                            {formatCurrency(Number(pay.isrDeduction))}
                          </TableCell>
                          <TableCell className="text-right font-mono text-[11px] text-emerald-700 dark:text-emerald-400 font-bold">
                            {formatCurrency(Number(pay.netSalary))}
                          </TableCell>
                          <TableCell className="text-right flex justify-end gap-1">
                            {/* Ver Desglose */}
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Ver Desglose"
                              onClick={() => {
                                setSelectedPayrollId(pay.id);
                                setIsDetailOpen(true);
                              }}
                              className="h-8 w-8 text-muted-foreground hover:bg-accent"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            {/* Exportar TXT TSS SUIR */}
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Exportar TXT TSS (SUIR)"
                              onClick={() => {
                                setSelectedPayrollId(pay.id);
                                if (payrollDetails && payrollDetails.id === pay.id) {
                                  handleDownloadTSS(payrollDetails);
                                } else {
                                  handleDownloadTSS(pay);
                                }
                              }}
                              className="h-8 w-8 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30"
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                            {/* Volantes de Pago */}
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Volantes de Pago"
                              onClick={() => {
                                setSelectedPayrollId(pay.id);
                                setIsPayslipOpen(true);
                              }}
                              className="h-8 w-8 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                            >
                              <Printer className="w-4 h-4" />
                            </Button>
                            {/* Eliminar */}
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Eliminar Nómina"
                              onClick={() => handleDeletePayroll(pay.id)}
                              className="h-8 w-8 text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Modal Registrar Empleado */}
      {isEmpModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-card text-card-foreground p-6 rounded-xl w-full max-w-lg shadow-2xl border relative">
            <button
              type="button"
              onClick={() => setIsEmpModalOpen(false)}
              className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Cerrar</span>
            </button>
            <h3 className="text-sm font-bold flex items-center gap-2">
              <Users className="w-4 h-4 text-primary shrink-0" />
              Registrar Empleado
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5 mb-4">
              Ingresa los datos del empleado y su sueldo base mensual.
            </p>
            <form onSubmit={handleCreateEmployee} className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="emp-cedula" className="text-xs font-semibold text-muted-foreground">Cédula de Identidad *</Label>
                  <Input
                    id="emp-cedula"
                    placeholder="Ej. 00112345678"
                    value={cedula}
                    onChange={(e) => setCedula(e.target.value)}
                    className="h-9 text-xs font-mono"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="emp-name" className="text-xs font-semibold text-muted-foreground">Nombre Completo *</Label>
                  <Input
                    id="emp-name"
                    placeholder="Ej. Juan Pérez"
                    value={empName}
                    onChange={(e) => setEmpName(e.target.value)}
                    className="h-9 text-xs"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="emp-title" className="text-xs font-semibold text-muted-foreground">Cargo / Puesto (Opcional)</Label>
                  <Input
                    id="emp-title"
                    placeholder="Ej. Gerente de Ventas"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="emp-salary" className="text-xs font-semibold text-muted-foreground">Salario Bruto Mensual *</Label>
                  <Input
                    id="emp-salary"
                    type="number"
                    min="0"
                    placeholder="Ej. 45000"
                    value={salary || ''}
                    onChange={(e) => setSalary(Number(e.target.value))}
                    className="h-9 text-xs font-mono"
                    required
                  />
                </div>
              </div>

              {/* Live estimates box */}
              {liveEstimates && (
                <div className="border p-4 rounded-md space-y-2 bg-muted/20 text-xs">
                  <span className="font-semibold block text-xxs tracking-wider uppercase text-muted-foreground">
                    Estimación de Deducciones Dominicanas (TSS e ISR)
                  </span>
                  <div className="grid grid-cols-2 gap-2 font-mono">
                    <div className="text-muted-foreground">Desglose de Salud (SFS 3.04%):</div>
                    <div className="text-right">{formatCurrency(liveEstimates.sfsEmployee)}</div>
                    <div className="text-muted-foreground">Desglose de Pensión (AFP 2.87%):</div>
                    <div className="text-right">{formatCurrency(liveEstimates.afpEmployee)}</div>
                    <div className="text-muted-foreground">Retención ISR (Escala Progresiva):</div>
                    <div className="text-right text-red-600">{formatCurrency(liveEstimates.isrDeduction)}</div>
                    <div className="text-muted-foreground border-t pt-1 font-semibold">Salario Neto Estimado:</div>
                    <div className="text-right border-t pt-1 font-bold text-green-700 text-sm">
                      {formatCurrency(liveEstimates.netSalary)}
                    </div>
                  </div>
                </div>
              )}

              {empError && (
                <p className="text-xs text-destructive font-semibold mt-2">{empError}</p>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t mt-4">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs font-medium"
                  onClick={() => setIsEmpModalOpen(false)}
                  disabled={isCreatingEmp}
                >
                  Cancelar
                </Button>
                <Button type="submit" size="sm" disabled={isCreatingEmp} className="h-8 text-xs font-medium gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground">
                  {isCreatingEmp ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    'Guardar Empleado'
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Procesar Nómina */}
      {isPayrollModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-card text-card-foreground p-6 rounded-xl w-full max-w-md shadow-2xl border relative">
            <button
              type="button"
              onClick={() => setIsPayrollModalOpen(false)}
              className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Cerrar</span>
            </button>
            <h3 className="text-sm font-bold flex items-center gap-2">
              <Calculator className="w-4 h-4 text-primary shrink-0" />
              Procesar Nómina
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5 mb-4">
              Selecciona el mes y año para liquidar salarios y generar aportes TSS automáticamente.
            </p>
            <form onSubmit={handleProcessPayroll} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="payroll-year" className="text-xs font-semibold text-muted-foreground">Año *</Label>
                  <Select value={selectedYear} onValueChange={setSelectedYear}>
                    <SelectTrigger id="payroll-year" className="w-full h-9 text-xs font-medium">
                      <SelectValue placeholder="Año" />
                    </SelectTrigger>
                    <SelectContent>
                      {YEARS.map((y) => (
                        <SelectItem key={y} value={y} className="text-xs font-medium">
                          {y}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="payroll-month" className="text-xs font-semibold text-muted-foreground">Mes *</Label>
                  <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                    <SelectTrigger id="payroll-month" className="w-full h-9 text-xs font-medium">
                      <SelectValue placeholder="Mes" />
                    </SelectTrigger>
                    <SelectContent>
                      {MONTHS.map((m) => (
                        <SelectItem key={m.code} value={m.code} className="text-xs font-medium">
                          {m.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {payrollError && (
                <p className="text-xs text-destructive font-semibold mt-2">{payrollError}</p>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t mt-4">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs font-medium"
                  onClick={() => setIsPayrollModalOpen(false)}
                  disabled={isCreatingPayroll}
                >
                  Cancelar
                </Button>
                <Button type="submit" size="sm" disabled={isCreatingPayroll} className="h-8 text-xs font-medium gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground">
                  {isCreatingPayroll ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Procesando...
                    </>
                  ) : (
                    'Ejecutar Nómina'
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Detalle de Nómina */}
      {isDetailOpen && selectedPayrollId && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-card text-card-foreground p-6 rounded-xl w-full max-w-4xl shadow-2xl border relative my-8">
            <button
              type="button"
              onClick={() => {
                setIsDetailOpen(false);
                setSelectedPayrollId(null);
              }}
              className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Cerrar</span>
            </button>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 border-b pb-3 pr-6">
              <div>
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary shrink-0" />
                  Desglose de Nómina
                  {payrollDetails && ` - ${formatPeriod(payrollDetails.period)}`}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Visualiza el desglose detallado de deducciones (TSS e ISR) por empleado.
                </p>
              </div>
              {payrollDetails && (
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDownloadTSS(payrollDetails)}
                    className="gap-2 text-xs font-medium h-8"
                  >
                    <Download className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    TXT TSS (SUIR)
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setIsPayslipOpen(true)}
                    className="gap-2 text-xs font-medium h-8 bg-primary hover:bg-primary/90 text-primary-foreground"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    Volantes de Pago
                  </Button>
                </div>
              )}
            </div>

            {loadingDetails ? (
              <p className="text-xs text-muted-foreground py-6 animate-pulse">Cargando desglose de nómina...</p>
            ) : !payrollDetails ? (
              <p className="text-xs text-destructive py-6 font-semibold">Error al cargar los detalles de la nómina.</p>
            ) : (
              <>
                <div className="max-h-[300px] overflow-y-auto border rounded-md">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                        <TableHead>Empleado</TableHead>
                        <TableHead>Cédula</TableHead>
                        <TableHead className="text-right">Sueldo Bruto</TableHead>
                        <TableHead className="text-right">SFS (3.04%)</TableHead>
                        <TableHead className="text-right">AFP (2.87%)</TableHead>
                        <TableHead className="text-right">ISR (IR-3)</TableHead>
                        <TableHead className="text-right">Sueldo Neto</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payrollDetails.items?.map((item: any) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-semibold text-xs">{item.employeeName}</TableCell>
                          <TableCell className="font-mono text-xs">{item.employeeCedula}</TableCell>
                          <TableCell className="text-right font-mono text-xs">
                            {formatCurrency(Number(item.grossSalary))}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs text-amber-700 font-medium">
                            {formatCurrency(Number(item.sfsEmployee))}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs text-amber-700 font-medium">
                            {formatCurrency(Number(item.afpEmployee))}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs text-red-600 font-medium">
                            {formatCurrency(Number(item.isrDeduction))}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs text-green-700 font-bold">
                            {formatCurrency(Number(item.netSalary))}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-muted/20 rounded-md border text-xs">
                  <div>
                    <span className="text-muted-foreground font-semibold">Salario Bruto Total:</span>
                    <p className="font-mono font-bold text-sm">
                      {formatCurrency(Number(payrollDetails.grossSalary))}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground font-semibold">TSS Retenido Total:</span>
                    <p className="font-mono font-bold text-sm text-amber-700">
                      {formatCurrency(Number(payrollDetails.sfsEmployee) + Number(payrollDetails.afpEmployee))}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground font-semibold">ISR Retenido Total:</span>
                    <p className="font-mono font-bold text-sm text-red-600">
                      {formatCurrency(Number(payrollDetails.isrDeduction))}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground font-semibold">Neto Pagado Total:</span>
                    <p className="font-mono font-bold text-sm text-green-700">
                      {formatCurrency(Number(payrollDetails.netSalary))}
                    </p>
                  </div>
                </div>
              </>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t mt-4">
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs font-medium"
                onClick={() => {
                  setIsDetailOpen(false);
                  setSelectedPayrollId(null);
                }}
              >
                Cerrar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Volantes de Pago (Payslips) Imprimibles */}
      {isPayslipOpen && selectedPayrollId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-card text-card-foreground p-6 rounded-xl w-full max-w-3xl shadow-2xl border relative my-8">
            <button
              type="button"
              onClick={() => setIsPayslipOpen(false)}
              className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 print:hidden"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Cerrar</span>
            </button>
            <div className="flex items-center justify-between border-b pb-3 mb-4 pr-6 print:hidden">
              <div>
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <Printer className="w-4 h-4 text-primary shrink-0" />
                  Volantes de Pago de Nómina
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Comprobantes individuales de pago para los empleados.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" onClick={handlePrintPayslips} className="gap-2 text-xs font-medium h-8 bg-primary hover:bg-primary/90 text-primary-foreground">
                  <Printer className="w-3.5 h-3.5" />
                  Imprimir / Guardar PDF
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs font-medium"
                  onClick={() => setIsPayslipOpen(false)}
                >
                  Cerrar
                </Button>
              </div>
            </div>

            {/* Container to Print */}
            <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-1 print:max-h-none print:overflow-visible">
              {loadingDetails ? (
                <p className="text-sm text-muted-foreground py-6">Cargando comprobantes...</p>
              ) : !payrollDetails || !payrollDetails.items || payrollDetails.items.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">No se encontraron empleados en esta nómina.</p>
              ) : (
                payrollDetails.items.map((item: any, idx: number) => {
                  const totalDeductions = Number(item.sfsEmployee) + Number(item.afpEmployee) + Number(item.isrDeduction);
                  return (
                    <div
                      key={item.id || idx}
                      className="border rounded-xl p-6 bg-background space-y-4 shadow-2xs print:border-black print:break-inside-avoid print:my-4"
                    >
                      {/* Payslip Header */}
                      <div className="flex justify-between items-start border-b pb-3">
                        <div>
                          <h4 className="font-bold text-base text-foreground uppercase tracking-wide">
                            {activeCompany?.name || 'EMPRESA DEMO S.R.L.'}
                          </h4>
                          {activeCompany?.rnc && (
                            <p className="text-xs text-muted-foreground font-mono">RNC: {activeCompany.rnc}</p>
                          )}
                          <p className="text-xs font-semibold text-primary mt-1">COMPROBANTE DE PAGO DE NÓMINA</p>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-bold px-2.5 py-1 bg-primary/10 text-primary rounded-md inline-block">
                            Período: {formatPeriod(payrollDetails.period)}
                          </span>
                        </div>
                      </div>

                      {/* Employee Information */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs bg-muted/20 p-3 rounded-lg border">
                        <div>
                          <span className="text-muted-foreground block font-medium">Empleado:</span>
                          <span className="font-bold text-foreground">{item.employeeName}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block font-medium">Cédula:</span>
                          <span className="font-mono font-semibold">{item.employeeCedula}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block font-medium">Cargo:</span>
                          <span className="font-medium">{item.employeeJobTitle || 'Empleado'}</span>
                        </div>
                      </div>

                      {/* Financial Breakdown Table */}
                      <div className="border rounded-lg overflow-hidden">
                        <Table>
                          <TableHeader className="bg-muted/40">
                            <TableRow>
                              <TableHead className="text-xs font-bold text-foreground">CONCEPTO / DESCRIPCIÓN</TableHead>
                              <TableHead className="text-right text-xs font-bold text-foreground">HABERES (RD$)</TableHead>
                              <TableHead className="text-right text-xs font-bold text-foreground">DEDUCCIONES (RD$)</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody className="text-xs">
                            <TableRow>
                              <TableCell className="font-medium">Salario Bruto Mensual</TableCell>
                              <TableCell className="text-right font-mono font-semibold">{formatCurrency(Number(item.grossSalary))}</TableCell>
                              <TableCell className="text-right font-mono text-muted-foreground">-</TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell className="text-muted-foreground">SFS - Seguro Familiar de Salud (3.04%)</TableCell>
                              <TableCell className="text-right font-mono text-muted-foreground">-</TableCell>
                              <TableCell className="text-right font-mono text-amber-700">{formatCurrency(Number(item.sfsEmployee))}</TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell className="text-muted-foreground">AFP - Fondo de Pensiones (2.87%)</TableCell>
                              <TableCell className="text-right font-mono text-muted-foreground">-</TableCell>
                              <TableCell className="text-right font-mono text-amber-700">{formatCurrency(Number(item.afpEmployee))}</TableCell>
                            </TableRow>
                            {Number(item.isrDeduction) > 0 && (
                              <TableRow>
                                <TableCell className="text-muted-foreground">ISR - Impuesto Sobre la Renta (IR-3)</TableCell>
                                <TableCell className="text-right font-mono text-muted-foreground">-</TableCell>
                                <TableCell className="text-right font-mono text-rose-600">{formatCurrency(Number(item.isrDeduction))}</TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </div>

                      {/* Totals Summary */}
                      <div className="flex justify-between items-center p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900 rounded-lg text-xs">
                        <div>
                          <span className="text-muted-foreground font-medium block">Total Deducciones:</span>
                          <span className="font-mono font-semibold text-rose-600">{formatCurrency(totalDeductions)}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-emerald-800 dark:text-emerald-300 font-bold block uppercase text-xxs tracking-wider">SALARIO NETO RECIBIDO</span>
                          <span className="text-base font-bold font-mono text-emerald-700 dark:text-emerald-400">
                            {formatCurrency(Number(item.netSalary))}
                          </span>
                        </div>
                      </div>

                      {/* Signature Lines */}
                      <div className="pt-6 grid grid-cols-2 gap-8 text-center text-xxs text-muted-foreground border-t">
                        <div>
                          <div className="border-b border-muted-foreground/30 w-3/4 mx-auto mb-1"></div>
                          <span>Firma del Empleado (Recibí Conforme)</span>
                        </div>
                        <div>
                          <div className="border-b border-muted-foreground/30 w-3/4 mx-auto mb-1"></div>
                          <span>Firma Autorizada / Sello Empresa</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

