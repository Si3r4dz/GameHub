import { createContext, useContext, useState, useCallback, useMemo } from 'react';
import type { ReactNode } from 'react';
import type { Locale, TranslationMap, TFunction } from './types.js';
import { pl } from './locales/pl.js';
import { en } from './locales/en.js';

const platformLocales: Record<Locale, TranslationMap> = { pl, en };

function detectLocale(): Locale {
  // Check localStorage first
  const saved = localStorage.getItem('gamehub_locale');
  if (saved === 'pl' || saved === 'en') return saved;

  // Auto-detect from browser
  const lang = navigator.language.toLowerCase();
  if (lang.startsWith('pl')) return 'pl';
  return 'en';
}

function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, key) =>
    params[key] !== undefined ? String(params[key]) : `{${key}}`,
  );
}

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: TFunction;
  registerTranslations: (locale: Locale, translations: TranslationMap) => void;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(detectLocale);
  const [extra, setExtra] = useState<Record<Locale, TranslationMap>>({ pl: {}, en: {} });

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    localStorage.setItem('gamehub_locale', l);
  }, []);

  const registerTranslations = useCallback((l: Locale, translations: TranslationMap) => {
    setExtra((prev) => ({
      ...prev,
      [l]: { ...prev[l], ...translations },
    }));
  }, []);

  const t: TFunction = useCallback(
    (key: string, params?: Record<string, string | number>) => {
      const value =
        extra[locale]?.[key] ??
        platformLocales[locale]?.[key] ??
        extra['en']?.[key] ??
        platformLocales['en']?.[key] ??
        key;
      return interpolate(value, params);
    },
    [locale, extra],
  );

  const value = useMemo(
    () => ({ locale, setLocale, t, registerTranslations }),
    [locale, setLocale, t, registerTranslations],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useT(): TFunction {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useT must be used within I18nProvider');
  return ctx.t;
}

export function useLocale(): { locale: Locale; setLocale: (l: Locale) => void } {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useLocale must be used within I18nProvider');
  return { locale: ctx.locale, setLocale: ctx.setLocale };
}

export function useRegisterTranslations() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useRegisterTranslations must be used within I18nProvider');
  return ctx.registerTranslations;
}
