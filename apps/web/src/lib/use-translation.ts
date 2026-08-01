import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setLanguage, Language } from '@/store/slices/ui.slice';
import { es } from '@/locales/es';
import { en } from '@/locales/en';

const dictionaries = { es, en };

export function useTranslation() {
  const dispatch = useAppDispatch();
  const locale = useAppSelector((state) => state.ui?.language ?? 'es');
  const dict = dictionaries[locale] || es;

  const t = (path: string, params?: Record<string, string | number>): string => {
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
  };

  const changeLanguage = (newLang: Language) => {
    dispatch(setLanguage(newLang));
  };

  return { t, locale, changeLanguage };
}
