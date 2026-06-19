import { useEffect, useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowRight, ArrowLeft, X, Sparkles } from 'lucide-react';
import { useT } from '../lib/i18n';

interface Step {
  /** Selector del elemento a iluminar. Si falta, el paso va centrado. */
  selector?: string;
  key: string; // base de la clave i18n (tour.<key>Title / tour.<key>Body)
}

const STEPS: Step[] = [
  { key: 's1' },
  { selector: 'a[href="#/simulador"]', key: 's2' },
  { selector: 'a[href="#/constructor"]', key: 's3' },
  { selector: 'a[href="#/calendario"]', key: 's4' },
  { selector: 'a[href="#/seguimiento"]', key: 's5' },
  { selector: '[data-tour="profiles"]', key: 's6' },
  { selector: '[data-tour="local"]', key: 's7' },
  { key: 's8' },
];

const TT_W = 300;
const PAD = 8;

export default function Tour({ onClose }: { onClose: () => void }) {
  const t = useT();
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const step = STEPS[i];
  const isLast = i === STEPS.length - 1;

  useLayoutEffect(() => {
    const measure = () => {
      if (!step.selector) { setRect(null); return; }
      const el = document.querySelector(step.selector) as HTMLElement | null;
      el?.scrollIntoView({ block: 'nearest' });
      setRect(el ? el.getBoundingClientRect() : null);
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [i, step.selector]);

  const next = () => (isLast ? onClose() : setI((v) => v + 1));
  const prev = () => setI((v) => Math.max(0, v - 1));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight' || e.key === 'Enter') next();
      else if (e.key === 'ArrowLeft') prev();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }); // sin deps: siempre la versión actual de i

  // Posición de la tarjeta
  let tip: React.CSSProperties;
  let arrow: React.CSSProperties | null = null;
  if (rect) {
    const left = rect.right + 16;
    const top = Math.min(Math.max(12, rect.top - 8), window.innerHeight - 230);
    tip = { left, top, width: TT_W };
    arrow = { left: -6, top: Math.max(16, rect.top + rect.height / 2 - top - 6) };
  } else {
    tip = {
      left: '50%', top: '50%', width: TT_W,
      transform: 'translate(-50%, -50%)',
    };
  }

  return createPortal(
    <div className="fixed inset-0 z-[100]">
      {/* bloqueador de clicks (no cierra al click fuera, para no perder el recorrido sin querer) */}
      <div className="absolute inset-0" />

      {/* Spotlight o atenuado completo */}
      {rect ? (
        <div
          className="absolute rounded-xl ring-2 ring-brand/70 transition-all duration-300 ease-out pointer-events-none"
          style={{
            left: rect.left - PAD,
            top: rect.top - PAD,
            width: rect.width + PAD * 2,
            height: rect.height + PAD * 2,
            boxShadow: '0 0 0 9999px rgba(2, 6, 23, 0.72)',
          }}
        />
      ) : (
        <div className="absolute inset-0 bg-[#020617]/80" />
      )}

      {/* Tarjeta */}
      <div
        className="absolute card p-5 shadow-soft animate-fade-in"
        style={tip}
      >
        {arrow && (
          <div
            className="absolute w-3 h-3 rotate-45 bg-bg-card border-l border-b border-line"
            style={arrow}
          />
        )}

        <div className="flex items-start justify-between gap-3 mb-1">
          <div className="flex items-center gap-2 text-brand-glow">
            <Sparkles className="w-4 h-4" />
            <span className="text-[10px] uppercase tracking-wider font-semibold text-ink-mute">
              {t('tour.step', { n: i + 1, total: STEPS.length })}
            </span>
          </div>
          <button className="btn-ghost !p-1 -mt-1 -mr-1" onClick={onClose} aria-label={t('tour.skip')}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <h3 className="display text-xl mb-1.5">{t(`tour.${step.key}Title`)}</h3>
        <p className="text-sm text-ink-dim leading-relaxed">{t(`tour.${step.key}Body`)}</p>

        {/* progreso */}
        <div className="flex gap-1.5 mt-4 mb-3">
          {STEPS.map((_, idx) => (
            <span
              key={idx}
              className={`h-1 rounded-full transition-all ${
                idx === i ? 'w-5 bg-brand' : 'w-1.5 bg-line'
              }`}
            />
          ))}
        </div>

        <div className="flex items-center justify-between">
          <button className="btn-ghost !text-xs" onClick={onClose}>
            {t('tour.skip')}
          </button>
          <div className="flex gap-2">
            {i > 0 && (
              <button className="btn-outline !py-1.5" onClick={prev}>
                <ArrowLeft className="w-4 h-4" /> {t('tour.back')}
              </button>
            )}
            <button className="btn-primary !py-1.5" onClick={next}>
              {isLast ? t('tour.start') : t('tour.next')}
              {!isLast && <ArrowRight className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
