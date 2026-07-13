import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function AccountingExpensesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Gastos</h1>
        <p className="text-muted-foreground">Registra y clasifica los gastos del negocio.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Nuevo gasto</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Aquí puedes agregar la UI para registrar gastos, categorías y comprobantes.</p>
        </CardContent>
      </Card>
    </div>
  );
}
