'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AccountsView } from '@/components/features/accounting/accounts-view';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { useGetCompaniesQuery, useCreateCompanyMutation, useUpdateCompanyMutation } from '@/services/companies.api';
import { useGetPeriodLockQuery, useUpdatePeriodLockMutation } from '@/services/accounting.api';
import { setActiveCompany } from '@/store/slices/company.slice';
import { Building2, BookOpen, Layers, Check, Loader2, Plus } from 'lucide-react';
import { TaxRegime } from '@cmhub/shared-types';

export default function SettingsPage() {
  const dispatch = useAppDispatch();
  const activeCompany = useAppSelector((state) => state.company.active);
  const companyList = useAppSelector((state) => state.company.list);

  const [mounted, setMounted] = useState(false);

  const { data: companies, isLoading: loadingCompanies } = useGetCompaniesQuery();
  const [updateCompany, { isLoading: isUpdatingCompany }] = useUpdateCompanyMutation();
  const [createCompany, { isLoading: isCreatingCompany }] = useCreateCompanyMutation();

  // Period Lock configuration state
  const { data: periodLock, isLoading: loadingLock } = useGetPeriodLockQuery(
    { companyId: activeCompany?.id! },
    { skip: !activeCompany || !mounted }
  );
  const [updatePeriodLock, { isLoading: isUpdatingLock }] = useUpdatePeriodLockMutation();
  const [lockDate, setLockDate] = useState('');
  const [lockSuccess, setLockSuccess] = useState('');
  const [lockError, setLockError] = useState('');

  useEffect(() => {
    if (periodLock?.lockDate) {
      setLockDate(periodLock.lockDate.split('T')[0]);
    } else {
      setLockDate('');
    }
  }, [periodLock]);

  async function handleUpdateLock(e: React.FormEvent) {
    e.preventDefault();
    if (!activeCompany) return;
    setLockSuccess('');
    setLockError('');

    try {
      await updatePeriodLock({
        companyId: activeCompany.id,
        body: { lockDate: lockDate || null },
      }).unwrap();
      setLockSuccess(lockDate ? 'Período contable bloqueado exitosamente.' : 'Período contable desbloqueado exitosamente.');
      setTimeout(() => setLockSuccess(''), 3000);
    } catch (err: any) {
      setLockError(err.data?.message || 'Error al actualizar el bloqueo de período.');
    }
  }

  const [activeTab, setActiveTab] = useState<'company' | 'my-companies' | 'accounts'>('company');

  // Company settings edit form
  const [compName, setCompName] = useState('');
  const [compTradeName, setCompTradeName] = useState('');
  const [compRnc, setCompRnc] = useState('');
  const [compTaxRegime, setCompTaxRegime] = useState('ORDINARIO');
  const [compAddress, setCompAddress] = useState('');
  const [compPhone, setCompPhone] = useState('');
  const [compEmail, setCompEmail] = useState('');
  const [compSuccess, setCompSuccess] = useState('');
  const [compError, setCompError] = useState('');

  // Register new company form
  const [newName, setNewName] = useState('');
  const [newTradeName, setNewTradeName] = useState('');
  const [newRnc, setNewRnc] = useState('');
  const [newTaxRegime, setNewTaxRegime] = useState('ORDINARIO');
  const [newAddress, setNewAddress] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newSuccess, setNewSuccess] = useState('');
  const [newError, setNewError] = useState('');

  useEffect(() => {
    setMounted(true);
  }, []);

  // Populate active company details
  useEffect(() => {
    if (activeCompany) {
      setCompName(activeCompany.name || '');
      setCompTradeName(activeCompany.tradeName || '');
      setCompRnc(activeCompany.rnc || '');
      setCompTaxRegime(activeCompany.taxRegime || 'ORDINARIO');
      setCompAddress(activeCompany.address || '');
      setCompPhone(activeCompany.phone || '');
      setCompEmail(activeCompany.email || '');
    }
  }, [activeCompany]);

  if (!mounted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-2">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm text-muted-foreground">Cargando configuración...</p>
      </div>
    );
  }

  async function handleUpdateCompany(e: React.FormEvent) {
    e.preventDefault();
    if (!activeCompany) return;
    setCompSuccess('');
    setCompError('');

    const cleanRnc = compRnc.replace(/\D/g, '');
    if (cleanRnc.length !== 9 && cleanRnc.length !== 11) {
      setCompError('El RNC debe tener 9 o 11 dígitos');
      return;
    }

    try {
      const updated = await updateCompany({
        id: activeCompany.id,
        body: {
          name: compName,
          tradeName: compTradeName || undefined,
          rnc: cleanRnc,
          taxRegime: compTaxRegime as TaxRegime,
          address: compAddress || undefined,
          phone: compPhone || undefined,
          email: compEmail || undefined,
        },
      }).unwrap();

      dispatch(setActiveCompany(updated));
      setCompSuccess('Datos de la empresa actualizados correctamente');
      setTimeout(() => setCompSuccess(''), 3000);
    } catch (err: any) {
      setCompError(err.data?.message || 'Error al actualizar los datos de la empresa. Verifica que el RNC sea único.');
    }
  }

  async function handleRegisterCompany(e: React.FormEvent) {
    e.preventDefault();
    setNewSuccess('');
    setNewError('');

    const cleanRnc = newRnc.replace(/\D/g, '');
    if (cleanRnc.length !== 9 && cleanRnc.length !== 11) {
      setNewError('El RNC debe tener 9 o 11 dígitos');
      return;
    }

    try {
      const created = await createCompany({
        name: newName,
        tradeName: newTradeName || undefined,
        rnc: cleanRnc,
        taxRegime: newTaxRegime as TaxRegime,
        address: newAddress || undefined,
        phone: newPhone || undefined,
        email: newEmail || undefined,
      }).unwrap();

      dispatch(setActiveCompany(created));
      
      // Reset form fields
      setNewName('');
      setNewTradeName('');
      setNewRnc('');
      setNewTaxRegime('ORDINARIO');
      setNewAddress('');
      setNewPhone('');
      setNewEmail('');

      setNewSuccess('Nueva empresa registrada y activada correctamente');
      setTimeout(() => setNewSuccess(''), 3000);
    } catch (err: any) {
      setNewError(err.data?.message || 'Error al registrar la empresa. Verifica que el RNC sea único.');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Configuración</h1>
          <p className="text-muted-foreground">Administra los datos de tus empresas, cuentas y preferencias.</p>
        </div>
      </div>

      <div className="flex border-b pb-4 gap-2 overflow-x-auto">
        <Button
          variant={activeTab === 'company' ? 'default' : 'outline'}
          onClick={() => setActiveTab('company')}
          className="gap-2 shrink-0"
        >
          <Building2 className="w-4 h-4" />
          Empresa Activa
        </Button>
        <Button
          variant={activeTab === 'my-companies' ? 'default' : 'outline'}
          onClick={() => setActiveTab('my-companies')}
          className="gap-2 shrink-0"
        >
          <Layers className="w-4 h-4" />
          Mis Empresas
        </Button>
        <Button
          variant={activeTab === 'accounts' ? 'default' : 'outline'}
          onClick={() => setActiveTab('accounts')}
          className="gap-2 shrink-0"
        >
          <BookOpen className="w-4 h-4" />
          Plan de Cuentas
        </Button>
      </div>

      {activeTab === 'company' && (
        <div className="space-y-6">
          <Card>
          <CardHeader>
            <CardTitle>Datos de la Empresa Activa</CardTitle>
            <CardDescription>Configura los datos comerciales y de facturación fiscal.</CardDescription>
          </CardHeader>
          <CardContent>
            {!activeCompany ? (
              <div className="text-center py-6 text-sm text-muted-foreground">
                Ninguna empresa seleccionada. Dirígete a la pestaña "Mis Empresas" para registrar una.
              </div>
            ) : (
              <form onSubmit={handleUpdateCompany} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="edit-name">Razón Social</Label>
                    <Input
                      id="edit-name"
                      value={compName}
                      onChange={(e) => setCompName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="edit-tradeName">Nombre Comercial (Opcional)</Label>
                    <Input
                      id="edit-tradeName"
                      value={compTradeName}
                      onChange={(e) => setCompTradeName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="edit-rnc">RNC (Cédula o comercial)</Label>
                    <Input
                      id="edit-rnc"
                      value={compRnc}
                      onChange={(e) => setCompRnc(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="edit-regime">Régimen Fiscal</Label>
                    <select
                      id="edit-regime"
                      value={compTaxRegime}
                      onChange={(e) => setCompTaxRegime(e.target.value)}
                      className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      <option value="ORDINARIO">Régimen Ordinario (ITBIS mensual)</option>
                      <option value="RST">RST (Simplificado)</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="edit-phone">Teléfono (Opcional)</Label>
                    <Input
                      id="edit-phone"
                      value={compPhone}
                      onChange={(e) => setCompPhone(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="edit-email">Correo de Contacto (Opcional)</Label>
                    <Input
                      id="edit-email"
                      type="email"
                      value={compEmail}
                      onChange={(e) => setCompEmail(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="edit-address">Dirección Física (Opcional)</Label>
                  <Input
                    id="edit-address"
                    value={compAddress}
                    onChange={(e) => setCompAddress(e.target.value)}
                  />
                </div>

                {compSuccess && (
                  <p className="text-xs text-green-600 font-medium">{compSuccess}</p>
                )}
                {compError && (
                  <p className="text-xs text-destructive font-medium">{compError}</p>
                )}

                <Button type="submit" disabled={isUpdatingCompany} className="w-full md:w-auto">
                  {isUpdatingCompany ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    'Guardar Cambios'
                  )}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        {activeCompany && (
          <Card>
            <CardHeader>
              <CardTitle>Cierre de Período Contable</CardTitle>
              <CardDescription>
                Bloquea el registro, edición o anulación de transacciones (asientos, facturas, gastos, nóminas) antes de la fecha indicada para proteger tus declaraciones fiscales presentadas.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingLock ? (
                <p className="text-sm text-muted-foreground animate-pulse">Cargando cierre de período...</p>
              ) : (
                <form onSubmit={handleUpdateLock} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label htmlFor="lock-date">Bloquear transacciones en o antes de:</Label>
                      <Input
                        id="lock-date"
                        type="date"
                        value={lockDate}
                        onChange={(e) => setLockDate(e.target.value)}
                      />
                      <p className="text-[11px] text-muted-foreground">
                        Cualquier transacción posterior a esta fecha podrá registrarse normalmente. Las fechas anteriores o iguales serán denegadas.
                      </p>
                    </div>
                  </div>

                  {lockSuccess && (
                    <p className="text-xs text-green-600 font-medium">{lockSuccess}</p>
                  )}
                  {lockError && (
                    <p className="text-xs text-destructive font-medium">{lockError}</p>
                  )}

                  <div className="flex gap-2">
                    <Button type="submit" disabled={isUpdatingLock}>
                      {isUpdatingLock ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Guardando...
                        </>
                      ) : (
                        'Guardar Bloqueo'
                      )}
                    </Button>
                    {lockDate && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={async () => {
                          if (confirm('¿Estás seguro de que deseas eliminar el bloqueo y reabrir todos los períodos?')) {
                            setLockDate('');
                            try {
                              await updatePeriodLock({
                                companyId: activeCompany.id,
                                body: { lockDate: null },
                              }).unwrap();
                              setLockSuccess('Período contable desbloqueado exitosamente.');
                              setTimeout(() => setLockSuccess(''), 3000);
                            } catch (err: any) {
                              setLockError(err.data?.message || 'Error al eliminar el bloqueo.');
                            }
                          }
                        }}
                        disabled={isUpdatingLock}
                      >
                        Quitar Bloqueo / Reabrir
                      </Button>
                    )}
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        )}
      </div>
      )}

      {activeTab === 'my-companies' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Company Registry List */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-xl font-bold tracking-tight">Empresas Registradas</h2>
            {loadingCompanies ? (
              <div className="flex justify-center p-6">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : companyList.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
                  <Building2 className="w-10 h-10 mb-2 opacity-50" />
                  <p className="text-sm">Aún no has registrado ninguna empresa.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {companyList.map((comp) => {
                  const isActive = activeCompany?.id === comp.id;
                  return (
                    <Card key={comp.id} className={`border transition-all ${isActive ? 'ring-2 ring-primary bg-primary/5' : ''}`}>
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <CardTitle className="text-base font-bold truncate pr-2">{comp.name}</CardTitle>
                          {isActive && (
                            <span className="flex items-center gap-1 text-[11px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                              <Check className="w-3 h-3" />
                              Activa
                            </span>
                          )}
                        </div>
                        <CardDescription className="text-xs">RNC: {comp.rnc}</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3 pb-4">
                        <div className="text-xs text-muted-foreground space-y-1">
                          <p>Régimen: {comp.taxRegime === 'ORDINARIO' ? 'Ordinario' : 'RST (Simplificado)'}</p>
                          {comp.tradeName && <p>Nombre C.: {comp.tradeName}</p>}
                        </div>
                        {!isActive && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full text-xs"
                            onClick={() => dispatch(setActiveCompany(comp))}
                          >
                            Activar Empresa
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

          {/* Register New Company form */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Agregar Nueva Empresa</CardTitle>
                <CardDescription>Registra un nuevo negocio en tu cuenta.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleRegisterCompany} className="space-y-3">
                  <div className="space-y-1">
                    <Label htmlFor="new-name">Razón Social</Label>
                    <Input
                      id="new-name"
                      placeholder="Mi Empresa SRL"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="new-tradeName">Nombre Comercial</Label>
                    <Input
                      id="new-tradeName"
                      placeholder="Opcional"
                      value={newTradeName}
                      onChange={(e) => setNewTradeName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="new-rnc">RNC (9 u 11 dígitos)</Label>
                    <Input
                      id="new-rnc"
                      placeholder="131234567"
                      value={newRnc}
                      onChange={(e) => setNewRnc(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="new-regime">Régimen Fiscal</Label>
                    <select
                      id="new-regime"
                      value={newTaxRegime}
                      onChange={(e) => setNewTaxRegime(e.target.value)}
                      className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      <option value="ORDINARIO">Régimen Ordinario (ITBIS mensual)</option>
                      <option value="RST">RST (Simplificado)</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="new-phone">Teléfono</Label>
                    <Input
                      id="new-phone"
                      placeholder="Opcional"
                      value={newPhone}
                      onChange={(e) => setNewPhone(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="new-email">Correo de Contacto</Label>
                    <Input
                      id="new-email"
                      type="email"
                      placeholder="contacto@empresa.com"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="new-address">Dirección Física</Label>
                    <Input
                      id="new-address"
                      placeholder="Opcional"
                      value={newAddress}
                      onChange={(e) => setNewAddress(e.target.value)}
                    />
                  </div>

                  {newSuccess && (
                    <p className="text-xs text-green-600 font-medium">{newSuccess}</p>
                  )}
                  {newError && (
                    <p className="text-xs text-destructive font-medium">{newError}</p>
                  )}

                  <Button type="submit" disabled={isCreatingCompany} className="w-full mt-2">
                    {isCreatingCompany ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Registrando...
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4 mr-2" />
                        Registrar Empresa
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {activeTab === 'accounts' && (
        <AccountsView />
      )}
    </div>
  );
}
