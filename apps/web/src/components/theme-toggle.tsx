'use client';

import { useTheme, Theme } from '@/components/providers/theme-provider';
import { Sun, Moon, Laptop } from 'lucide-react';
import { useTranslation } from '@/lib/use-translation';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const { t } = useTranslation();

  const cycleTheme = () => {
    if (theme === 'light') setTheme('dark');
    else if (theme === 'dark') setTheme('system');
    else setTheme('light');
  };

  return (
    <button
      type="button"
      onClick={cycleTheme}
      className="p-1.5 rounded-lg border border-border bg-card text-card-foreground hover:bg-accent hover:text-accent-foreground transition-colors flex items-center justify-center gap-1.5 text-xs focus:outline-none"
      title={`Tema actual: ${theme}`}
    >
      {theme === 'light' && <Sun className="w-4 h-4 text-amber-500" />}
      {theme === 'dark' && <Moon className="w-4 h-4 text-indigo-400" />}
      {theme === 'system' && <Laptop className="w-4 h-4 text-slate-400" />}
    </button>
  );
}

export function ThemeSelector() {
  const { theme, setTheme } = useTheme();

  const options: { id: Theme; label: string; icon: any; desc: string }[] = [
    {
      id: 'light',
      label: 'Claro (Light)',
      icon: Sun,
      desc: 'Fondo claro tradicional con contraste pulido.',
    },
    {
      id: 'dark',
      label: 'Oscuro (Dark)',
      icon: Moon,
      desc: 'Fondo pizarra oscuro agradable a la vista.',
    },
    {
      id: 'system',
      label: 'Sistema (System)',
      icon: Laptop,
      desc: 'Sigue automáticamente el tema de tu dispositivo.',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {options.map((opt) => {
        const Icon = opt.icon;
        const isSelected = theme === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => setTheme(opt.id)}
            className={`p-4 border rounded-xl text-left transition-all flex flex-col justify-between space-y-3 cursor-pointer ${
              isSelected
                ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30 ring-2 ring-indigo-500/20'
                : 'border-border bg-card hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <div
                className={`p-2 rounded-lg ${
                  isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                <Icon className="w-4 h-4" />
              </div>
              {isSelected && <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">✓ Activo</span>}
            </div>
            <div>
              <p className="font-semibold text-xs text-foreground">{opt.label}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{opt.desc}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
