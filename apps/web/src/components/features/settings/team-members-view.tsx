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
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              Equipo y Control de Accesos
            </CardTitle>
            <CardDescription className="text-sm text-slate-500 dark:text-slate-400">
              Gestiona los miembros de tu empresa y sus niveles de acceso (RBAC).
            </CardDescription>
          </div>
          <Button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <UserPlus className="w-4 h-4" />
            Agregar Miembro
          </Button>
        </CardHeader>

        <CardContent className="space-y-4">
          {successMsg && (
            <div className="flex items-center gap-2 p-3 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg dark:bg-emerald-950/40 dark:text-emerald-300">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              {successMsg}
            </div>
          )}

          {errorMsg && (
            <div className="flex items-center gap-2 p-3 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg dark:bg-rose-950/40 dark:text-rose-300">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {errorMsg}
            </div>
          )}

          {showAddForm && (
            <form onSubmit={handleAddUser} className="p-4 border rounded-xl bg-slate-50 dark:bg-slate-900/60 space-y-4">
              <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-indigo-600" />
                Invitar / Agregar Nuevo Miembro
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="userEmail">Correo Electrónico del Usuario</Label>
                  <Input
                    id="userEmail"
                    type="email"
                    placeholder="ejemplo@empresa.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="userRole">Nivel de Acceso (Rol)</Label>
                  <select
                    id="userRole"
                    className="w-full h-10 px-3 py-2 text-sm bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={role}
                    onChange={(e) => setRole(e.target.value as any)}
                  >
                    <option value="CONTADOR">CONTADOR — Crear/Anular Invoices, Gastos y Asientos</option>
                    <option value="ADMIN">ADMINISTRADOR — Control Total (Empresa, NCFs, Usuarios)</option>
                    <option value="VIEWER">AUXILIAR / LECTOR — Solo lectura de reportes y facturas</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setShowAddForm(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isAdding} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                  {isAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirmar y Asignar Rol'}
                </Button>
              </div>
            </form>
          )}

          {isLoading ? (
            <div className="p-8 text-center text-slate-500">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
              Cargando miembros del equipo...
            </div>
          ) : !users || users.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-6">No hay otros miembros registrados en esta empresa.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Correo Electrónico</TableHead>
                  <TableHead>Nivel de Acceso</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.userId}>
                    <TableCell className="font-medium text-slate-900 dark:text-slate-100">
                      {u.firstName} {u.lastName}
                    </TableCell>
                    <TableCell className="text-slate-600 dark:text-slate-400 font-mono text-xs">
                      {u.email}
                    </TableCell>
                    <TableCell>
                      <select
                        className={`text-xs font-semibold px-2.5 py-1 rounded-full border cursor-pointer ${getRoleBadgeClass(u.role)}`}
                        value={u.role}
                        onChange={(e) => handleRoleChange(u.userId, e.target.value as any)}
                        disabled={isUpdating}
                      >
                        <option value="ADMIN">ADMINISTRADOR</option>
                        <option value="CONTADOR">CONTADOR</option>
                        <option value="VIEWER">AUXILIAR / LECTOR</option>
                      </select>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-rose-600 hover:text-rose-800 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                        onClick={() => handleRemoveUser(u.userId, u.email)}
                        disabled={isRemoving}
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
    </div>
  );
}
