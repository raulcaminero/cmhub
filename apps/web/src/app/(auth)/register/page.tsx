'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useRegisterMutation } from '@/services/auth.api';
import { setCredentials } from '@/store/slices/auth.slice';
import { useAppDispatch } from '@/store/hooks';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function RegisterPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [register, { isLoading, error }] = useRegisterMutation();
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const result = await register({ email, firstName, lastName, password });
    if ('data' in result && result.data) {
      dispatch(setCredentials(result.data));
      router.push('/cmhub');
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
        <CardTitle className="text-2xl">Crear una cuenta</CardTitle>
        <CardDescription>Regístrate para comenzar a gestionar tu contabilidad</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">Nombre</Label>
              <Input
                id="firstName"
                placeholder="Juan"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Apellido</Label>
              <Input
                id="lastName"
                placeholder="Pérez"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Correo electrónico</Label>
            <Input
              id="email"
              type="email"
              placeholder="juan.perez@empresa.com.do"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
          </div>
          {error && (
            <p className="text-sm text-destructive">Error al registrarse. El correo ya podría estar en uso.</p>
          )}
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Registrando...' : 'Registrarse'}
          </Button>
          <div className="text-center text-sm text-muted-foreground pt-2">
            ¿Ya tienes una cuenta?{' '}
            <Link href="/login" className="text-primary hover:underline font-medium">
              Inicia sesión
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
