'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useVerifyEmailMutation, useResendVerificationMutation } from '@/services/auth.api';
import { CheckCircle2, XCircle, Loader2, Mail } from 'lucide-react';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');
  const email = searchParams.get('email');

  const [verifyEmail, { isLoading }] = useVerifyEmailMutation();
  const [resendVerification, { isLoading: isResending }] = useResendVerificationMutation();

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [resendMessage, setResendMessage] = useState('');

  useEffect(() => {
    if (!token || !email) {
      setStatus('error');
      setMessage('El enlace de verificación es incompleto o inválido.');
      return;
    }

    verifyEmail({ token, email })
      .unwrap()
      .then((res) => {
        setStatus('success');
        setMessage(res.message || '¡Correo verificado exitosamente!');
      })
      .catch((err) => {
        setStatus('error');
        setMessage(err?.data?.message || 'No se pudo verificar el correo. El enlace podría estar vencido.');
      });
  }, [token, email, verifyEmail]);

  const handleResend = async () => {
    if (!email) return;
    try {
      const res = await resendVerification({ email }).unwrap();
      setResendMessage(res.message || 'Se ha enviado un nuevo enlace de confirmación.');
    } catch (err: any) {
      setResendMessage(err?.data?.message || 'Error al enviar el enlace.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-4">
      <Card className="w-full max-w-md shadow-lg border-slate-200 dark:border-slate-800">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 rounded-full flex items-center justify-center bg-indigo-50 dark:bg-indigo-950/50">
            {status === 'loading' && <Loader2 className="w-6 h-6 animate-spin text-indigo-600 dark:text-indigo-400" />}
            {status === 'success' && <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />}
            {status === 'error' && <XCircle className="w-6 h-6 text-rose-600 dark:text-rose-400" />}
          </div>
          <CardTitle className="text-2xl font-bold">
            {status === 'loading' && 'Verificando tu correo...'}
            {status === 'success' && '¡Correo Verificado!'}
            {status === 'error' && 'Verificación Fallida'}
          </CardTitle>
          <CardDescription>
            {status === 'loading' && 'Por favor espera mientras confirmamos tu cuenta.'}
            {status === 'success' && 'Tu cuenta está lista para ser utilizada.'}
            {status === 'error' && 'Ocurrió un problema al verificar la cuenta.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 text-center">
          <p className="text-sm text-slate-600 dark:text-slate-400">{message}</p>

          {status === 'success' && (
            <Button
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
              onClick={() => router.push('/login')}
            >
              Iniciar Sesión
            </Button>
          )}

          {status === 'error' && (
            <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800">
              {email && (
                <Button
                  variant="outline"
                  className="w-full flex items-center justify-center gap-2"
                  onClick={handleResend}
                  disabled={isResending}
                >
                  {isResending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                  Solicitar Nuevo Enlace
                </Button>
              )}
              {resendMessage && (
                <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">{resendMessage}</p>
              )}
              <Link href="/login" className="block text-sm font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200">
                Volver a Inicio de Sesión
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}
