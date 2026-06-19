/**
 * Temas de color de la app. El color de marca vive como variables CSS
 * (ver index.css); acá solo elegimos cuál `data-theme` aplicar.
 * La preferencia es global (no por perfil) y se guarda en localStorage.
 */
export interface Theme {
  id: string;
  label: string;
  swatch: string; // color para el selector
}

export const THEMES: Theme[] = [
  { id: 'blue',    label: 'Azul',      swatch: '#3b82f6' },
  { id: 'pink',    label: 'Rosa',      swatch: '#f19cbb' },
  { id: 'teal',    label: 'Teal',      swatch: '#2596be' },
  { id: 'violet',  label: 'Violeta',   swatch: '#a855f7' },
  { id: 'emerald', label: 'Esmeralda', swatch: '#10b981' },
  { id: 'amber',   label: 'Ámbar',     swatch: '#f59e0b' },
];

const KEY = 'aulix:theme';

export function getTheme(): string {
  const t = localStorage.getItem(KEY);
  return THEMES.some((x) => x.id === t) ? (t as string) : 'blue';
}

export function applyTheme(id: string) {
  document.documentElement.dataset.theme = id;
  localStorage.setItem(KEY, id);
}

/** Aplica el tema guardado al arrancar (antes del render para evitar parpadeo). */
export function initTheme() {
  document.documentElement.dataset.theme = getTheme();
}
