import { useEffect, useRef, useState } from 'react';
import { Palette, Check } from 'lucide-react';
import { THEMES, getTheme, applyTheme } from '../lib/theme';
import { useT } from '../lib/i18n';

export default function ThemePicker() {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState(getTheme());
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const pick = (id: string) => {
    applyTheme(id);
    setTheme(id);
    setOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="btn-ghost !p-2"
        aria-label={t('theme.label')}
        title={t('theme.label')}
      >
        <Palette className="w-4 h-4" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 z-30 w-44 bg-bg-card border border-line rounded-xl shadow-soft p-2 animate-fade-in">
          <div className="text-[10px] uppercase tracking-wider text-ink-mute font-semibold px-2 pb-1.5">
            {t('theme.label')}
          </div>
          {THEMES.map((th) => (
            <button
              key={th.id}
              onClick={() => pick(th.id)}
              className={`w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-sm transition ${
                theme === th.id ? 'bg-bg-soft text-ink' : 'text-ink-dim hover:text-ink hover:bg-bg-soft'
              }`}
            >
              <span
                className="w-4 h-4 rounded-full border border-white/20 shrink-0"
                style={{ background: th.swatch }}
              />
              <span className="flex-1 text-left">{t(`theme.${th.id}`)}</span>
              {theme === th.id && <Check className="w-3.5 h-3.5 text-brand-glow" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
