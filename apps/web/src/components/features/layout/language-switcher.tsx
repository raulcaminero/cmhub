'use client';

import { useTranslation } from '@/lib/use-translation';
import { Languages } from 'lucide-react';

export function LanguageSwitcher() {
  const { locale, changeLanguage, t } = useTranslation();

  return (
    <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-lg border text-xs">
      <Languages className="w-3.5 h-3.5 text-muted-foreground ml-1 mr-0.5" />
      <button
        onClick={() => changeLanguage('es')}
        className={`px-2 py-0.5 rounded font-medium transition-all ${
          locale === 'es'
            ? 'bg-background text-foreground shadow-sm font-semibold'
            : 'text-muted-foreground hover:text-foreground'
        }`}
        title={t('common.spanish')}
      >
        ES
      </button>
      <span className="text-muted-foreground/30">|</span>
      <button
        onClick={() => changeLanguage('en')}
        className={`px-2 py-0.5 rounded font-medium transition-all ${
          locale === 'en'
            ? 'bg-background text-foreground shadow-sm font-semibold'
            : 'text-muted-foreground hover:text-foreground'
        }`}
        title={t('common.english')}
      >
        EN
      </button>
    </div>
  );
}
