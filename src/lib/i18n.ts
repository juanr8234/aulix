import { create } from 'zustand';
import { useMemo } from 'react';
import es from '../locales/es.json';
import en from '../locales/en.json';
import hi from '../locales/hi.json';

/**
 * i18n propio y liviano (sin librerías). Cada idioma es un JSON en src/locales.
 * Solo traduce textos estáticos de la UI; el contenido del usuario queda intacto.
 * Para sumar un idioma: agregá su JSON, importalo acá y registralo en LOCALES.
 */
export interface Locale {
  id: string;
  label: string;
  flag: string;
}

export const LOCALES: Locale[] = [
  { id: 'es', label: 'Español', flag: '🇪🇸' },
  { id: 'en', label: 'English', flag: '🇬🇧' },
  { id: 'hi', label: 'हिन्दी', flag: '🇮🇳' },
];

const DICTS: Record<string, any> = { es, en, hi };
const DEFAULT = 'es';
const KEY = 'aulix:lang';

function lookup(lang: string, key: string): string | undefined {
  const parts = key.split('.');
  let cur: any = DICTS[lang];
  for (const p of parts) {
    if (cur == null) return undefined;
    cur = cur[p];
  }
  return typeof cur === 'string' ? cur : undefined;
}

/** Traduce `key` con fallback al español y, por último, a la propia key. Soporta {{vars}}. */
export function translate(lang: string, key: string, vars?: Record<string, string | number>): string {
  let s = lookup(lang, key) ?? lookup(DEFAULT, key) ?? key;
  if (vars) {
    for (const k in vars) s = s.replace(new RegExp(`{{\\s*${k}\\s*}}`, 'g'), String(vars[k]));
  }
  return s;
}

function initialLang(): string {
  try {
    const l = localStorage.getItem(KEY);
    if (l && DICTS[l]) return l;
  } catch {}
  return DEFAULT;
}

interface I18nStore {
  lang: string;
  setLang: (l: string) => void;
}

export const useI18n = create<I18nStore>((set) => ({
  lang: initialLang(),
  setLang: (l) => {
    try { localStorage.setItem(KEY, l); } catch {}
    document.documentElement.lang = l;
    set({ lang: l });
  },
}));

/** Hook principal: devuelve `t(key, vars?)` y re-renderiza al cambiar de idioma. */
export function useT() {
  const lang = useI18n((s) => s.lang);
  return useMemo(() => (key: string, vars?: Record<string, string | number>) => translate(lang, key, vars), [lang]);
}

/** Aplica el idioma guardado al <html> al arrancar. */
export function initLang() {
  document.documentElement.lang = initialLang();
}
