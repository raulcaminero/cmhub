'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLoginMutation } from '@/services/auth.api';
import { setCredentials } from '@/store/slices/auth.slice';
import { useAppDispatch } from '@/store/hooks';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react';
import { useTranslation } from '@/lib/use-translation';
import { LanguageSwitcher } from '@/components/features/layout/language-switcher';

export default function LoginPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const [login, { isLoading, error }] = useLoginMutation();
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const result = await login({ email, password });
    if ('data' in result && result.data) {
      dispatch(setCredentials(result.data));
      setIsRedirecting(true);
      router.push('/cmhub' as any);
    }
  }

  const errorMessage = (error as any)?.data?.message || (error ? t('auth.invalidCredentials') : null);

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
        <CardTitle className="text-2xl" suppressHydrationWarning>{t('auth.loginTitle')}</CardTitle>
        <CardDescription suppressHydrationWarning>{t('auth.loginSubtitle')}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">{t('auth.emailLabel')}</Label>
            <Input
              id="email"
              type="email"
              placeholder="usuario@empresa.com.do"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading || isRedirecting}
            />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label htmlFor="password">{t('auth.passwordLabel')}</Label>
              <Link href={'/forgot-password' as any} className="text-xs text-indigo-600 hover:underline font-medium">
                {t('auth.forgotPasswordLink')}
              </Link>
            </div>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="pr-10"
                disabled={isLoading || isRedirecting}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none"
                tabIndex={-1}
                disabled={isLoading || isRedirecting}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md text-xs text-red-700 flex items-start gap-2 leading-relaxed">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <Button 
            type="submit" 
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold flex items-center justify-center gap-2" 
            disabled={isLoading || isRedirecting}
          >
            {(isLoading || isRedirecting) && <Loader2 className="w-4 h-4 animate-spin" />}
            {isLoading ? t('auth.loggingIn') : isRedirecting ? 'Cargando panel...' : t('auth.loginButton')}
          </Button>

          <div className="text-center text-xs text-muted-foreground pt-2">
            {t('auth.noAccount')}{' '}
            <Link href={'/register' as any} className="text-indigo-600 hover:underline font-semibold">
              {t('auth.registerLink')}
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
