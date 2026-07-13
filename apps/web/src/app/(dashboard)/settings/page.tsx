import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Configuración</h1>
        <p className="text-muted-foreground">Ajusta la empresa, usuarios y preferencias del sistema.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Empresa</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Próximamente: datos fiscales, moneda, plantilla y más.</p>
        </CardContent>
      </Card>
    </div>
  );
}
