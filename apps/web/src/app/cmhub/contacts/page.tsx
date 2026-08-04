'use client';

import { useState, useEffect, useMemo } from 'react';
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
import { Plus, Trash2, Edit2, Loader2, Users, FileSpreadsheet, Upload, Search, Download, UserCheck, Building2, CheckCircle2, AlertCircle } from 'lucide-react';
import { BackButton } from '@/components/ui/back-button';
import { useTranslation } from '@/lib/use-translation';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default function ContactsPage() {
  const { t } = useTranslation();
  const companyId = useAppSelector((state) => state.company.active?.id);
  const [mounted, setMounted] = useState(false);

  const TYPE_LABELS: Record<ContactType, string> = {
    CLIENT: t('contacts.client'),
    PROVIDER: t('contacts.provider'),
    BOTH: t('contacts.both'),
  };

  const { data: contacts = [], isLoading } = useGetContactsQuery(
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

  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilterTab, setActiveFilterTab] = useState<'ALL' | ContactType>('ALL');

  const [editingContact, setEditingContact] = useState<Contact | null>(null);
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

  // Calculate Metrics
  const metrics = useMemo(() => {
    const total = contacts.length;
    const clients = contacts.filter((c) => c.type === 'CLIENT' || c.type === 'BOTH').length;
    const providers = contacts.filter((c) => c.type === 'PROVIDER' || c.type === 'BOTH').length;
    const verifiedRnc = contacts.filter((c) => {
      const clean = c.rnc?.replace(/\D/g, '');
      return clean?.length === 9 || clean?.length === 11;
    }).length;
    return { total, clients, providers, verifiedRnc };
  }, [contacts]);

  // Filtered Contacts List
  const filteredContacts = useMemo(() => {
    return contacts.filter((c) => {
      const matchesSearch =
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.rnc.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.email && c.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (c.phone && c.phone.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesTab =
        activeFilterTab === 'ALL'
          ? true
          : activeFilterTab === 'BOTH'
          ? c.type === 'BOTH'
          : c.type === activeFilterTab || c.type === 'BOTH';

      return matchesSearch && matchesTab;
    });
  }, [contacts, searchTerm, activeFilterTab]);

  // Export to CSV
  function handleExportCsv() {
    if (!filteredContacts || filteredContacts.length === 0) return;

    const headers = ['Nombre/Razon Social', 'RNC/Cedula', 'Tipo', 'Email', 'Telefono', 'Direccion'];
    const rows = filteredContacts.map((c) => [
      `"${c.name.replace(/"/g, '""')}"`,
      `"${c.rnc}"`,
      `"${TYPE_LABELS[c.type]}"`,
      `"${c.email || ''}"`,
      `"${c.phone || ''}"`,
      `"${c.address || ''}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `contactos_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  if (!mounted) {
    return null;
  }

  if (!companyId) {
    return (
      <Card>
        <CardContent className="pt-3.5">
          <p className="text-muted-foreground text-sm">{t('common.selectCompany')}</p>
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
      setErrorMessage('El RNC o Cédula debe tener 9 u 11 dígitos.');
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

  const cleanRncInput = rnc.replace(/\D/g, '');
  const isRncValid = cleanRncInput.length === 9 || cleanRncInput.length === 11;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <BackButton fallbackHref="/cmhub" className="mb-1" />
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
              <Users className="w-5 h-5 text-primary shrink-0" />
              {t('contacts.title')}
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">{t('contacts.subtitle')}</p>
          </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="gap-2 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 font-medium"
            onClick={handleExportCsv}
            disabled={contacts.length === 0}
          >
            <Download className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            {t('contacts.exportCsv')}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="gap-2 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 font-medium"
            onClick={() => setIsExcelOpen(true)}
          >
            <FileSpreadsheet className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            {t('contacts.importCsv')}
          </Button>
          <Button size="sm" className="gap-2 font-semibold shadow-sm" onClick={() => setIsOpen(true)}>
            <Plus className="w-4 h-4" />
            {t('contacts.registerContact')}
          </Button>
        </div>
      </div>
    </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-1 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">{t('contacts.totalContacts')}</CardTitle>
            <Users className="w-4 h-4 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold tracking-tight">{metrics.total}</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">{t('contacts.totalContactsDesc')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-1 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">{t('contacts.clientsCount')}</CardTitle>
            <UserCheck className="w-4 h-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold tracking-tight">{metrics.clients}</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">{t('contacts.clientsCountDesc')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-1 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">{t('contacts.providersCount')}</CardTitle>
            <Building2 className="w-4 h-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold tracking-tight">{metrics.providers}</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">{t('contacts.providersCountDesc')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-1 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">{t('contacts.verifiedRnc')}</CardTitle>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold tracking-tight">{metrics.verifiedRnc}</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">{t('contacts.verifiedRncDesc')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Directory Table & Filter Card */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 py-2.5 px-4">
          <CardTitle>{t('contacts.cardTitle')}</CardTitle>
          {/* Search & Tabs Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={t('contacts.searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-8 text-xs"
              />
            </div>
            {/* Filter Tabs */}
            <div className="inline-flex items-center rounded-lg bg-muted p-0.5 text-xs font-medium">
              <button
                type="button"
                onClick={() => setActiveFilterTab('ALL')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  activeFilterTab === 'ALL'
                    ? 'bg-background text-foreground shadow-sm font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {t('contacts.allTab')}
              </button>
              <button
                type="button"
                onClick={() => setActiveFilterTab('CLIENT')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  activeFilterTab === 'CLIENT'
                    ? 'bg-background text-foreground shadow-sm font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {t('contacts.client')}
              </button>
              <button
                type="button"
                onClick={() => setActiveFilterTab('PROVIDER')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  activeFilterTab === 'PROVIDER'
                    ? 'bg-background text-foreground shadow-sm font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {t('contacts.provider')}
              </button>
              <button
                type="button"
                onClick={() => setActiveFilterTab('BOTH')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  activeFilterTab === 'BOTH'
                    ? 'bg-background text-foreground shadow-sm font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {t('contacts.both')}
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground py-4">{t('contacts.loading')}</p>
          ) : !filteredContacts || filteredContacts.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              {contacts.length === 0 ? t('contacts.noContacts') : 'No se encontraron contactos con los filtros aplicados.'}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('contacts.nameHeader')}</TableHead>
                  <TableHead>{t('contacts.rncHeader')}</TableHead>
                  <TableHead>{t('contacts.typeHeader')}</TableHead>
                  <TableHead>{t('contacts.emailHeader')}</TableHead>
                  <TableHead>{t('contacts.phoneHeader')}</TableHead>
                  <TableHead className="text-right">{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredContacts.map((contact) => (
                  <TableRow key={contact.id}>
                    <TableCell className="font-medium text-sm">{contact.name}</TableCell>
                    <TableCell className="font-mono text-sm">{contact.rnc}</TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border ${
                          contact.type === 'CLIENT'
                            ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-800'
                            : contact.type === 'PROVIDER'
                            ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/20 dark:text-purple-400 dark:border-purple-800'
                            : 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950/20 dark:text-green-400 dark:border-green-800'
                        }`}
                      >
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
              {editingContact ? t('contacts.editContact') : t('contacts.registerContact')}
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              {editingContact ? t('contacts.editSubtitle') : t('contacts.registerSubtitle')}
            </p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <Label htmlFor="contact-rnc">{t('contacts.rncLabel')}</Label>
                  {rnc && (
                    <span
                      className={`text-[10px] font-medium inline-flex items-center gap-1 ${
                        isRncValid ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
                      }`}
                    >
                      {isRncValid ? (
                        <>
                          <CheckCircle2 className="w-3 h-3" />
                          {cleanRncInput.length === 9 ? 'RNC (9 dígs)' : 'Cédula (11 dígs)'}
                        </>
                      ) : (
                        <>
                          <AlertCircle className="w-3 h-3" />
                          Requiere 9 u 11 dígitos
                        </>
                      )}
                    </span>
                  )}
                </div>
                <Input
                  id="contact-rnc"
                  placeholder="Ej. 101010101 o 00100000000"
                  value={rnc}
                  onChange={(e) => setRnc(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="contact-name">{t('contacts.nameLabel')}</Label>
                <Input
                  id="contact-name"
                  placeholder="Ej. Empresa SRL o Juan Pérez"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="contact-type">{t('contacts.relationLabel')}</Label>
                <select
                  id="contact-type"
                  value={type}
                  onChange={(e) => setType(e.target.value as ContactType)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="CLIENT">{t('contacts.client')}</option>
                  <option value="PROVIDER">{t('contacts.provider')}</option>
                  <option value="BOTH">{t('contacts.both')}</option>
                </select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="contact-email">{t('contacts.emailLabel')}</Label>
                <Input
                  id="contact-email"
                  type="email"
                  placeholder="ejemplo@empresa.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="contact-phone">{t('contacts.phoneLabel')}</Label>
                <Input
                  id="contact-phone"
                  placeholder="809-555-0199"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="contact-address">{t('contacts.addressLabel')}</Label>
                <Input
                  id="contact-address"
                  placeholder="Calle Principal #12, Sto. Dgo."
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>

              {errorMessage && <p className="text-xs text-destructive font-medium">{errorMessage}</p>}

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCloseModal}
                  disabled={isCreating || isUpdating}
                >
                  {t('common.cancel')}
                </Button>
                <Button type="submit" size="sm" disabled={isCreating || isUpdating}>
                  {isCreating || isUpdating ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                      {t('common.saving')}
                    </>
                  ) : (
                    t('common.save')
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
          <div className="bg-card text-card-foreground p-6 rounded-lg w-full max-w-lg shadow-xl border relative">
            <h3 className="text-lg font-semibold mb-2">{t('contacts.importTitle')}</h3>
            <p className="text-xs text-muted-foreground mb-4">{t('contacts.importSubtitle')}</p>

            <form onSubmit={handleCsvImport} className="space-y-4">
              <div className="border border-dashed border-muted rounded-lg p-4 bg-muted/20 text-center flex flex-col items-center gap-2">
                <Upload className="w-8 h-8 text-muted-foreground" />
                <Label htmlFor="csv-file" className="cursor-pointer font-semibold hover:underline text-primary text-sm">
                  {t('contacts.uploadCsv')}
                </Label>
                <span className="text-[10px] text-muted-foreground">{t('contacts.dragCsv')}</span>
                <Input id="csv-file" type="file" accept=".csv" className="hidden" onChange={handleFileChange} />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <Label htmlFor="csv-text">{t('contacts.csvPreview')}</Label>
                  <span className="text-[10px] text-muted-foreground font-mono">Formato: Nombre,RNC,Tipo,Tel,Email</span>
                </div>
                <textarea
                  id="csv-text"
                  rows={6}
                  placeholder="Ejemplo:&#10;Nombre,RNC,Tipo,Tel,Email&#10;Empresa SRL,101010101,CLIENT,8095550199,info@empresa.com"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs font-mono shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={csvText}
                  onChange={(e) => setCsvText(e.target.value)}
                  required
                />
              </div>

              {importError && <p className="text-xs text-destructive font-medium">{importError}</p>}

              <div className="flex justify-between items-center pt-2">
                <a
                  href="data:text/csv;charset=utf-8,Nombre,RNC,Tipo,Tel,Email%0AEmpresa%20SRL,101010101,CLIENT,8095550199,info@empresa.com"
                  download="plantilla_contactos.csv"
                  className="text-xs text-primary hover:underline flex items-center gap-1 font-medium"
                >
                  {t('contacts.downloadTemplate')}
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
                    {t('common.cancel')}
                  </Button>
                  <Button type="submit" size="sm" disabled={isImporting}>
                    {isImporting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                        {t('contacts.importing')}
                      </>
                    ) : (
                      t('contacts.importButton')
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
