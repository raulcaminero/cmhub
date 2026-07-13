'use client';

import { useState, useEffect } from 'react';
import { useAppSelector } from '@/store/hooks';
import { useGetContactsQuery, useCreateContactMutation, useDeleteContactMutation, ContactType } from '@/services/contacts.api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, Loader2, Users } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const TYPE_LABELS: Record<ContactType, string> = {
  CLIENT: 'Cliente',
  PROVIDER: 'Proveedor',
  BOTH: 'Cliente y Proveedor',
};

export default function ContactsPage() {
  const companyId = useAppSelector((state) => state.company.active?.id);
  const [mounted, setMounted] = useState(false);

  const { data: contacts, isLoading } = useGetContactsQuery(
    { companyId: companyId! },
    { skip: !companyId || !mounted },
  );

  const [createContact, { isLoading: isCreating }] = useCreateContactMutation();
  const [deleteContact] = useDeleteContactMutation();

  const [isOpen, setIsOpen] = useState(false);
  const [rnc, setRnc] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState<ContactType>('CLIENT');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

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
          <p className="text-muted-foreground text-sm">Selecciona una empresa para ver los contactos.</p>
        </CardContent>
      </Card>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!companyId) return;
    setErrorMessage('');

    const cleanRnc = rnc.replace(/\D/g, '');
    if (cleanRnc.length !== 9 && cleanRnc.length !== 11) {
      setErrorMessage('El RNC o Cédula debe tener 9 o 11 dígitos.');
      return;
    }

    try {
      await createContact({
        companyId,
        body: {
          rnc: cleanRnc,
          name,
          type,
          email: email || undefined,
          phone: phone || undefined,
          address: address || undefined,
        },
      }).unwrap();
      
      setIsOpen(false);
      setRnc('');
      setName('');
      setEmail('');
      setPhone('');
      setAddress('');
    } catch (err: any) {
      setErrorMessage(err.data?.message || 'Error al registrar el contacto.');
    }
  }

  async function handleDelete(id: string) {
    if (!companyId) return;
    if (confirm('¿Estás seguro de que deseas eliminar este contacto?')) {
      try {
        await deleteContact({ companyId, id }).unwrap();
      } catch (err) {
        alert('Error al eliminar el contacto.');
      }
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Users className="w-8 h-8 text-primary" />
            Directorio de Contactos
          </h1>
          <p className="text-muted-foreground">Administra tus clientes y proveedores en un solo lugar.</p>
        </div>
        <Button size="sm" className="gap-2" onClick={() => setIsOpen(true)}>
          <Plus className="w-4 h-4" />
          Registrar Contacto
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Clientes y Proveedores</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Cargando contactos...</p>
          ) : !contacts || contacts.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No hay contactos registrados. Los contactos nuevos se guardan de forma automática cuando compras o facturas.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre / Razón Social</TableHead>
                  <TableHead>RNC / Cédula</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Teléfono</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contacts.map((contact) => (
                  <TableRow key={contact.id}>
                    <TableCell className="font-medium text-sm">{contact.name}</TableCell>
                    <TableCell className="font-mono text-sm">{contact.rnc}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border ${
                        contact.type === 'CLIENT'
                          ? 'bg-blue-50 text-blue-700 border-blue-200' 
                          : contact.type === 'PROVIDER'
                          ? 'bg-purple-50 text-purple-700 border-purple-200'
                          : 'bg-green-50 text-green-700 border-green-200'
                      }`}>
                        {TYPE_LABELS[contact.type]}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm">{contact.email || '-'}</TableCell>
                    <TableCell className="text-sm">{contact.phone || '-'}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(contact.id)}
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

      {/* Modal Registrar Contacto */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto p-4 animate-in fade-in duration-200">
          <div className="bg-card text-card-foreground p-6 rounded-lg w-full max-w-md shadow-xl border relative">
            <h3 className="text-lg font-semibold mb-2">Registrar Contacto</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Registra los datos fiscales de tu cliente o proveedor.
            </p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="cont-rnc">RNC o Cédula</Label>
                <Input
                  id="cont-rnc"
                  placeholder="Ej. 131234567"
                  value={rnc}
                  onChange={(e) => setRnc(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="cont-name">Razón Social / Nombre</Label>
                <Input
                  id="cont-name"
                  placeholder="Ej. Distribuidora del Norte SRL"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="cont-type">Relación Comercial</Label>
                <select
                  id="cont-type"
                  value={type}
                  onChange={(e) => setType(e.target.value as ContactType)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="CLIENT">Cliente</option>
                  <option value="PROVIDER">Proveedor</option>
                  <option value="BOTH">Ambos (Cliente y Proveedor)</option>
                </select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="cont-email">Correo Electrónico (Opcional)</Label>
                <Input
                  id="cont-email"
                  type="email"
                  placeholder="Ej. correo@empresa.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="cont-phone">Teléfono (Opcional)</Label>
                <Input
                  id="cont-phone"
                  placeholder="Ej. 809-555-1234"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="cont-address">Dirección (Opcional)</Label>
                <Input
                  id="cont-address"
                  placeholder="Ej. Av. Winston Churchill #12"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>

              {errorMessage && (
                <p className="text-xs text-destructive font-medium">{errorMessage}</p>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsOpen(false);
                    setErrorMessage('');
                  }}
                  disabled={isCreating}
                >
                  Cancelar
                </Button>
                <Button type="submit" size="sm" disabled={isCreating}>
                  {isCreating ? (
                    <>
                      <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                      Registrando...
                    </>
                  ) : (
                    'Guardar'
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
