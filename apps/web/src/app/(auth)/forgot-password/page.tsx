'use client';

import { useState } from 'react';
import { useForgotPasswordMutation } from '@/services/auth.api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, Loader2, Mail, AlertCircle } from 'lucide-react';
import { useTranslation } from '@/lib/use-translation';
import { LanguageSwitcher } from '@/components/features/layout/language-switcher';

export default function ForgotPasswordPage() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const [forgotPassword, { isLoading }] = useForgotPasswordMutation();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage('');
    try {
      const res = await forgotPassword({ email }).unwrap();
      setIsSuccess(true);
      setSuccessMessage(res.message);
    } catch (err: any) {
      setErrorMessage(err.data?.message || 'Ocurrió un error al procesar tu solicitud.');
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
        <CardTitle className="text-2xl">{t('auth.forgotTitle')}</CardTitle>
        <CardDescription>
          {t('auth.forgotSubtitle')}
        </CardDescription>
      </CardHeader>

      <CardContent>
        {isSuccess ? (
          <div className="space-y-4 text-center py-4">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-base text-slate-900">{t('auth.emailSentTitle')}</h3>
            <p className="text-xs text-slate-600 leading-relaxed max-w-xs mx-auto">
              {successMessage}
            </p>
            <div className="pt-4 border-t">
              <Link href="/login">
                <Button variant="outline" className="w-full text-xs gap-1.5">
                  <ArrowLeft className="w-4 h-4" />
                  {t('auth.backToLogin')}
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
                placeholder="usuario@empresa.com.do"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
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
                  {t('auth.sending')}
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4" />
                  {t('auth.sendInstructions')}
                </>
              )}
            </Button>

            <div className="text-center pt-2">
              <Link href="/login" className="text-xs text-slate-600 hover:text-slate-900 inline-flex items-center gap-1 font-medium">
                <ArrowLeft className="w-3.5 h-3.5" />
                {t('auth.backToLogin')}
              </Link>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
