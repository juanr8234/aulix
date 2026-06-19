import { useEffect, useRef, useState } from 'react';
import { Check } from 'lucide-react';
import { LOCALES, useI18n, useT } from '../lib/i18n';

export default function LanguagePicker() {
  const lang = useI18n((s) => s.lang);
  const setLang = useI18n((s) => s.setLang);
  const t = useT();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const active = LOCALES.find((l) => l.id === lang) ?? LOCALES[0];

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="btn-ghost !px-2 !gap-1.5 text-base"
        aria-label={t('lang.label')}
        title={t('lang.label')}
      >
        <span aria-hidden>{active.flag}</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 z-30 w-44 bg-bg-card border border-line rounded-xl shadow-soft p-2 animate-fade-in">
          <div className="text-[10px] uppercase tracking-wider text-ink-mute font-semibold px-2 pb-1.5">
            {t('lang.label')}
          </div>
          {LOCALES.map((l) => (
            <button
              key={l.id}
              onClick={() => { setLang(l.id); setOpen(false); }}
              className={`w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-sm transition ${
                lang === l.id ? 'bg-bg-soft text-ink' : 'text-ink-dim hover:text-ink hover:bg-bg-soft'
              }`}
            >
              <span className="text-base" aria-hidden>{l.flag}</span>
              <span className="flex-1 text-left">{l.label}</span>
              {lang === l.id && <Check className="w-3.5 h-3.5 text-brand-glow" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
