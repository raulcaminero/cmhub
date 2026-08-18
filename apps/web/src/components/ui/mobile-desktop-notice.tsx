'use client';

import { useState } from 'react';
import { Monitor, X } from 'lucide-react';

interface MobileDesktopNoticeProps {
  message?: string;
}

export function MobileDesktopNotice({
  message = 'Esta sección incluye herramientas complejas. En celular puedes consultar tus datos; para procesar o editar con mayor comodidad, te recomendamos usar una computadora.',
}: MobileDesktopNoticeProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="md:hidden mb-4 p-3 bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200 rounded-lg flex items-start gap-2.5 text-xs leading-relaxed">
      <Monitor className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
      <span className="flex-1">{message}</span>
      <button
        onClick={() => setDismissed(true)}
        className="p-1 text-amber-700/60 hover:text-amber-900 dark:text-amber-300/60 dark:hover:text-amber-100 rounded-md shrink-0"
        aria-label="Cerrar aviso"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
