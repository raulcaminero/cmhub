'use client';

import { useTheme, Theme } from '@/components/providers/theme-provider';
import { Sun, Moon } from 'lucide-react';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="p-1.5 rounded-lg border border-border bg-card text-card-foreground hover:bg-accent hover:text-accent-foreground transition-colors flex items-center justify-center gap-1.5 text-xs focus:outline-none"
      title={theme === 'light' ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro'}
    >
      {theme === 'light' ? (
        <Sun className="w-4 h-4 text-amber-500" />
      ) : (
        <Moon className="w-4 h-4 text-indigo-400" />
      )}
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
      desc: 'Fondo pizarra oscuro agradable a la vista con textos nítidos.',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl">
      {options.map((opt) => {
        const Icon = opt.icon;
        const isSelected = theme === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => setTheme(opt.id)}
            className={`p-3.5 border rounded-xl text-left transition-all flex flex-col justify-between space-y-2.5 cursor-pointer ${
              isSelected
                ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                : 'border-border bg-card hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <div
                className={`p-1.5 rounded-lg ${
                  isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                }`}
              >
                <Icon className="w-4 h-4" />
              </div>
              {isSelected && <span className="text-[11px] font-bold text-primary">✓ Activo</span>}
            </div>
            <div>
              <p className="font-bold text-xs text-foreground">{opt.label}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{opt.desc}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
