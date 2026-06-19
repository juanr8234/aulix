import { useLocation } from 'react-router-dom';
import { useI18n, useT } from '../lib/i18n';
import ThemePicker from './ThemePicker';
import LanguagePicker from './LanguagePicker';

/** Clave de traducción por ruta. La mayoría reusa nav.*; el calendario tiene título propio. */
const TITLE_KEY: Record<string, string> = {
  '/': 'nav.dashboard',
  '/materias': 'nav.subjects',
  '/simulador': 'nav.plan',
  '/constructor': 'nav.builder',
  '/horarios': 'nav.schedule',
  '/calendario': 'topbarTitles.calendar',
  '/notas': 'nav.notes',
  '/pomodoro': 'nav.pomodoro',
  '/seguimiento': 'nav.tasks',
  '/rendimiento': 'nav.performance',
  '/repositorio': 'nav.repository',
};

function greetingKey(): string {
  const h = new Date().getHours();
  if (h < 6) return 'greeting.night';
  if (h < 13) return 'greeting.morning';
  if (h < 20) return 'greeting.afternoon';
  return 'greeting.night';
}

export default function TopBar() {
  const { pathname } = useLocation();
  const lang = useI18n((s) => s.lang);
  const t = useT();
  const titleKey = TITLE_KEY[pathname];
  const title = titleKey ? t(titleKey) : 'Aulix';
  const dateLocale = lang === 'en' ? 'en-US' : lang === 'hi' ? 'hi-IN' : 'es-AR';
  const today = new Date().toLocaleDateString(dateLocale, {
    weekday: 'long', day: '2-digit', month: 'long',
  });

  return (
    <header className="h-16 border-b border-line bg-bg-elev/40 backdrop-blur flex items-center justify-between px-6">
      <div>
        <div className="text-[11px] uppercase tracking-[0.18em] text-ink-mute">{t(greetingKey())}</div>
        <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-sm text-ink-dim capitalize">{today}</div>
        <LanguagePicker />
        <ThemePicker />
      </div>
    </header>
  );
}
