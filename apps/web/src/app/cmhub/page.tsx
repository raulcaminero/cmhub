'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAppSelector } from '@/store/hooks';
import { useGetInvoicesQuery } from '@/services/invoices.api';
import { useGetExpensesQuery } from '@/services/expenses.api';
import { 
  Building2, 
  ArrowUpRight, 
  ArrowDownRight, 
  TrendingUp, 
  Receipt,
  FileText,
  Calendar,
  DollarSign,
  TrendingDown
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default function DashboardPage() {
  const activeCompany = useAppSelector((state) => state.company.active);
  const companyId = activeCompany?.id;
  const [mounted, setMounted] = useState(false);

  const { data: invoices, isLoading: loadingInvoices } = useGetInvoicesQuery(
    { companyId: companyId! },
    { skip: !companyId }
  );

  const { data: expenses, isLoading: loadingExpenses } = useGetExpensesQuery(
    { companyId: companyId! },
    { skip: !companyId }
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  if (!companyId) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inicio</h1>
          <p className="text-muted-foreground">Bienvenido al sistema de gestión empresarial de CMHub</p>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-12 text-center">
            <Building2 className="w-12 h-12 text-muted-foreground/60 mb-4" />
            <CardTitle className="text-xl font-bold mb-2">Ninguna empresa seleccionada</CardTitle>
            <CardDescription className="max-w-md">
              Selecciona una empresa activa en la barra superior o registra una nueva empresa en Configuración para comenzar a ver las estadísticas del negocio.
            </CardDescription>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loadingInvoices || loadingExpenses) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-2">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm text-muted-foreground">Cargando datos del dashboard...</p>
      </div>
    );
  }

  // Calculate totals
  const totalInvoicesSum = invoices?.reduce((sum, inv) => sum + Number(inv.amount), 0) || 0;
  const totalInvoicesItbis = invoices?.reduce((sum, inv) => sum + Number(inv.itbis), 0) || 0;
  const totalExpensesSum = expenses?.reduce((sum, exp) => sum + Number(exp.amount), 0) || 0;
  const totalExpensesItbis = expenses?.reduce((sum, exp) => sum + Number(exp.itbis), 0) || 0;

  const netCashFlow = totalInvoicesSum - totalExpensesSum;
  const itbisBalance = totalInvoicesItbis - totalExpensesItbis;

  // Process data for the 6-month chart
  const last6Months = Array.from({ length: 6 }).map((_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    return {
      monthKey: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: d.toLocaleString('es-ES', { month: 'short' }),
      income: 0,
      expense: 0,
    };
  }).reverse();

  invoices?.forEach((inv) => {
    const dateStr = inv.date.substring(0, 7); // "YYYY-MM"
    const month = last6Months.find(m => m.monthKey === dateStr);
    if (month) {
      month.income += Number(inv.amount);
    }
  });

  expenses?.forEach((exp) => {
    const dateStr = exp.date.substring(0, 7); // "YYYY-MM"
    const month = last6Months.find(m => m.monthKey === dateStr);
    if (month) {
      month.expense += Number(exp.amount);
    }
  });

  const maxVal = Math.max(...last6Months.map(m => Math.max(m.income, m.expense)), 1000);

  // Combine recent invoices and expenses for the recent activity list
  const recentActivities = [
    ...(invoices?.map(inv => ({
      id: inv.id,
      date: inv.date,
      description: `Factura a ${inv.clientName} (${inv.ncf})`,
      amount: Number(inv.amount),
      type: 'INCOME' as const,
      paymentMethod: inv.paymentMethod,
    })) || []),
    ...(expenses?.map(exp => ({
      id: exp.id,
      date: exp.date,
      description: `Gasto de ${exp.providerName} (${exp.ncf})`,
      amount: Number(exp.amount),
      type: 'EXPENSE' as const,
      paymentMethod: exp.paymentMethod,
    })) || []),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
   .slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Resumen financiero de {activeCompany?.name}</p>
        </div>
        
        <div className="flex items-center gap-3 px-4 py-2 border rounded-lg bg-card text-card-foreground">
          <Building2 className="w-5 h-5 text-primary" />
          <div>
            <p className="text-sm font-semibold leading-none">{activeCompany?.name}</p>
            <p className="text-xs text-muted-foreground">RNC: {activeCompany?.rnc}</p>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Facturación (Ingresos)</CardTitle>
            <ArrowUpRight className="w-4 h-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">RD$ {totalInvoicesSum.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</div>
            <p className="text-xs text-muted-foreground">Total acumulado facturado</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Gastos / Compras</CardTitle>
            <ArrowDownRight className="w-4 h-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">RD$ {totalExpensesSum.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</div>
            <p className="text-xs text-muted-foreground">Total registrado de egresos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Flujo Neto</CardTitle>
            {netCashFlow >= 0 ? (
              <TrendingUp className="w-4 h-4 text-green-500" />
            ) : (
              <TrendingDown className="w-4 h-4 text-red-500" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${netCashFlow >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
              RD$ {netCashFlow.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">Beneficio neto calculado</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">ITBIS Neto (Estimado)</CardTitle>
            <Receipt className="w-4 h-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${itbisBalance >= 0 ? 'text-amber-600' : 'text-green-600'}`}>
              RD$ {itbisBalance.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">
              {itbisBalance >= 0 ? 'Saldo a pagar estimado' : 'Saldo a favor estimado'}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Monthly Trend Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Histórico de Ventas vs Gastos</CardTitle>
            <CardDescription>Comparativo de los últimos 6 meses</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="relative w-full h-[240px] flex items-end justify-between border-b pb-6 px-4">
              {/* Grid Lines */}
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-6">
                <div className="border-t border-muted/50 w-full"></div>
                <div className="border-t border-muted/50 w-full"></div>
                <div className="border-t border-muted/50 w-full"></div>
                <div className="border-t border-muted/50 w-full"></div>
              </div>

              {/* Bars */}
              <div className="flex-1 flex justify-around items-end h-[180px] z-10 w-full">
                {last6Months.map((m) => {
                  const incHeight = (m.income / maxVal) * 160;
                  const expHeight = (m.expense / maxVal) * 160;

                  return (
                    <div key={m.monthKey} className="flex flex-col items-center gap-2 w-16">
                      <div className="flex items-end gap-1.5 h-[160px]">
                        {/* Income Bar */}
                        <div 
                          style={{ height: `${Math.max(incHeight, 4)}px` }} 
                          className="w-4 bg-green-500 rounded-t-sm transition-all duration-500 hover:brightness-95 relative group"
                        >
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block bg-slate-800 text-white text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap z-50">
                            RD$ {m.income.toLocaleString('es-DO', { maximumFractionDigits: 0 })}
                          </div>
                        </div>
                        {/* Expense Bar */}
                        <div 
                          style={{ height: `${Math.max(expHeight, 4)}px` }} 
                          className="w-4 bg-red-500 rounded-t-sm transition-all duration-500 hover:brightness-95 relative group"
                        >
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block bg-slate-800 text-white text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap z-50">
                            RD$ {m.expense.toLocaleString('es-DO', { maximumFractionDigits: 0 })}
                          </div>
                        </div>
                      </div>
                      <span className="text-[11px] font-medium text-muted-foreground uppercase">{m.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-6 mt-4 justify-center text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-sm"></div>
                <span className="text-muted-foreground">Ventas / Ingresos</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-sm"></div>
                <span className="text-muted-foreground">Gastos / Egresos</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Links / Guide */}
        <Card>
          <CardHeader>
            <CardTitle>Accesos Rápidos</CardTitle>
            <CardDescription>Gestión y consultas</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/cmhub/accounting" className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded bg-blue-500/10 text-blue-600">
                  <DollarSign className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold">Registrar Asiento</p>
                  <p className="text-xs text-muted-foreground">Transacciones diarias</p>
                </div>
              </div>
              <ArrowUpRight className="w-4 h-4 text-muted-foreground" />
            </Link>

            <Link href="/cmhub/ncf" className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded bg-purple-500/10 text-purple-600">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold">Secuencias NCF</p>
                  <p className="text-xs text-muted-foreground">Comprobantes autorizados</p>
                </div>
              </div>
              <ArrowUpRight className="w-4 h-4 text-muted-foreground" />
            </Link>

            <Link href="/cmhub/tax" className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded bg-amber-500/10 text-amber-600">
                  <Receipt className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold">Impuestos IT-1</p>
                  <p className="text-xs text-muted-foreground">Liquidación de periodos</p>
                </div>
              </div>
              <ArrowUpRight className="w-4 h-4 text-muted-foreground" />
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity Table */}
      <Card>
        <CardHeader>
          <CardTitle>Actividad Reciente</CardTitle>
          <CardDescription>Últimas facturas y gastos registrados</CardDescription>
        </CardHeader>
        <CardContent>
          {recentActivities.length === 0 ? (
            <div className="text-center py-6 text-sm text-muted-foreground">
              No hay actividad reciente registrada para esta empresa.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Método</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentActivities.map((act) => (
                  <TableRow key={act.id}>
                    <TableCell className="text-sm text-muted-foreground font-mono">
                      {new Date(act.date).toLocaleDateString('es-ES')}
                    </TableCell>
                    <TableCell className="font-medium">{act.description}</TableCell>
                    <TableCell>
                      <Badge variant={act.type === 'INCOME' ? 'default' : 'destructive'}>
                        {act.type === 'INCOME' ? 'Ingreso' : 'Gasto'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground capitalize">
                      {act.paymentMethod.replace('_', ' ')}
                    </TableCell>
                    <TableCell className={`text-right font-semibold ${act.type === 'INCOME' ? 'text-green-600' : 'text-red-600'}`}>
                      RD$ {act.amount.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
