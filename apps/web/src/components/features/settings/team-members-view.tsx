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

  const handleRemoveUser = async (userId: string, userEmail: string) => {
    if (!confirm(`¿Estás seguro de que deseas remover a ${userEmail} de esta empresa?`)) return;

    setSuccessMsg('');
    setErrorMsg('');

    try {
      await removeCompanyUser({ companyId, userId }).unwrap();
      setSuccessMsg('Usuario removido de la empresa.');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: any) {
      setErrorMsg(err?.data?.message || 'Error al remover el usuario.');
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
                        onValueChange={(val) => handleRoleChange(u.userId, val as any)}
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
                        onClick={() => handleRemoveUser(u.userId, u.email)}
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
    </div>
  );
}
