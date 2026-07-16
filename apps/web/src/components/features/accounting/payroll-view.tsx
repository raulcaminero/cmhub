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
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export function PayrollView() {
  const companyId = useAppSelector((state) => state.company.active?.id);
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
  const [period, setPeriod] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [payrollError, setPayrollError] = useState('');

  // Detailed view of a payroll
  const [isDetailOpen, setIsDetailOpen] = useState(false);

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
    const [year, month] = period.split('-');
    if (!year || !month) {
      setPayrollError('Formato de período inválido.');
      return;
    }

    try {
      await createPayroll({
        companyId,
        body: { period: `${year}${month}` },
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
    <div className="space-y-6">
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
              <h2 className="text-xl font-bold">Empleados Registrados</h2>
              <p className="text-xs text-muted-foreground">Gestiona tus empleados y salarios brutos.</p>
            </div>
            <Button size="sm" className="gap-2" onClick={() => setIsEmpModalOpen(true)}>
              <Plus className="w-4 h-4" />
              Nuevo Empleado
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
                      <TableHead>Nombre</TableHead>
                      <TableHead>Cédula</TableHead>
                      <TableHead>Cargo</TableHead>
                      <TableHead className="text-right">Salario Mensual</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {employees.map((emp) => (
                      <TableRow key={emp.id}>
                        <TableCell className="font-semibold text-sm">{emp.name}</TableCell>
                        <TableCell className="font-mono text-sm">{emp.cedula}</TableCell>
                        <TableCell className="text-sm">{emp.jobTitle || '-'}</TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          RD$ {Number(emp.salary).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteEmployee(emp.id)}
                            className="h-8 w-8 text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="w-4 h-4" />
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
              <h2 className="text-xl font-bold">Nóminas Ejecutadas</h2>
              <p className="text-xs text-muted-foreground">Historial de procesamiento y liquidación de TSS e ISR.</p>
            </div>
            <Button size="sm" className="gap-2" onClick={() => setIsPayrollModalOpen(true)}>
              <Calculator className="w-4 h-4" />
              Procesar Nómina del Mes
            </Button>
          </div>

          <Card>
            <CardContent className="pt-6">
              {loadingPayrolls ? (
                <p className="text-sm text-muted-foreground">Cargando historial...</p>
              ) : !payrolls || payrolls.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  No hay nóminas procesadas aún en esta empresa.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Período</TableHead>
                      <TableHead className="text-right">Salario Bruto</TableHead>
                      <TableHead className="text-right">TSS Empleados</TableHead>
                      <TableHead className="text-right">TSS Patronal</TableHead>
                      <TableHead className="text-right">Retenciones ISR</TableHead>
                      <TableHead className="text-right">Neto Pagado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payrolls.map((pay) => {
                      const tssEmp = pay.sfsEmployee + pay.afpEmployee;
                      const tssPat = pay.sfsEmployer + pay.afpEmployer + pay.arlEmployer;
                      return (
                        <TableRow key={pay.id}>
                          <TableCell className="font-semibold text-sm">{formatPeriod(pay.period)}</TableCell>
                          <TableCell className="text-right font-mono text-sm">
                            RD$ {Number(pay.grossSalary).toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm text-amber-700">
                            RD$ {tssEmp.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm text-purple-700">
                            RD$ {tssPat.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm text-red-600">
                            RD$ {Number(pay.isrDeduction).toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm text-green-700 font-bold">
                            RD$ {Number(pay.netSalary).toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setSelectedPayrollId(pay.id);
                                setIsDetailOpen(true);
                              }}
                              className="h-8 w-8 text-muted-foreground hover:bg-accent"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto p-4 animate-in fade-in duration-200">
          <div className="bg-card text-card-foreground p-6 rounded-lg w-full max-w-lg shadow-xl border relative">
            <h3 className="text-lg font-semibold mb-2">Registrar Empleado</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Ingresa los datos del empleado y su sueldo base mensual.
            </p>
            <form onSubmit={handleCreateEmployee} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="emp-cedula">Cédula de Identidad</Label>
                  <Input
                    id="emp-cedula"
                    placeholder="Ej. 00112345678"
                    value={cedula}
                    onChange={(e) => setCedula(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="emp-name">Nombre Completo</Label>
                  <Input
                    id="emp-name"
                    placeholder="Ej. Juan Pérez"
                    value={empName}
                    onChange={(e) => setEmpName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="emp-title">Cargo / Puesto (Opcional)</Label>
                  <Input
                    id="emp-title"
                    placeholder="Ej. Gerente de Ventas"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="emp-salary">Salario Bruto Mensual (RD$)</Label>
                  <Input
                    id="emp-salary"
                    type="number"
                    min="0"
                    placeholder="Ej. 45000"
                    value={salary || ''}
                    onChange={(e) => setSalary(Number(e.target.value))}
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
                    <div className="text-right">RD$ {liveEstimates.sfsEmployee.toFixed(2)}</div>
                    <div className="text-muted-foreground">Desglose de Pensión (AFP 2.87%):</div>
                    <div className="text-right">RD$ {liveEstimates.afpEmployee.toFixed(2)}</div>
                    <div className="text-muted-foreground">Retención ISR (Escala Progresiva):</div>
                    <div className="text-right text-red-600">RD$ {liveEstimates.isrDeduction.toFixed(2)}</div>
                    <div className="text-muted-foreground border-t pt-1 font-semibold">Salario Neto Estimado:</div>
                    <div className="text-right border-t pt-1 font-bold text-green-700 text-sm">
                      RD$ {liveEstimates.netSalary.toFixed(2)}
                    </div>
                  </div>
                </div>
              )}

              {empError && (
                <p className="text-xs text-destructive font-medium">{empError}</p>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEmpModalOpen(false)}
                  disabled={isCreatingEmp}
                >
                  Cancelar
                </Button>
                <Button type="submit" size="sm" disabled={isCreatingEmp}>
                  {isCreatingEmp ? (
                    <>
                      <Loader2 className="w-3 h-3 mr-2 animate-spin" />
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto p-4 animate-in fade-in duration-200">
          <div className="bg-card text-card-foreground p-6 rounded-lg w-full max-w-md shadow-xl border relative">
            <h3 className="text-lg font-semibold mb-2">Procesar Nómina</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Selecciona el mes y año para liquidar salarios y generar aportes TSS automáticamente.
            </p>
            <form onSubmit={handleProcessPayroll} className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="payroll-period">Período de Liquidación</Label>
                <Input
                  id="payroll-period"
                  type="month"
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                  required
                />
              </div>

              {payrollError && (
                <p className="text-xs text-destructive font-medium">{payrollError}</p>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsPayrollModalOpen(false)}
                  disabled={isCreatingPayroll}
                >
                  Cancelar
                </Button>
                <Button type="submit" size="sm" disabled={isCreatingPayroll}>
                  {isCreatingPayroll ? (
                    <>
                      <Loader2 className="w-3 h-3 mr-2 animate-spin" />
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto p-4 animate-in fade-in duration-200">
          <div className="bg-card text-card-foreground p-6 rounded-lg w-full max-w-4xl shadow-xl border relative my-8">
            <h3 className="text-lg font-semibold mb-2">
              Desglose de Nómina
              {payrollDetails && ` - ${formatPeriod(payrollDetails.period)}`}
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              Visualiza el desglose detallado de deducciones (TSS e ISR) por empleado.
            </p>

            {loadingDetails ? (
              <p className="text-sm text-muted-foreground">Cargando desglose de nómina...</p>
            ) : !payrollDetails ? (
              <p className="text-sm text-destructive">Error al cargar los detalles de la nómina.</p>
            ) : (
              <>
                <div className="max-h-[300px] overflow-y-auto border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
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
                      {payrollDetails.items?.map((item: PayrollItem) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-semibold text-xs">{item.employeeName}</TableCell>
                          <TableCell className="font-mono text-xs">{item.employeeCedula}</TableCell>
                          <TableCell className="text-right font-mono text-xs">
                            RD$ {Number(item.grossSalary).toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs text-amber-700">
                            RD$ {Number(item.sfsEmployee).toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs text-amber-700">
                            RD$ {Number(item.afpEmployee).toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs text-red-600">
                            RD$ {Number(item.isrDeduction).toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs text-green-700 font-bold">
                            RD$ {Number(item.netSalary).toFixed(2)}
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
                      RD$ {Number(payrollDetails.grossSalary).toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground font-semibold">TSS Retenido Total:</span>
                    <p className="font-mono font-bold text-sm text-amber-700">
                      RD$ {(Number(payrollDetails.sfsEmployee) + Number(payrollDetails.afpEmployee)).toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground font-semibold">ISR Retenido Total:</span>
                    <p className="font-mono font-bold text-sm text-red-600">
                      RD$ {Number(payrollDetails.isrDeduction).toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground font-semibold">Neto Pagado Total:</span>
                    <p className="font-mono font-bold text-sm text-green-700">
                      RD$ {Number(payrollDetails.netSalary).toFixed(2)}
                    </p>
                  </div>
                </div>
              </>
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button
                size="sm"
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
    </div>
  );
}
