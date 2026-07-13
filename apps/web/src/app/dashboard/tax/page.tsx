import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function TaxPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Impuestos</h1>
        <p className="text-muted-foreground">Gestiona declaraciones, retenciones y documentos fiscales.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Declaraciones</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Próximamente: seguimiento de impuestos y vencimientos.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Retenciones</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Registra y revisa retenciones por proveedor o servicio.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
