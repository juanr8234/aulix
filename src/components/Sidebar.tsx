import { useState, useRef, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, BookOpen, CalendarDays, NotebookPen, Timer,
  KanbanSquare, BarChart3, FolderOpen, CalendarRange, Network,
  ChevronDown, Code, User, RotateCcw, RefreshCw, PencilRuler, Compass,
} from 'lucide-react';
import Logo from './Logo';
import { useStore } from '../store';
import { type ProfileId } from '../types';
import { useT } from '../lib/i18n';

const sections: { titleKey: string; links: { to: string; icon: typeof LayoutDashboard; labelKey: string; end?: boolean }[] }[] = [
  {
    titleKey: 'sections.home',
    links: [{ to: '/', icon: LayoutDashboard, labelKey: 'nav.dashboard', end: true }],
  },
  {
    titleKey: 'sections.career',
    links: [
      { to: '/materias',   icon: BookOpen,      labelKey: 'nav.subjects' },
      { to: '/simulador',  icon: Network,       labelKey: 'nav.plan' },
      { to: '/constructor',icon: PencilRuler,   labelKey: 'nav.builder' },
      { to: '/horarios',   icon: CalendarDays,  labelKey: 'nav.schedule' },
      { to: '/calendario', icon: CalendarRange, labelKey: 'nav.calendar' },
    ],
  },
  {
    titleKey: 'sections.study',
    links: [
      { to: '/notas',        icon: NotebookPen,   labelKey: 'nav.notes' },
      { to: '/pomodoro',     icon: Timer,         labelKey: 'nav.pomodoro' },
      { to: '/seguimiento',  icon: KanbanSquare,  labelKey: 'nav.tasks' },
      { to: '/rendimiento',  icon: BarChart3,     labelKey: 'nav.performance' },
      { to: '/repositorio',  icon: FolderOpen,    labelKey: 'nav.repository' },
    ],
  },
];

export default function Sidebar() {
  const t = useT();
  return (
    <aside className="w-60 shrink-0 border-r border-line bg-bg-elev/60 backdrop-blur flex flex-col">
      <div className="px-5 py-5 border-b border-line">
        <Logo size={36} showWord />
        <div className="text-[10px] uppercase tracking-[0.18em] text-ink-mute mt-2 ml-12 -translate-y-3">
          {t('sidebar.tagline')}
        </div>
      </div>

      <ProfileSwitcher />

      <nav className="flex-1 p-3 space-y-5 overflow-y-auto">
        {sections.map((section) => (
          <div key={section.titleKey}>
            <div className="px-3 mb-1.5 text-[10px] uppercase tracking-[0.2em] text-ink-mute font-semibold">
              {t(section.titleKey)}
            </div>
            <div className="space-y-0.5">
              {section.links.map((l) => (
                <NavLink
                  key={l.to}
                  to={l.to}
                  end={l.end}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition ${
                      isActive
                        ? 'bg-brand/15 text-ink font-semibold border border-brand/30 shadow-sm'
                        : 'text-ink-dim hover:text-ink hover:bg-bg-soft border border-transparent'
                    }`
                  }
                >
                  <l.icon className="w-[18px] h-[18px] shrink-0" />
                  <span className="truncate">{t(l.labelKey)}</span>
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div data-tour="local" className="p-4 border-t border-line text-[11px] text-ink-mute">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>{t('sidebar.localData')}</span>
        </div>
        <div className="mt-1 opacity-70">{t('sidebar.beta')}</div>
      </div>
    </aside>
  );
}

function ProfileSwitcher() {
  const activeProfile = useStore((s) => s.activeProfile);
  const switchProfile = useStore((s) => s.switchProfile);
  const resetProfile = useStore((s) => s.resetProfile);
  const resetOnboarding = useStore((s) => s.resetOnboarding);
  const t = useT();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Cerrar al click afuera
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const profileName = t(`profile.${activeProfile}.name`);
  const Icon = activeProfile === 'dev' ? Code : User;

  return (
    <div data-tour="profiles" className="px-3 py-3 border-b border-line relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2.5 p-2 rounded-lg hover:bg-bg-soft transition border border-line bg-bg-card"
      >
        <div className={`w-8 h-8 rounded-md grid place-items-center shrink-0 ${
          activeProfile === 'dev' ? 'bg-amber-500/20 text-amber-300' : 'bg-brand/20 text-brand-glow'
        }`}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0 text-left">
          <div className="text-[10px] uppercase tracking-wider text-ink-mute font-semibold">
            {t('profile.label')}
          </div>
          <div className="text-sm font-semibold truncate">{profileName}</div>
        </div>
        <ChevronDown className={`w-4 h-4 text-ink-mute transition ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute z-20 left-3 right-3 top-full mt-1 bg-bg-card border border-line rounded-lg shadow-soft overflow-hidden animate-fade-in">
          {(['personal', 'dev'] as ProfileId[]).map((p) => {
            const isActive = p === activeProfile;
            const PIcon = p === 'dev' ? Code : User;
            return (
              <button
                key={p}
                onClick={() => { switchProfile(p); setOpen(false); }}
                className={`w-full flex items-center gap-2.5 p-2.5 hover:bg-bg-soft transition text-left border-b border-line last:border-b-0 ${
                  isActive ? 'bg-brand/10' : ''
                }`}
              >
                <div className={`w-7 h-7 rounded-md grid place-items-center shrink-0 ${
                  p === 'dev' ? 'bg-amber-500/20 text-amber-300' : 'bg-brand/20 text-brand-glow'
                }`}>
                  <PIcon className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold flex items-center gap-1.5">
                    {t(`profile.${p}.name`)}
                    {isActive && <span className="text-[9px] text-brand-glow">● {t('profile.active')}</span>}
                  </div>
                  <div className="text-[10px] text-ink-mute truncate">{t(`profile.${p}.desc`)}</div>
                </div>
              </button>
            );
          })}
          <div className="border-t border-line bg-bg-elev/50 p-2 space-y-1">
            <button
              onClick={() => {
                window.dispatchEvent(new Event('aulix:tour'));
                setOpen(false);
              }}
              className="w-full text-left text-xs text-ink-dim hover:text-ink py-1.5 px-2 rounded hover:bg-bg-soft flex items-center gap-2"
            >
              <Compass className="w-3 h-3" /> {t('profile.repeatTour')}
            </button>
            <button
              onClick={() => {
                if (confirm(t('profile.confirmWelcome'))) {
                  resetOnboarding();
                  setOpen(false);
                }
              }}
              className="w-full text-left text-xs text-ink-dim hover:text-ink py-1.5 px-2 rounded hover:bg-bg-soft flex items-center gap-2"
            >
              <RefreshCw className="w-3 h-3" /> {t('profile.repeatWelcome')}
            </button>
            <button
              onClick={() => {
                if (confirm(t('profile.confirmReset', { name: profileName }))) {
                  resetProfile(activeProfile);
                  setOpen(false);
                }
              }}
              className="w-full text-left text-xs text-red-400 hover:text-red-300 py-1.5 px-2 rounded hover:bg-red-500/10 flex items-center gap-2"
            >
              <RotateCcw className="w-3 h-3" /> {t('profile.resetProfile')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
