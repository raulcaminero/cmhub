'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ShieldAlert, X } from 'lucide-react';

export function AccessDeniedModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const handleAccessDenied = (event: Event) => {
      const customEvent = event as CustomEvent<{ message?: string }>;
      setMessage(customEvent.detail?.message || 'No tienes permisos suficientes para realizar esta acción.');
      setIsOpen(true);
    };

    window.addEventListener('cmhub:access-denied', handleAccessDenied);
    return () => {
      window.removeEventListener('cmhub:access-denied', handleAccessDenied);
    };
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-card text-card-foreground p-6 rounded-xl w-full max-w-md shadow-2xl border relative text-center flex flex-col items-center">
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Cerrar</span>
        </button>

        <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-3">
          <ShieldAlert className="w-6 h-6 animate-pulse" />
        </div>

        <h3 className="text-base font-bold text-foreground">
          Acceso Restringido
        </h3>
        <p className="text-xs text-muted-foreground mt-1 mb-4 max-w-xs leading-relaxed">
          Tu rol de usuario actual no tiene los permisos suficientes para realizar o guardar esta operación.
        </p>

        {message && (
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-lg p-3 w-full mb-4 text-xs text-amber-800 dark:text-amber-300 font-medium">
            {message}
          </div>
        )}

        <Button
          onClick={() => setIsOpen(false)}
          className="w-full h-9 text-xs font-medium bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          Entendido
        </Button>
      </div>
    </div>
  );
}
