'use client';

import { useState, useEffect } from 'react';
import { useAppSelector } from '@/store/hooks';
import { useGetFinancialsQuery, useGetIt1SummaryQuery } from '@/services/reports.api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FileText, Download, BarChart2, Calendar } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default function ReportsPage() {
  const companyId = useAppSelector((state) => state.company.active?.id);
  const token = useAppSelector((state) => state.auth.accessToken);
  const [mounted, setMounted] = useState(false);

  const [activeTab, setActiveTab] = useState<'tax' | 'financials'>('tax');
  const [period, setPeriod] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  const [inputPeriod, setInputPeriod] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  const { data: it1, isLoading: isLoadingIt1 } = useGetIt1SummaryQuery(
    { companyId: companyId!, period },
    { skip: !companyId || activeTab !== 'tax' || !mounted },
  );

  const { data: financials, isLoading: isLoadingFinancials } = useGetFinancialsQuery(
    { companyId: companyId! },
    { skip: !companyId || activeTab !== 'financials' || !mounted },
  );

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
          <p className="text-muted-foreground text-sm">Selecciona una empresa para ver los reportes.</p>
        </CardContent>
      </Card>
    );
  }

  function handlePeriodChange(e: React.FormEvent) {
    e.preventDefault();
    const [year, month] = inputPeriod.split('-');
    if (year && month) {
      setPeriod(`${year}${month}`);
    }
  }

  const handleDownload = async (format: '606' | '607') => {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';
      const response = await fetch(`${baseUrl}/companies/${companyId}/accounting/reports/${format}?period=${period}`, {
        headers: {
          'Authorization': `Bearer ${token || ''}`,
        }
      });
      if (!response.ok) throw new Error('Error al descargar el archivo');
      const text = await response.text();
      
      const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `DGII_${format}_${period}.txt`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Error descargando el archivo impositivo.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reportes y Cierre</h1>
          <p className="text-muted-foreground">Genera exportaciones de formatos fiscales y visualiza estados financieros en tiempo real.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b gap-4">
        <Button
          variant={activeTab === 'tax' ? 'default' : 'outline'}
          onClick={() => setActiveTab('tax')}
          className="gap-2"
        >
          <Calendar className="w-4 h-4" />
          Formatos Impositivos (606, 607, IT-1)
        </Button>
        <Button
          variant={activeTab === 'financials' ? 'default' : 'outline'}
          onClick={() => setActiveTab('financials')}
          className="gap-2"
        >
          <BarChart2 className="w-4 h-4" />
          Estados Financieros
        </Button>
      </div>

      {activeTab === 'tax' ? (
        <div className="space-y-6">
          {/* Selector de periodo */}
          <Card>
            <CardContent className="pt-6">
              <form onSubmit={handlePeriodChange} className="flex flex-wrap items-end gap-4">
                <div className="space-y-1">
                  <Label htmlFor="report-period">Seleccionar Periodo Fiscal</Label>
                  <Input
                    id="report-period"
                    type="month"
                    value={inputPeriod}
                    onChange={(e) => setInputPeriod(e.target.value)}
                  />
                </div>
                <Button type="submit">Consultar Periodo</Button>
              </form>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Exportaciones DGII */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  Formatos de Envío DGII
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 border rounded-lg bg-card">
                  <div>
                    <h4 className="font-semibold text-sm">Formato 606 (Compras)</h4>
                    <p className="text-xs text-muted-foreground">Reporte mensual de compras de bienes y servicios.</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => handleDownload('606')} className="gap-2">
                    <Download className="w-4 h-4" />
                    TXT
                  </Button>
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg bg-card">
                  <div>
                    <h4 className="font-semibold text-sm">Formato 607 (Ventas)</h4>
                    <p className="text-xs text-muted-foreground">Reporte mensual de ventas de bienes y servicios.</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => handleDownload('607')} className="gap-2">
                    <Download className="w-4 h-4" />
                    TXT
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Resumen IT-1 */}
            <Card>
              <CardHeader>
                <CardTitle>Estimación Declaración IT-1 (ITBIS)</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingIt1 ? (
                  <p className="text-sm text-muted-foreground">Calculando cifras...</p>
                ) : !it1 ? (
                  <p className="text-sm text-muted-foreground">No se pudieron obtener datos del periodo.</p>
                ) : (
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm py-1 border-b">
                      <span>Ingresos Facturados (Neto)</span>
                      <span className="font-mono font-medium">RD$ {Number(it1.salesAmount).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm py-1 border-b">
                      <span>ITBIS Facturado (Ventas)</span>
                      <span className="font-mono font-medium text-destructive">RD$ {Number(it1.salesItbis).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm py-1 border-b">
                      <span>Compras Realizadas (Neto)</span>
                      <span className="font-mono font-medium">RD$ {Number(it1.purchasesAmount).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm py-1 border-b">
                      <span>ITBIS Pagado (Adelantado)</span>
                      <span className="font-mono font-medium text-green-600">RD$ {Number(it1.purchasesItbis).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-semibold text-base pt-2">
                      <span>Total ITBIS a Pagar</span>
                      <span className="font-mono text-primary">RD$ {Number(it1.itbisToPay).toFixed(2)}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Balance Sheet */}
          <Card>
            <CardHeader>
              <CardTitle>Balance de Situación (General)</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingFinancials ? (
                <p className="text-sm text-muted-foreground">Cargando balance...</p>
              ) : !financials || financials.balanceSheet.length === 0 ? (
                <p className="text-sm text-muted-foreground">No hay transacciones registradas para este balance.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Nombre Cuenta</TableHead>
                      <TableHead className="text-right">Balance (RD$)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {financials.balanceSheet.map((acc) => (
                      <TableRow key={acc.id} className={acc.code.length <= 2 ? 'font-semibold bg-muted/20' : ''}>
                        <TableCell className="font-mono text-xs">{acc.code}</TableCell>
                        <TableCell className="text-sm">{acc.name}</TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {acc.balance.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Income Statement */}
          <Card>
            <CardHeader>
              <CardTitle>Estado de Resultados</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingFinancials ? (
                <p className="text-sm text-muted-foreground">Cargando ingresos y gastos...</p>
              ) : !financials || financials.incomeStatement.length === 0 ? (
                <p className="text-sm text-muted-foreground">No hay transacciones registradas para este estado de resultados.</p>
              ) : (
                <div className="space-y-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Código</TableHead>
                        <TableHead>Nombre Cuenta</TableHead>
                        <TableHead className="text-right">Balance (RD$)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {financials.incomeStatement.map((acc) => (
                        <TableRow key={acc.id} className={acc.code.length <= 2 ? 'font-semibold bg-muted/20' : ''}>
                          <TableCell className="font-mono text-xs">{acc.code}</TableCell>
                          <TableCell className="text-sm">{acc.name}</TableCell>
                          <TableCell className="text-right font-mono text-sm">
                            {acc.balance.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  {(() => {
                    const rev = financials.incomeStatement.find((a) => a.type === 'REVENUE')?.balance || 0;
                    const exp = financials.incomeStatement.filter((a) => a.type === 'EXPENSE').reduce((sum, a) => sum + a.balance, 0);
                    const netIncome = rev - exp;

                    return (
                      <div className="flex justify-between items-center p-3 rounded-lg border bg-primary/5 text-primary font-semibold text-lg">
                        <span>Resultado Neto del Periodo</span>
                        <span className="font-mono">RD$ {netIncome.toFixed(2)}</span>
                      </div>
                    );
                  })()}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
