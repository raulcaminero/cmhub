import { useCallback, useMemo } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setLanguage, Language } from '@/store/slices/ui.slice';
import { es } from '@/locales/es';
import { en } from '@/locales/en';

const dictionaries = { es, en };

export type TranslateFn = (path: string, params?: Record<string, string | number>) => string;

function translate(dict: any, path: string, params?: Record<string, string | number>): string {
  const keys = path.split('.');
  let result: any = dict;

  for (const key of keys) {
    if (result && typeof result === 'object' && key in result) {
      result = result[key];
    } else {
      // Fallback to Spanish if key missing in current locale
      let fallback: any = es;
      for (const fk of keys) {
        if (fallback && typeof fallback === 'object' && fk in fallback) {
          fallback = fallback[fk];
        } else {
          return path;
        }
      }
      result = fallback;
      break;
    }
  }

  if (typeof result !== 'string') return path;

  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      result = result.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
    });
  }

  return result;
}

export function useTranslation() {
  const dispatch = useAppDispatch();
  const locale = useAppSelector((state) => state.ui?.language ?? 'es');

  // IMPORTANT: `t` must be referentially stable across renders (it only changes
  // when `locale` changes). Components list it in effect dependency arrays; an
  // unstable `t` makes those effects run on every render, and any effect that
  // sets state from there becomes an infinite render loop that starves the
  // Next.js router (sidebar links stop navigating).
  const t = useMemo<TranslateFn>(() => {
    const dict = dictionaries[locale] || es;
    return (path, params) => translate(dict, path, params);
  }, [locale]);

  const changeLanguage = useCallback(
    (newLang: Language) => {
      dispatch(setLanguage(newLang));
    },
    [dispatch],
  );

  return { t, locale, changeLanguage };
}
