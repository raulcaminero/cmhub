'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AccountsView } from '@/components/features/accounting/accounts-view';
import { LanguageSwitcher } from '@/components/features/layout/language-switcher';
import { useTranslation } from '@/lib/use-translation';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { useGetCompaniesQuery, useCreateCompanyMutation, useUpdateCompanyMutation } from '@/services/companies.api';
import { useGetPeriodLockQuery, useUpdatePeriodLockMutation } from '@/services/accounting.api';
import { setActiveCompany } from '@/store/slices/company.slice';
import { useChangePasswordMutation, useGetProfileQuery, useUpdateProfileMutation, UpdateProfileRequest } from '@/services/auth.api';
import { Building2, BookOpen, Layers, Check, Loader2, Plus, Globe, KeyRound, ShieldCheck, Users, Eye, EyeOff, Moon, User, Settings as SettingsIcon, FileText } from 'lucide-react';
import { TaxRegime } from '@cmhub/shared-types';
import { TeamMembersView } from '@/components/features/settings/team-members-view';
import { NcfSequencesView } from '@/components/features/settings/ncf-sequences-view';
import { ThemeSelector } from '@/components/theme-toggle';
import { useTabMemory } from '@/hooks/use-tab-memory';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type SettingsTab = 'profile' | 'company' | 'my-companies' | 'ncf' | 'team' | 'accounts' | 'preferences' | 'security';

const VALID_TABS: SettingsTab[] = ['profile', 'company', 'my-companies', 'ncf', 'team', 'accounts', 'preferences', 'security'];

