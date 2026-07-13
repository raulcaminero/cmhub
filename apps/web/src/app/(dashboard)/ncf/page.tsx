import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function NcfPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">NCF</h1>
        <p className="text-muted-foreground">Administra las secuencias y comprobantes fiscales.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Secuencias fiscales</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Aquí podrás controlar el estado de los NCF y sus rangos activos.</p>
        </CardContent>
      </Card>
    </div>
  );
}
