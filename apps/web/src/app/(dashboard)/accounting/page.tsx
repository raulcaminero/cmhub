import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AccountsView } from '@/components/features/accounting/accounts-view';

const KPI_CARDS = [
  { title: 'Total Activos', value: 'RD$ 0.00', description: 'Balance de activos' },
  { title: 'Total Pasivos', value: 'RD$ 0.00', description: 'Balance de pasivos' },
  { title: 'Patrimonio', value: 'RD$ 0.00', description: 'Capital neto' },
  { title: 'Ingresos del Mes', value: 'RD$ 0.00', description: 'Ingresos corrientes' },
];

export default function AccountingPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Contabilidad</h1>
        <p className="text-muted-foreground">Gestión contable y financiera de la empresa</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {KPI_CARDS.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
              <p className="text-xs text-muted-foreground">{card.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <AccountsView />
    </div>
  );
}