export default function SettingsPage() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const activeCompany = useAppSelector((state) => state.company.active);
  const companyList = useAppSelector((state) => state.company.list);

  const [mounted, setMounted] = useState(false);

  // Profile
  const { data: profile } = useGetProfileQuery();
  const [updateProfile, { isLoading: isUpdatingProfile }] = useUpdateProfileMutation();
  const [profFirstName, setProfFirstName] = useState('');
  const [profLastName, setProfLastName] = useState('');
  const [profEmail, setProfEmail] = useState('');
  const [profSuccess, setProfSuccess] = useState('');
  const [profError, setProfError] = useState('');

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

  const { activeTab, changeTab } = useTabMemory<SettingsTab>('company', VALID_TABS);

  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  // Security & Password Change form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passSuccess, setPassSuccess] = useState('');
  const [passError, setPassError] = useState('');
  const [changePassword, { isLoading: isChangingPassword }] = useChangePasswordMutation();

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPassSuccess('');
    setPassError('');

    if (newPassword !== confirmPassword) {
      setPassError('La nueva contraseña y su confirmación no coinciden.');
      return;
    }

    if (newPassword.length < 8 || !/\d/.test(newPassword) || !/[A-Z]/.test(newPassword)) {
      setPassError('La nueva contraseña debe tener al menos 8 caracteres, incluir números y mayúsculas.');
      return;
    }

    try {
      const res = await changePassword({ currentPassword, newPassword }).unwrap();
      setPassSuccess(res.message);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPassSuccess(''), 4000);
    } catch (err: any) {
      setPassError(err.data?.message || 'Error al cambiar la contraseña. Verifica tu clave actual.');
    }
  }

  // Company settings edit form
  const [compName, setCompName] = useState('');
  const [compTradeName, setCompTradeName] = useState('');
  const [compRnc, setCompRnc] = useState('');
  const [compTaxRegime, setCompTaxRegime] = useState('ORDINARIO');
  const [compCountry, setCompCountry] = useState('DO');
  const [compCurrency, setCompCurrency] = useState('DOP');
  const [compModules, setCompModules] = useState<string[]>(['DR_FISCAL']);
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
  const [newCountry, setNewCountry] = useState('DO');
  const [newCurrency, setNewCurrency] = useState('DOP');
  const [newModules, setNewModules] = useState<string[]>(['DR_FISCAL']);
  const [newAddress, setNewAddress] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newSuccess, setNewSuccess] = useState('');
  const [newError, setNewError] = useState('');

  useEffect(() => {
    setMounted(true);
  }, []);

  // Read ?tab= URL param — handled by TabSearchParamSync inside Suspense

  // Populate profile form fields
  useEffect(() => {
    if (profile) {
      setProfFirstName(profile.firstName);
      setProfLastName(profile.lastName);
      setProfEmail(profile.email);
    }
  }, [profile]);

  // Populate active company details
  useEffect(() => {
    if (activeCompany) {
      setCompName(activeCompany.name || '');
      setCompTradeName(activeCompany.tradeName || '');
      setCompRnc(activeCompany.rnc || '');
      setCompTaxRegime(activeCompany.taxRegime || 'ORDINARIO');
      setCompCountry(activeCompany.country || 'DO');
      setCompCurrency(activeCompany.currency || 'DOP');
      setCompModules(activeCompany.enabledModules && activeCompany.enabledModules.length > 0 ? activeCompany.enabledModules : ['DR_FISCAL']);
      setCompAddress(activeCompany.address || '');
      setCompPhone(activeCompany.phone || '');
      setCompEmail(activeCompany.email || '');
    }
  }, [activeCompany]);

  async function handleUpdateProfile(e: React.FormEvent) {
    e.preventDefault();
    setProfSuccess('');
    setProfError('');
    try {
      const body: UpdateProfileRequest = { firstName: profFirstName, lastName: profLastName, email: profEmail };
      await updateProfile(body).unwrap();
      setProfSuccess('Perfil actualizado correctamente.');
      setTimeout(() => setProfSuccess(''), 3000);
    } catch (err: any) {
      setProfError(err.data?.message || 'Error al actualizar el perfil.');
    }
  }

  if (!mounted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-2">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
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
          country: compCountry,
          currency: compCurrency,
          enabledModules: compModules,
          locale: compCountry === 'US' ? 'en-US'
            : compCountry === 'MX' ? 'es-MX'
            : compCountry === 'CO' ? 'es-CO'
            : compCountry === 'PE' ? 'es-PE'
            : compCountry === 'CL' ? 'es-CL'
            : compCountry === 'AR' ? 'es-AR'
            : compCountry === 'DO' ? 'es-DO'
            : 'es',
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
        country: newCountry,
        currency: newCurrency,
        enabledModules: newModules,
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
    <div className="space-y-4">
      <div>
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
              <SettingsIcon className="w-5 h-5 text-primary shrink-0" />
              {t('settings.title')}
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">{t('settings.subtitle')}</p>
          </div>
        </div>
      </div>

      <div className="flex border-b border-border overflow-x-auto whitespace-nowrap scrollbar-none">
        <button
          onClick={() => changeTab('profile')}
          className={`px-3.5 py-2 text-xs font-medium border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
            activeTab === 'profile'
              ? 'border-primary text-primary font-semibold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <User className="w-3.5 h-3.5" />
          Mi Perfil
        </button>
        <button
          onClick={() => changeTab('company')}
          className={`px-3.5 py-2 text-xs font-medium border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
            activeTab === 'company'
              ? 'border-primary text-primary font-semibold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          {t('settings.activeCompanyTab')}
        </button>
        <button
          onClick={() => changeTab('my-companies')}
          className={`px-3.5 py-2 text-xs font-medium border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
            activeTab === 'my-companies'
              ? 'border-primary text-primary font-semibold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          {t('settings.myCompaniesTab')}
        </button>
        <button
          onClick={() => changeTab('ncf')}
          className={`px-3.5 py-2 text-xs font-medium border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
            activeTab === 'ncf'
              ? 'border-primary text-primary font-semibold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          {t('nav.ncf')}
        </button>
        <button
          onClick={() => changeTab('team')}
          className={`px-3.5 py-2 text-xs font-medium border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
            activeTab === 'team'
              ? 'border-primary text-primary font-semibold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          Equipo y Accesos
        </button>
        <button
          onClick={() => changeTab('accounts')}
          className={`px-3.5 py-2 text-xs font-medium border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
            activeTab === 'accounts'
              ? 'border-primary text-primary font-semibold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          {t('settings.chartOfAccountsTab')}
        </button>
        <button
          onClick={() => changeTab('preferences')}
          className={`px-3.5 py-2 text-xs font-medium border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
            activeTab === 'preferences'
              ? 'border-primary text-primary font-semibold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Globe className="w-3.5 h-3.5" />
          {t('settings.preferences')}
        </button>
        <button
          onClick={() => changeTab('security')}
          className={`px-3.5 py-2 text-xs font-medium border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
            activeTab === 'security'
              ? 'border-primary text-primary font-semibold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <KeyRound className="w-3.5 h-3.5" />
          Seguridad
        </button>
      </div>

      {activeTab === 'profile' && (
        <div className="max-w-xl">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <User className="w-4 h-4 text-primary" />
                Mi Perfil
              </CardTitle>
              <CardDescription className="text-[11px] mt-0.5">Actualiza tu nombre, apellido y correo electrónico de acceso.</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Avatar display */}
              <div className="flex items-center gap-3.5 mb-4 p-3 bg-muted/30 rounded-lg border">
                <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-lg font-bold shrink-0">
                  {profile ? `${profile.firstName.charAt(0)}${profile.lastName.charAt(0)}`.toUpperCase() : 'U'}
                </div>
                <div>
                  <p className="font-bold text-sm">{profile?.firstName} {profile?.lastName}</p>
                  <p className="text-xs text-muted-foreground">{profile?.email}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Miembro desde {profile ? new Date(profile.createdAt ?? Date.now()).toLocaleDateString('es-DO', { month: 'long', year: 'numeric' }) : '—'}</p>
                </div>
              </div>

              <form onSubmit={handleUpdateProfile} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="prof-firstname" className="text-[11px] font-semibold text-muted-foreground">Nombre *</Label>
                    <Input
                      id="prof-firstname"
                      value={profFirstName}
                      onChange={(e) => setProfFirstName(e.target.value)}
                      className="h-8 text-xs"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="prof-lastname" className="text-[11px] font-semibold text-muted-foreground">Apellido *</Label>
                    <Input
                      id="prof-lastname"
                      value={profLastName}
                      onChange={(e) => setProfLastName(e.target.value)}
                      className="h-8 text-xs"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="prof-email" className="text-[11px] font-semibold text-muted-foreground">Correo Electrónico *</Label>
                  <Input
                    id="prof-email"
                    type="email"
                    value={profEmail}
                    onChange={(e) => setProfEmail(e.target.value)}
                    className="h-8 text-xs"
                    required
                  />
                </div>

                {profSuccess && <p className="text-xs text-emerald-600 font-semibold">{profSuccess}</p>}
                {profError && <p className="text-xs text-destructive font-semibold">{profError}</p>}

                <div className="flex items-center gap-3 pt-1">
                  <Button type="submit" disabled={isUpdatingProfile} size="sm" className="h-8 text-xs font-semibold shadow-2xs">
                    {isUpdatingProfile ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Guardando...</> : 'Guardar Cambios'}
                  </Button>
                  <p className="text-[11px] text-muted-foreground">Para cambiar la contraseña ve a la pestaña <strong>Seguridad</strong>.</p>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'ncf' && <NcfSequencesView />}

      {activeTab === 'team' && (
        activeCompany ? (
          <TeamMembersView companyId={activeCompany.id} />
        ) : (
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-slate-500">{t('common.selectCompany')}</p>
            </CardContent>
          </Card>
        )
      )}

      {activeTab === 'company' && (
        <div className="space-y-6">
          <Card>
          <CardHeader>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Building2 className="w-4 h-4 text-primary" />
              {t('settings.activeCompanyTitle')}
            </CardTitle>
            <CardDescription className="text-[11px] mt-0.5">{t('settings.activeCompanyDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            {!activeCompany ? (
              <div className="text-center py-6 text-sm text-muted-foreground">
                {t('settings.noCompanySelected')}
              </div>
            ) : (
              <form onSubmit={handleUpdateCompany} className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="edit-name" className="text-[11px] font-semibold text-muted-foreground">{t('settings.tradeName')}</Label>
                    <Input
                      id="edit-name"
                      value={compName}
                      onChange={(e) => setCompName(e.target.value)}
                      className="h-8 text-xs"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="edit-tradeName" className="text-[11px] font-semibold text-muted-foreground">{t('settings.commercialName')}</Label>
                    <Input
                      id="edit-tradeName"
                      value={compTradeName}
                      onChange={(e) => setCompTradeName(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="edit-rnc" className="text-[11px] font-semibold text-muted-foreground">{t('settings.rnc')}</Label>
                    <Input
                      id="edit-rnc"
                      value={compRnc}
                      onChange={(e) => setCompRnc(e.target.value)}
                      className="h-8 text-xs"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="edit-regime" className="text-[11px] font-semibold text-muted-foreground">{t('settings.taxRegime')}</Label>
                    <Select value={compTaxRegime} onValueChange={(val) => setCompTaxRegime(val)}>
                      <SelectTrigger id="edit-regime" className="w-full h-8 text-xs font-medium">
                        <SelectValue placeholder={t('settings.taxRegime')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ORDINARIO" className="text-xs">{t('settings.ordinaryRegime')}</SelectItem>
                        <SelectItem value="RST" className="text-xs">{t('settings.rst')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {/* TODO: Re-enable País/Moneda selectors when multi-country engine is ready */}
                  {false && (<>
                  <div className="space-y-1">
                    <Label htmlFor="edit-country">País</Label>
                    <select
                      id="edit-country"
                      value={compCountry}
                      onChange={(e) => {
                        setCompCountry(e.target.value);
                        // Auto-set default currency based on country
                        const currencyMap: Record<string, string> = {
                          DO: 'DOP', US: 'USD', MX: 'MXN', CO: 'COP',
                          PE: 'PEN', CL: 'CLP', AR: 'ARS', EC: 'USD',
                          GT: 'GTQ', HN: 'HNL', CR: 'CRC', PA: 'USD',
                        };
                        setCompCurrency(currencyMap[e.target.value] || 'USD');
                      }}
                      className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      <option value="DO">🇩🇴 República Dominicana</option>
                      <option value="US">🇺🇸 Estados Unidos</option>
                      <option value="MX">🇲🇽 México</option>
                      <option value="CO">🇨🇴 Colombia</option>
                      <option value="PE">🇵🇪 Perú</option>
                      <option value="CL">🇨🇱 Chile</option>
                      <option value="AR">🇦🇷 Argentina</option>
                      <option value="EC">🇪🇨 Ecuador</option>
                      <option value="GT">🇬🇹 Guatemala</option>
                      <option value="HN">🇭🇳 Honduras</option>
                      <option value="CR">🇨🇷 Costa Rica</option>
                      <option value="PA">🇵🇦 Panamá</option>
                      <option value="PR">🇵🇷 Puerto Rico (USD)</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="edit-currency">Moneda</Label>
                    <select
                      id="edit-currency"
                      value={compCurrency}
                      onChange={(e) => setCompCurrency(e.target.value)}
                      className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      <option value="DOP">DOP — Peso Dominicano (RD$)</option>
                      <option value="USD">USD — Dólar Americano ($)</option>
                      <option value="MXN">MXN — Peso Mexicano (MX$)</option>
                      <option value="COP">COP — Peso Colombiano</option>
                      <option value="PEN">PEN — Sol Peruano (S/)</option>
                      <option value="CLP">CLP — Peso Chileno</option>
                      <option value="ARS">ARS — Peso Argentino</option>
                      <option value="GTQ">GTQ — Quetzal Guatemalteco</option>
                      <option value="HNL">HNL — Lempira Hondureño</option>
                      <option value="CRC">CRC — Colón Costarricense</option>
                    </select>
                  </div>
                  </>)}
                  <div className="space-y-1">
                    <Label htmlFor="edit-phone" className="text-[11px] font-semibold text-muted-foreground">{t('settings.phone')}</Label>
                    <Input
                      id="edit-phone"
                      value={compPhone}
                      onChange={(e) => setCompPhone(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="edit-email" className="text-[11px] font-semibold text-muted-foreground">{t('settings.contactEmail')}</Label>
                    <Input
                      id="edit-email"
                      type="email"
                      value={compEmail}
                      onChange={(e) => setCompEmail(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="edit-address" className="text-[11px] font-semibold text-muted-foreground">{t('settings.address')}</Label>
                  <Input
                    id="edit-address"
                    value={compAddress}
                    onChange={(e) => setCompAddress(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>

                {/* Read-only Fiscal Module & Country Info */}
                <div className="pt-3 border-t space-y-2.5">
                  <h4 className="text-xs font-bold flex items-center gap-2 text-foreground">
                    <Globe className="w-3.5 h-3.5 text-primary" />
                    Configuración Fiscal & Módulo Activo
                  </h4>
                  <div className="p-3 rounded-lg border bg-muted/30 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <span className="text-muted-foreground block text-[11px] font-medium">País de Operación</span>
                      <span className="font-semibold text-foreground text-xs flex items-center gap-1.5 mt-0.5">
                        {activeCompany?.country === 'US' ? '🇺🇸 Estados Unidos' :
                         activeCompany?.country === 'MX' ? '🇲🇽 México' :
                         activeCompany?.country === 'CO' ? '🇨🇴 Colombia' : '🇩🇴 República Dominicana'}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[11px] font-medium">Moneda Principal</span>
                      <span className="font-semibold text-foreground text-xs mt-0.5 block">
                        {activeCompany?.currency || 'DOP'}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[11px] font-medium">Módulo Fiscal</span>
                      <span className="font-semibold text-primary text-xs mt-0.5 block">
                        {activeCompany?.enabledModules?.includes('US_ACCOUNTING') ? 'USA Accounting' :
                         activeCompany?.enabledModules?.includes('LATAM') ? 'Latinoamérica' :
                         'Módulo Fiscal RD (DGII)'}
                      </span>
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground italic">
                    Nota: Los módulos fiscales y la moneda se asignan automáticamente al registrar la empresa según el país seleccionado.
                  </p>
                </div>

                {compSuccess && (
                  <p className="text-xs text-green-600 font-medium">{compSuccess}</p>
                )}
                {compError && (
                  <p className="text-xs text-destructive font-medium">{compError}</p>
                )}

                <Button type="submit" disabled={isUpdatingCompany} size="sm" className="h-8 text-xs font-semibold shadow-2xs w-full md:w-auto">
                  {isUpdatingCompany ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                      {t('common.saving')}
                    </>
                  ) : (
                    t('header.saveChanges')
                  )}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        {activeCompany && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-primary" />
                {t('settings.periodLockTitle')}
              </CardTitle>
              <CardDescription className="text-[11px] mt-0.5">
                {t('settings.periodLockDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingLock ? (
                <p className="text-xs text-muted-foreground animate-pulse">{t('common.loading')}</p>
              ) : (
                <form onSubmit={handleUpdateLock} className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="lock-date" className="text-[11px] font-semibold text-muted-foreground">{t('settings.lockDateLabel')}</Label>
                      <Input
                        id="lock-date"
                        type="date"
                        value={lockDate}
                        onChange={(e) => setLockDate(e.target.value)}
                        className="h-8 text-xs font-medium w-40 shadow-2xs cursor-pointer"
                      />
                      <p className="text-[11px] text-muted-foreground">
                        {t('settings.lockDateHint')}
                      </p>
                    </div>
                  </div>

                  {lockSuccess && (
                    <p className="text-xs text-emerald-600 font-semibold">{lockSuccess}</p>
                  )}
                  {lockError && (
                    <p className="text-xs text-destructive font-semibold">{lockError}</p>
                  )}

                  <div className="flex gap-2">
                    <Button type="submit" disabled={isUpdatingLock} size="sm" className="h-8 text-xs font-semibold shadow-2xs">
                      {isUpdatingLock ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                          {t('common.saving')}
                        </>
                      ) : (
                        t('settings.saveLock')
                      )}
                    </Button>
                    {lockDate && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs font-semibold shadow-2xs"
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
                        {t('settings.removeLock')}
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
            <h3 className="text-sm font-bold tracking-tight flex items-center gap-2">
              <Building2 className="w-4 h-4 text-primary shrink-0" />
              {t('settings.registeredCompanies')}
            </h3>
            {loadingCompanies ? (
              <div className="flex justify-center p-6">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : companyList.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
                  <Building2 className="w-10 h-10 mb-2 opacity-50" />
                  <p className="text-sm">{t('settings.noCompaniesYet')}</p>
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
                          <CardTitle className="text-sm font-bold truncate pr-2">{comp.name}</CardTitle>
                          {isActive && (
                            <span className="flex items-center gap-1 text-[11px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                              <Check className="w-3 h-3" />
                              {t('common.active')}
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
                            {t('settings.activateCompany')}
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
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Plus className="w-4 h-4 text-primary shrink-0" />
                  {t('settings.addNewCompany')}
                </CardTitle>
                <CardDescription className="text-[11px] mt-0.5">{t('settings.addNewCompanyDesc')}</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleRegisterCompany} className="space-y-3">
                  <div className="space-y-1">
                    <Label htmlFor="new-name">{t('settings.tradeName')}</Label>
                    <Input
                      id="new-name"
                      placeholder="Mi Empresa SRL"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="new-tradeName">{t('settings.commercialName')}</Label>
                    <Input
                      id="new-tradeName"
                      value={newTradeName}
                      onChange={(e) => setNewTradeName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="new-rnc">{t('settings.rnc')}</Label>
                    <Input
                      id="new-rnc"
                      placeholder="131234567"
                      value={newRnc}
                      onChange={(e) => setNewRnc(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="new-regime">{t('settings.taxRegime')}</Label>
                    <Select value={newTaxRegime} onValueChange={(val) => setNewTaxRegime(val)}>
                      <SelectTrigger id="new-regime" className="w-full h-9 text-xs font-medium">
                        <SelectValue placeholder={t('settings.taxRegime')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ORDINARIO">{t('settings.ordinaryRegime')}</SelectItem>
                        <SelectItem value="RST">{t('settings.rst')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="new-phone">{t('settings.phone')}</Label>
                    <Input
                      id="new-phone"
                      value={newPhone}
                      onChange={(e) => setNewPhone(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="new-email">{t('settings.contactEmail')}</Label>
                    <Input
                      id="new-email"
                      type="email"
                      placeholder="contacto@empresa.com"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="new-address">{t('settings.address')}</Label>
                    <Input
                      id="new-address"
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
                        {t('settings.registering')}
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4 mr-2" />
                        {t('settings.registerCompany')}
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

      {activeTab === 'preferences' && (
        <div className="max-w-2xl space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Globe className="w-4 h-4 text-primary" />
                {t('settings.preferences')}
              </CardTitle>
              <CardDescription className="text-[11px] mt-0.5">{t('settings.languageDescription')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3.5 border rounded-lg bg-card">
                <div>
                  <h4 className="font-bold text-xs">{t('settings.languageSelect')}</h4>
                  <p className="text-[11px] text-muted-foreground mt-0.5">ES (Español) / EN (English)</p>
                </div>
                <LanguageSwitcher />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Moon className="w-4 h-4 text-primary" />
                Tema Visual de la Aplicación
              </CardTitle>
              <CardDescription className="text-[11px] mt-0.5">
                Personaliza la apariencia de la plataforma según tus preferencias o la luz del ambiente.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ThemeSelector />
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'security' && (
        <Card className="max-w-xl">
          <CardHeader>
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
              <KeyRound className="w-4 h-4 text-primary" />
              Cambiar Contraseña de Acceso
            </CardTitle>
            <CardDescription className="text-[11px] mt-0.5">
              Actualiza tu contraseña de usuario de forma segura.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleChangePassword} className="space-y-3 text-xs">
              <div className="space-y-1">
                <Label htmlFor="current-pass" className="text-[11px] font-semibold text-muted-foreground">Contraseña Actual *</Label>
                <div className="relative">
                  <Input
                    id="current-pass"
                    type={showCurrentPass ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="h-8 text-xs pr-9"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPass(!showCurrentPass)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none"
                    tabIndex={-1}
                  >
                    {showCurrentPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="new-pass" className="text-[11px] font-semibold text-muted-foreground">Nueva Contraseña *</Label>
                <div className="relative">
                  <Input
                    id="new-pass"
                    type={showNewPass ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="h-8 text-xs pr-9"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPass(!showNewPass)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none"
                    tabIndex={-1}
                  >
                    {showNewPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Password criteria */}
              {newPassword.length > 0 && (
                <div className="p-2.5 bg-muted/40 border rounded-md text-[11px] space-y-1 text-muted-foreground">
                  <p className="font-bold text-foreground mb-1 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                    Criterios de seguridad:
                  </p>
                  <div className={newPassword.length >= 8 ? 'text-emerald-600 font-semibold' : 'text-muted-foreground'}>
                    {newPassword.length >= 8 ? '✓' : '○'} Mínimo 8 caracteres
                  </div>
                  <div className={/\d/.test(newPassword) ? 'text-emerald-600 font-semibold' : 'text-muted-foreground'}>
                    {/\d/.test(newPassword) ? '✓' : '○'} Al menos un número (0-9)
                  </div>
                  <div className={/[A-Z]/.test(newPassword) ? 'text-emerald-600 font-semibold' : 'text-muted-foreground'}>
                    {/[A-Z]/.test(newPassword) ? '✓' : '○'} Al menos una letra mayúscula (A-Z)
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <Label htmlFor="confirm-pass" className="text-[11px] font-semibold text-muted-foreground">Confirmar Nueva Contraseña *</Label>
                <div className="relative">
                  <Input
                    id="confirm-pass"
                    type={showConfirmPass ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="h-8 text-xs pr-9"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPass(!showConfirmPass)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none"
                    tabIndex={-1}
                  >
                    {showConfirmPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {passSuccess && <p className="text-xs text-emerald-600 font-bold">{passSuccess}</p>}
              {passError && <p className="text-xs text-destructive font-bold">{passError}</p>}

              <Button type="submit" disabled={isChangingPassword} size="sm" className="h-8 text-xs font-semibold shadow-2xs gap-1.5">
                {isChangingPassword ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Actualizando...</> : 'Actualizar Contraseña'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

