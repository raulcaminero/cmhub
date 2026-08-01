'use client';

import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useResetPasswordMutation } from '@/services/auth.api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, KeyRound, Loader2, ShieldCheck } from 'lucide-react';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const tokenQuery = searchParams.get('token') || '';
  const emailQuery = searchParams.get('email') || '';

  const [email, setEmail] = useState(emailQuery);
  const [token, setToken] = useState(tokenQuery);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const [resetPassword, { isLoading }] = useResetPasswordMutation();

  // Password strength validation
  const hasMinLength = newPassword.length >= 8;
  const hasNumber = /\d/.test(newPassword);
  const hasUpper = /[A-Z]/.test(newPassword);
  const isStrong = hasMinLength && hasNumber && hasUpper;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage('');

    if (newPassword !== confirmPassword) {
      setErrorMessage('Las contraseñas ingresadas no coinciden.');
      return;
    }

    if (!isStrong) {
      setErrorMessage('La nueva contraseña debe cumplir con los criterios de seguridad.');
      return;
    }

    try {
      await resetPassword({
        email,
        token,
        newPassword,
      }).unwrap();
      setIsSuccess(true);
    } catch (err: any) {
      setErrorMessage(err.data?.message || 'Error al restablecer la contraseña. El enlace puede haber expirado.');
    }
  }

  return (
    <Card className="shadow-lg">
      <CardHeader className="space-y-1">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">CM</span>
          </div>
          <span className="font-semibold text-lg">CMHub</span>
        </div>
        <CardTitle className="text-2xl">Nueva Contraseña</CardTitle>
        <CardDescription>
          Ingresa y confirma tu nueva contraseña de acceso.
        </CardDescription>
      </CardHeader>

      <CardContent>
        {isSuccess ? (
          <div className="space-y-4 text-center py-4">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-base text-slate-900">¡Contraseña Restablecida!</h3>
            <p className="text-xs text-slate-600 leading-relaxed max-w-xs mx-auto">
              Tu contraseña ha sido actualizada exitosamente. Ya puedes acceder con tu nueva clave.
            </p>
            <div className="pt-4 border-t">
              <Link href="/login">
                <Button className="w-full text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-semibold">
                  Iniciar Sesión Ahora
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Correo electrónico</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPassword">Nueva Contraseña</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </div>

            {/* Password strength criteria */}
            {newPassword.length > 0 && (
              <div className="p-3 bg-slate-50 border rounded-md text-[11px] space-y-1 text-slate-600">
                <p className="font-semibold text-slate-800 mb-1 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                  Requisitos de la contraseña:
                </p>
                <div className={hasMinLength ? 'text-emerald-600 font-semibold' : 'text-slate-500'}>
                  {hasMinLength ? '✓' : '○'} Mínimo 8 caracteres
                </div>
                <div className={hasNumber ? 'text-emerald-600 font-semibold' : 'text-slate-500'}>
                  {hasNumber ? '✓' : '○'} Al menos un número (0-9)
                </div>
                <div className={hasUpper ? 'text-emerald-600 font-semibold' : 'text-slate-500'}>
                  {hasUpper ? '✓' : '○'} Al menos una letra mayúscula (A-Z)
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar Nueva Contraseña</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            {errorMessage && (
              <p className="text-xs text-destructive font-semibold">{errorMessage}</p>
            )}

            <Button type="submit" className="w-full text-xs font-semibold gap-1.5" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Actualizando...
                </>
              ) : (
                <>
                  <KeyRound className="w-4 h-4" />
                  Restablecer Contraseña
                </>
              )}
            </Button>

            <div className="text-center pt-2">
              <Link href="/login" className="text-xs text-slate-600 hover:text-slate-900 inline-flex items-center gap-1 font-medium">
                <ArrowLeft className="w-3.5 h-3.5" />
                Cancelar
              </Link>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-muted-foreground">Cargando...</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
