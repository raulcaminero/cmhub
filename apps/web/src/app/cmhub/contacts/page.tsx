'use client';

import { useState, useEffect } from 'react';
import { useAppSelector } from '@/store/hooks';
import {
  useGetContactsQuery,
  useCreateContactMutation,
  useDeleteContactMutation,
  useUpdateContactMutation,
  useImportContactsMutation,
  Contact,
  ContactType,
} from '@/services/contacts.api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, Edit2, Loader2, Users, FileSpreadsheet, Upload } from 'lucide-react';
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
  const [updateContact, { isLoading: isUpdating }] = useUpdateContactMutation();
  const [importContacts, { isLoading: isImporting }] = useImportContactsMutation();

  const [isOpen, setIsOpen] = useState(false);
  const [isExcelOpen, setIsExcelOpen] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [importError, setImportError] = useState('');

  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [rnc, setRnc] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState<ContactType>('CLIENT');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  async function handleCsvImport(e: React.FormEvent) {
    e.preventDefault();
    if (!companyId) return;
    setImportError('');

    const lines = csvText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (lines.length <= 1) {
      setImportError('El archivo o texto está vacío.');
      return;
    }

    const payload: any[] = [];
    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map((p) => p.trim().replace(/^["']|["']$/g, ''));
      if (parts.length < 3) continue;

      const nameVal = parts[0];
      const rncVal = parts[1];
      const typeVal = parts[2] as ContactType;
      const phoneVal = parts[3] || undefined;
      const emailVal = parts[4] || undefined;

      if (!nameVal || !rncVal || !typeVal) {
        setImportError(`Fila ${i + 1} inválida. Verifica los datos.`);
        return;
      }

      payload.push({
        name: nameVal,
        rnc: rncVal.replace(/\D/g, ''),
        type: typeVal,
        phone: phoneVal,
        email: emailVal,
      });
    }

    try {
      await importContacts({
        companyId,
        body: payload,
      }).unwrap();
      setIsExcelOpen(false);
      setCsvText('');
    } catch (err: any) {
      setImportError(err.data?.message || 'Error al importar los contactos.');
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCsvText(text);
    };
    reader.readAsText(file);
  }

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

  function handleStartEdit(contact: Contact) {
    setEditingContact(contact);
    setRnc(contact.rnc);
    setName(contact.name);
    setType(contact.type);
    setEmail(contact.email || '');
    setPhone(contact.phone || '');
    setAddress(contact.address || '');
    setIsOpen(true);
  }

  function handleCloseModal() {
    setIsOpen(false);
    setEditingContact(null);
    setRnc('');
    setName('');
    setType('CLIENT');
    setEmail('');
    setPhone('');
    setAddress('');
    setErrorMessage('');
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
      if (editingContact) {
        await updateContact({
          companyId,
          id: editingContact.id,
          body: {
            rnc: cleanRnc,
            name,
            type,
            email: email || undefined,
            phone: phone || undefined,
            address: address || undefined,
          },
        }).unwrap();
      } else {
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
      }
      
      handleCloseModal();
    } catch (err: any) {
      setErrorMessage(err.data?.message || 'Error al guardar el contacto.');
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
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Users className="w-8 h-8 text-primary" />
            Directorio de Contactos
          </h1>
          <p className="text-muted-foreground">Administra tus clientes y proveedores en un solo lugar.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="gap-2" onClick={() => setIsExcelOpen(true)}>
            <FileSpreadsheet className="w-4 h-4" />
            Importar Excel / CSV
          </Button>
          <Button size="sm" className="gap-2" onClick={() => setIsOpen(true)}>
            <Plus className="w-4 h-4" />
            Registrar Contacto
          </Button>
        </div>
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
                    <TableCell className="text-right flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleStartEdit(contact)}
                        className="h-8 w-8 text-muted-foreground hover:bg-accent"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
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

      {/* Modal Registrar/Editar Contacto */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto p-4 animate-in fade-in duration-200">
          <div className="bg-card text-card-foreground p-6 rounded-lg w-full max-w-md shadow-xl border relative">
            <h3 className="text-lg font-semibold mb-2">
              {editingContact ? 'Editar Contacto' : 'Registrar Contacto'}
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              {editingContact
                ? 'Modifica los datos del cliente o proveedor.'
                : 'Registra los datos fiscales de tu cliente o proveedor.'}
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
                  onClick={handleCloseModal}
                  disabled={isCreating || isUpdating}
                >
                  Cancelar
                </Button>
                <Button type="submit" size="sm" disabled={isCreating || isUpdating}>
                  {isCreating || isUpdating ? (
                    <>
                      <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                      Guardando...
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

      {/* Modal Importar Contactos desde Excel/CSV */}
      {isExcelOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto p-4 animate-in fade-in duration-200">
          <div className="bg-card text-card-foreground p-6 rounded-lg w-full max-w-lg shadow-xl border relative my-8">
            <h3 className="text-lg font-semibold mb-2">Importar Contactos desde Excel / CSV</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Sube tu archivo CSV o pega el texto en formato delimitado por comas para importar clientes y proveedores.
            </p>
            
            <form onSubmit={handleCsvImport} className="space-y-4">
              <div className="border border-dashed border-muted rounded-lg p-4 bg-muted/20 text-center flex flex-col items-center gap-2">
                <Upload className="w-8 h-8 text-muted-foreground" />
                <Label htmlFor="csv-contacts-file" className="cursor-pointer font-semibold hover:underline text-primary text-sm">
                  Haz clic para subir archivo CSV
                </Label>
                <span className="text-[10px] text-muted-foreground">O arrastra el archivo aquí</span>
                <Input
                  id="csv-contacts-file"
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <Label htmlFor="csv-contacts-text">Contenido o Vista Previa del CSV</Label>
                  <span className="text-[10px] text-muted-foreground font-mono">Formato: Nombre,RNC,Tipo,Telefono,Correo</span>
                </div>
                <textarea
                  id="csv-contacts-text"
                  rows={6}
                  placeholder="Ejemplo:&#10;Nombre,RNC,Tipo,Telefono,Correo&#10;Distribuidora Dominicana,131234567,PROVIDER,809-555-0199,ventas@dist.do&#10;Juan Perez,00122233344,CLIENT,829-555-0211,juan@mail.com"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs font-mono shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={csvText}
                  onChange={(e) => setCsvText(e.target.value)}
                  required
                />
              </div>

              {importError && (
                <p className="text-xs text-destructive font-medium">{importError}</p>
              )}

              <div className="flex justify-between items-center pt-2">
                <a 
                  href="data:text/csv;charset=utf-8,Nombre,RNC,Tipo,Telefono,Correo%0ADistribuidora Dominicana,131234567,PROVIDER,809-555-0199,ventas@dist.do%0AJuan Perez,00122233344,CLIENT,829-555-0211,juan@mail.com" 
                  download="plantilla_contactos.csv"
                  className="text-xs text-primary hover:underline flex items-center gap-1 font-medium"
                >
                  Descargar Plantilla CSV
                </a>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsExcelOpen(false);
                      setCsvText('');
                      setImportError('');
                    }}
                    disabled={isImporting}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" size="sm" disabled={isImporting}>
                    {isImporting ? (
                      <>
                        <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                        Importando...
                      </>
                    ) : (
                      'Importar Contactos'
                    )}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
