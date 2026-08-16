'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useResetPasswordMutation } from '@/services/auth.api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, KeyRound, Loader2, ShieldCheck, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useTranslation } from '@/lib/use-translation';
import { LanguageSwitcher } from '@/components/features/layout/language-switcher';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { t } = useTranslation();

  const tokenQuery = searchParams.get('token') || '';
  const emailQuery = searchParams.get('email') || '';

  const [email, setEmail] = useState(emailQuery);
  const [token, setToken] = useState(tokenQuery);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const [resetPassword, { isLoading }] = useResetPasswordMutation();

  // Sync state if searchParams load after mount
  useEffect(() => {
    if (emailQuery && (!email || email !== emailQuery)) setEmail(emailQuery);
    if (tokenQuery && (!token || token !== tokenQuery)) setToken(tokenQuery);
  }, [emailQuery, tokenQuery]);

  // Password strength validation
  const hasMinLength = newPassword.length >= 8;
  const hasNumber = /\d/.test(newPassword);
  const hasUpper = /[A-Z]/.test(newPassword);
  const hasLower = /[a-z]/.test(newPassword);
  const isStrong = hasMinLength && hasNumber && hasUpper && hasLower;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage('');

    const effectiveEmail = (email || searchParams.get('email') || '').trim();
    const effectiveToken = (token || searchParams.get('token') || '').trim();

    if (!effectiveEmail || !effectiveToken) {
      setErrorMessage('El enlace de recuperación es incompleto. Solicita un nuevo enlace.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage(t('auth.passwordsDoNotMatch'));
      return;
    }

    if (!isStrong) {
      setErrorMessage(t('auth.passwordPolicyError'));
      return;
    }

    try {
      await resetPassword({
        email: effectiveEmail,
        token: effectiveToken,
        newPassword,
      }).unwrap();
      setIsSuccess(true);
      setTimeout(() => {
        router.push('/login');
      }, 3500);
    } catch (err: any) {
      setErrorMessage(err.data?.message || 'Error al restablecer la contraseña. El enlace puede haber expirado o ser inválido.');
    }
  }

  return (
    <Card className="shadow-lg relative">
      <div className="absolute top-4 right-4">
        <LanguageSwitcher />
      </div>
      <CardHeader className="space-y-1">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">CM</span>
          </div>
          <span className="font-semibold text-lg">CMHub</span>
        </div>
        <CardTitle className="text-2xl">{t('auth.resetTitle')}</CardTitle>
        <CardDescription>
          {t('auth.resetSubtitle')}
        </CardDescription>
      </CardHeader>

      <CardContent>
        {isSuccess ? (
          <div className="space-y-4 text-center py-4">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-base text-slate-900">{t('auth.resetSuccessTitle')}</h3>
            <p className="text-xs text-slate-600 leading-relaxed max-w-xs mx-auto">
              {t('auth.resetSuccessDesc')}
            </p>
            <div className="pt-4 border-t">
              <Link href="/login">
                <Button className="w-full text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-semibold">
                  {t('auth.signInLink')}
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t('auth.emailLabel')}</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPassword">{t('auth.newPasswordLabel')}</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Password strength criteria */}
            {newPassword.length > 0 && (
              <div className="p-3 bg-slate-50 border rounded-md text-[11px] space-y-1 text-slate-600">
                <p className="font-semibold text-slate-800 mb-1 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                  {t('auth.passwordRequirements')}
                </p>
                <div className={hasMinLength ? 'text-emerald-600 font-semibold' : 'text-slate-500'}>
                  {hasMinLength ? '✓' : '○'} {t('auth.minChars')}
                </div>
                <div className={hasNumber ? 'text-emerald-600 font-semibold' : 'text-slate-500'}>
                  {hasNumber ? '✓' : '○'} {t('auth.minNumber')}
                </div>
                <div className={hasUpper ? 'text-emerald-600 font-semibold' : 'text-slate-500'}>
                  {hasUpper ? '✓' : '○'} {t('auth.minUpper')}
                </div>
                <div className={hasLower ? 'text-emerald-600 font-semibold' : 'text-slate-500'}>
                  {hasLower ? '✓' : '○'} {t('auth.minLower')}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">{t('auth.confirmPasswordLabel')}</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none"
                  tabIndex={-1}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {errorMessage && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md text-xs text-red-700 flex items-start gap-2 leading-relaxed">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs gap-1.5" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t('auth.resetting')}
                </>
              ) : (
                <>
                  <KeyRound className="w-4 h-4" />
                  {t('auth.resetButton')}
                </>
              )}
            </Button>

            <div className="text-center pt-2">
              <Link href="/login" className="text-xs text-slate-600 hover:text-slate-900 inline-flex items-center gap-1 font-medium">
                <ArrowLeft className="w-3.5 h-3.5" />
                {t('common.cancel')}
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
