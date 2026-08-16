'use client';

import { useState } from 'react';
import {
  useGetCompanyUsersQuery,
  useAddCompanyUserMutation,
  useUpdateUserRoleMutation,
  useRemoveCompanyUserMutation,
  CompanyUser,
} from '@/services/companies.api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Users,
  UserPlus,
  Shield,
  Trash2,
  Loader2,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  X,
} from 'lucide-react';

interface TeamMembersViewProps {
  companyId: string;
}

export function TeamMembersView({ companyId }: TeamMembersViewProps) {
  const { data: users, isLoading, refetch } = useGetCompanyUsersQuery(companyId);
  const [addCompanyUser, { isLoading: isAdding }] = useAddCompanyUserMutation();
  const [updateUserRole, { isLoading: isUpdating }] = useUpdateUserRoleMutation();
  const [removeCompanyUser, { isLoading: isRemoving }] = useRemoveCompanyUserMutation();

  const [showAddForm, setShowAddForm] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'ADMIN' | 'CONTADOR' | 'VIEWER'>('CONTADOR');
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const [pendingRoleChange, setPendingRoleChange] = useState<{
    user: CompanyUser;
    newRole: 'ADMIN' | 'CONTADOR' | 'VIEWER';
  } | null>(null);

  const [userToRemove, setUserToRemove] = useState<{
    id: string;
    email: string;
  } | null>(null);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg('');
    setErrorMsg('');

    if (!email) return;

    try {
      await addCompanyUser({ companyId, email, role }).unwrap();
      setSuccessMsg('Miembro agregado al equipo exitosamente.');
      setEmail('');
      setShowAddForm(false);
      setTimeout(() => setSuccessMsg(''), 3500);
    } catch (err: any) {
      setErrorMsg(err?.data?.message || 'Error al agregar el usuario. Verifica que el correo esté registrado en CMHub.');
    }
  };

  const handleRoleChange = async (userId: string, newRole: 'ADMIN' | 'CONTADOR' | 'VIEWER') => {
    setSuccessMsg('');
    setErrorMsg('');

    try {
      await updateUserRole({ companyId, userId, role: newRole }).unwrap();
      setSuccessMsg('Rol del usuario actualizado exitosamente.');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: any) {
      setErrorMsg(err?.data?.message || 'Error al cambiar el rol.');
    }
  };

  const handleRemoveUser = async (userId: string) => {
    setSuccessMsg('');
    setErrorMsg('');
    setUserToRemove(null);

    try {
      await removeCompanyUser({ companyId, userId }).unwrap();
      setSuccessMsg('Usuario removido de la empresa.');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: any) {
      setErrorMsg(err?.data?.message || 'Error al remover el usuario.');
    }
  };

  const getRoleLabel = (r: 'ADMIN' | 'CONTADOR' | 'VIEWER') => {
    switch (r) {
      case 'ADMIN': return 'ADMINISTRADOR';
      case 'CONTADOR': return 'CONTADOR';
      case 'VIEWER': return 'AUXILIAR / LECTOR';
    }
  };

  const getRoleBadgeClass = (userRole: string) => {
    switch (userRole) {
      case 'ADMIN':
        return 'bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 border-purple-200';
      case 'CONTADOR':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border-blue-200';
      default:
        return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 sm:pb-2.5">
          <div>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              Equipo y Control de Accesos
            </CardTitle>
            <CardDescription className="text-[11px] text-muted-foreground mt-0.5">
              Gestiona los miembros de tu empresa y sus niveles de acceso (RBAC).
            </CardDescription>
          </div>
          <Button
            size="sm"
            onClick={() => setShowAddForm(!showAddForm)}
            className="h-8 text-xs gap-1.5 font-semibold shadow-2xs"
          >
            <UserPlus className="w-3.5 h-3.5" />
            Agregar Miembro
          </Button>
        </CardHeader>

        <CardContent className="space-y-4">
          {successMsg && (
            <div className="flex items-center gap-2 p-2.5 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg dark:bg-emerald-950/40 dark:text-emerald-300">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              {successMsg}
            </div>
          )}

          {errorMsg && (
            <div className="flex items-center gap-2 p-2.5 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg dark:bg-rose-950/40 dark:text-rose-300">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              {errorMsg}
            </div>
          )}

          {showAddForm && (
            <form onSubmit={handleAddUser} className="p-3.5 border rounded-xl bg-slate-50 dark:bg-slate-900/60 space-y-3">
              <h4 className="font-bold text-xs text-foreground flex items-center gap-2">
                <UserPlus className="w-3.5 h-3.5 text-primary" />
                Invitar / Agregar Nuevo Miembro
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="userEmail" className="text-[11px] font-semibold text-muted-foreground">Correo Electrónico del Usuario</Label>
                  <Input
                    id="userEmail"
                    type="email"
                    placeholder="ejemplo@empresa.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-8 text-xs"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="userRole" className="text-[11px] font-semibold text-muted-foreground">Nivel de Acceso (Rol)</Label>
                  <Select value={role} onValueChange={(val) => setRole(val as any)}>
                    <SelectTrigger id="userRole" className="w-full h-8 text-xs font-medium">
                      <SelectValue placeholder="Seleccionar rol" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CONTADOR" className="text-xs">CONTADOR — Crear/Anular Invoices, Gastos y Asientos</SelectItem>
                      <SelectItem value="ADMIN" className="text-xs">ADMINISTRADOR — Control Total (Empresa, NCFs, Usuarios)</SelectItem>
                      <SelectItem value="VIEWER" className="text-xs">AUXILIAR / LECTOR — Solo lectura de reportes y facturas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <Button type="button" variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setShowAddForm(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isAdding} size="sm" className="h-8 text-xs font-semibold shadow-2xs">
                  {isAdding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Confirmar y Asignar Rol'}
                </Button>
              </div>
            </form>
          )}

          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground text-xs">
              <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
              Cargando miembros del equipo...
            </div>
          ) : !users || users.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">No hay otros miembros registrados en esta empresa.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-[11px] font-bold">Usuario</TableHead>
                  <TableHead className="text-[11px] font-bold">Correo Electrónico</TableHead>
                  <TableHead className="text-[11px] font-bold">Nivel de Acceso</TableHead>
                  <TableHead className="text-[11px] font-bold text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.userId}>
                    <TableCell className="font-medium text-xs text-foreground">
                      {u.firstName} {u.lastName}
                    </TableCell>
                    <TableCell className="text-muted-foreground font-mono text-[11px]">
                      {u.email}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={u.role}
                        onValueChange={(val) => {
                          if (val !== u.role) {
                            setPendingRoleChange({ user: u, newRole: val as any });
                          }
                        }}
                        disabled={isUpdating}
                      >
                        <SelectTrigger className={`h-7 text-[11px] font-semibold px-2.5 rounded-md border ${getRoleBadgeClass(u.role)}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ADMIN" className="text-xs">ADMINISTRADOR</SelectItem>
                          <SelectItem value="CONTADOR" className="text-xs">CONTADOR</SelectItem>
                          <SelectItem value="VIEWER" className="text-xs">AUXILIAR / LECTOR</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-rose-600 hover:text-rose-800 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                        onClick={() => setUserToRemove({ id: u.userId, email: u.email })}
                        disabled={isRemoving}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Modal Confirmación de Cambio de Rol */}
      {pendingRoleChange && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-card text-card-foreground p-6 rounded-xl w-full max-w-md shadow-2xl border relative space-y-4">
            <button
              type="button"
              onClick={() => setPendingRoleChange(null)}
              className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Cerrar</span>
            </button>

            <h3 className="text-sm font-bold flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary shrink-0" />
              Confirmar Cambio de Rol
            </h3>
            
            <p className="text-xs text-muted-foreground leading-relaxed">
              ¿Estás seguro de que deseas modificar los permisos del usuario?
            </p>

            <div className="bg-muted/30 border rounded-lg p-3 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground font-semibold">Usuario:</span>
                <span className="font-bold text-foreground">{pendingRoleChange.user.firstName} {pendingRoleChange.user.lastName}</span>
              </div>
              <div className="flex justify-between font-mono text-[11px]">
                <span className="text-muted-foreground font-sans font-semibold">Correo:</span>
                <span>{pendingRoleChange.user.email}</span>
              </div>
              <div className="border-t pt-2 mt-1 flex justify-between items-center">
                <span className="text-muted-foreground font-semibold">Rol Actual:</span>
                <span className="font-semibold text-muted-foreground">{getRoleLabel(pendingRoleChange.user.role)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground font-semibold">Nuevo Rol:</span>
                <span className="font-bold text-primary">{getRoleLabel(pendingRoleChange.newRole)}</span>
              </div>
            </div>

            {pendingRoleChange.user.role === 'ADMIN' && pendingRoleChange.newRole !== 'ADMIN' && (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 rounded-lg text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Atención:</strong> Al cambiar un Administrador a {getRoleLabel(pendingRoleChange.newRole)}, se revocarán sus permisos para modificar la empresa, NCFs y gestionar miembros del equipo.
                </span>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 text-xs font-medium"
                onClick={() => setPendingRoleChange(null)}
                disabled={isUpdating}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={isUpdating}
                onClick={async () => {
                  await handleRoleChange(pendingRoleChange.user.userId, pendingRoleChange.newRole);
                  setPendingRoleChange(null);
                }}
                className="h-8 text-xs font-medium gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                {isUpdating ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  'Confirmar y Guardar Rol'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Confirmación de Remover Usuario */}
      {userToRemove && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-card text-card-foreground p-6 rounded-xl w-full max-w-md shadow-2xl border relative space-y-4">
            <button
              type="button"
              onClick={() => setUserToRemove(null)}
              className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Cerrar</span>
            </button>

            <h3 className="text-sm font-bold flex items-center gap-2 text-rose-600">
              <Trash2 className="w-4 h-4 shrink-0" />
              Remover Miembro del Equipo
            </h3>

            <p className="text-xs text-muted-foreground leading-relaxed">
              ¿Estás seguro de que deseas revocar el acceso a la empresa para <strong className="text-foreground">{userToRemove.email}</strong>?
            </p>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 text-xs font-medium"
                onClick={() => setUserToRemove(null)}
                disabled={isRemoving}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={isRemoving}
                onClick={() => handleRemoveUser(userToRemove.id)}
                className="h-8 text-xs font-medium bg-rose-600 hover:bg-rose-700 text-white"
              >
                {isRemoving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Removiendo...
                  </>
                ) : (
                  'Sí, Remover Miembro'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
