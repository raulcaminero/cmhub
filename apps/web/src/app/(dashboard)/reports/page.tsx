import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Reportes</h1>
        <p className="text-muted-foreground">Consulta balances, movimientos y resúmenes del negocio.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Resumen ejecutivo</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Próximamente: reportes mensuales, comparativos y exportación.</p>
        </CardContent>
      </Card>
    </div>
  );
}
