import { useEffect, useMemo, useRef, useState } from 'react';
import { Play, Pause, RotateCcw, SkipForward, Settings as SettingsIcon } from 'lucide-react';
import { useStore } from '../store';
import Modal from '../components/Modal';
import { hexToRgba } from '../lib/utils';
import { useT } from '../lib/i18n';

type Phase = 'focus' | 'short' | 'long';

export default function Pomodoro() {
  const t = useT();
  const subjects = useStore((s) => s.subjects);
  const settings = useStore((s) => s.pomodoroSettings);
  const setSettings = useStore((s) => s.setPomodoroSettings);
  const logPomodoro = useStore((s) => s.logPomodoro);
  const sessions = useStore((s) => s.pomodoroSessions);

  const [subjectId, setSubjectId] = useState<string | null>(subjects[0]?.id ?? null);
  const [phase, setPhase] = useState<Phase>('focus');
  const [running, setRunning] = useState(false);
  const [round, setRound] = useState(1);
  const [secondsLeft, setSecondsLeft] = useState(settings.focusMin * 60);
  const [showSettings, setShowSettings] = useState(false);
  const startedAtRef = useRef<number>(0);

  const durFor = (p: Phase) =>
    (p === 'focus' ? settings.focusMin : p === 'short' ? settings.shortBreakMin : settings.longBreakMin) * 60;

  // adjust seconds when settings change & not running
  useEffect(() => {
    if (!running) setSecondsLeft(durFor(phase));
  }, [settings, phase, running]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(id);
          finishPhase();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [running, phase]); // eslint-disable-line react-hooks/exhaustive-deps

  const finishPhase = () => {
    const ended = Date.now();
    const started = startedAtRef.current;
    // Solo registramos si efectivamente se inició el timer (started > 0).
    // Clamp al máximo posible de la fase para blindar contra timestamps inválidos.
    const maxMin = Math.ceil(durFor(phase) / 60) + 1;
    let dur = started > 0 ? Math.round((ended - started) / 60000) : 0;
    dur = Math.min(Math.max(0, dur), maxMin);
    if (started > 0 && dur > 0) {
      logPomodoro({
        kind: phase === 'focus' ? 'focus' : 'break',
        durationMin: dur,
        startedAt: started,
        endedAt: ended,
        subjectId: phase === 'focus' ? subjectId : null,
      });
    }
    startedAtRef.current = 0;
    try {
      // simple beep
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g);
      g.connect(ctx.destination);
      o.frequency.value = 880;
      g.gain.setValueAtTime(0.001, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.01);
      o.start();
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      o.stop(ctx.currentTime + 0.5);
    } catch {}

    setRunning(false);
    if (phase === 'focus') {
      const isLong = round % settings.rounds === 0;
      const next: Phase = isLong ? 'long' : 'short';
      setPhase(next);
      setSecondsLeft(durFor(next));
    } else {
      setPhase('focus');
      setRound((r) => r + 1);
      setSecondsLeft(settings.focusMin * 60);
    }
  };

  const start = () => {
    startedAtRef.current = Date.now() - (durFor(phase) - secondsLeft) * 1000;
    setRunning(true);
  };
  const pause = () => setRunning(false);
  const reset = () => {
    setRunning(false);
    setSecondsLeft(durFor(phase));
  };
  const skip = () => {
    setRunning(false);
    finishPhase();
  };

  const total = durFor(phase);
  const progress = 1 - secondsLeft / total;
  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const ss = String(secondsLeft % 60).padStart(2, '0');

  const subj = subjects.find((s) => s.id === subjectId);
  const accent = phase === 'focus' ? subj?.color ?? '#3b82f6' : phase === 'short' ? '#22c55e' : '#a855f7';

  const todayFocus = useMemo(() => {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    return sessions.filter((s) => s.kind === 'focus' && s.endedAt >= start.getTime()).reduce((a, s) => a + s.durationMin, 0);
  }, [sessions]);

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="card p-8 text-center" style={{ borderColor: hexToRgba(accent, 0.4) }}>
        <div className="flex items-center justify-center gap-2 mb-1">
          {(['focus', 'short', 'long'] as Phase[]).map((p) => (
            <button
              key={p}
              onClick={() => {
                if (running) return;
                setPhase(p);
                setSecondsLeft(durFor(p));
              }}
              className={`px-3 py-1 rounded-full text-xs uppercase tracking-wider font-semibold transition ${
                phase === p ? 'bg-brand text-white' : 'text-ink-dim hover:text-ink'
              }`}
            >
              {p === 'focus' ? t('pomodoro.focus') : p === 'short' ? t('pomodoro.short') : t('pomodoro.long')}
            </button>
          ))}
        </div>

        <div className="relative my-6 mx-auto" style={{ width: 280, height: 280 }}>
          <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90">
            <circle cx="50" cy="50" r="45" fill="none" style={{ stroke: 'rgb(var(--line))' }} strokeWidth="6" />
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke={accent}
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={`${progress * 282.74} 282.74`}
              style={{ transition: 'stroke-dasharray 1s linear' }}
            />
          </svg>
          <div className="absolute inset-0 grid place-items-center">
            <div>
              <div className="text-6xl font-bold tabular-nums">{mm}:{ss}</div>
              <div className="mt-1 text-xs uppercase tracking-[0.2em] text-ink-mute">
                {t('pomodoro.round', { r: round, total: settings.rounds })}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center gap-2">
          {!running ? (
            <button className="btn-primary !px-5 !py-2.5" onClick={start}>
              <Play className="w-4 h-4" /> {t('pomodoro.start')}
            </button>
          ) : (
            <button className="btn-primary !px-5 !py-2.5" onClick={pause}>
              <Pause className="w-4 h-4" /> {t('pomodoro.pause')}
            </button>
          )}
          <button className="btn-ghost" onClick={reset}>
            <RotateCcw className="w-4 h-4" /> {t('pomodoro.reset')}
          </button>
          <button className="btn-ghost" onClick={skip}>
            <SkipForward className="w-4 h-4" /> {t('pomodoro.skip')}
          </button>
          <button className="btn-ghost" onClick={() => setShowSettings(true)}>
            <SettingsIcon className="w-4 h-4" /> {t('pomodoro.settings')}
          </button>
        </div>

        <div className="mt-6 flex items-center justify-center gap-3 text-sm">
          <span className="text-ink-mute">{t('pomodoro.subject')}</span>
          <select
            className="input !w-auto !py-1.5"
            value={subjectId ?? ''}
            onChange={(e) => setSubjectId(e.target.value || null)}
            disabled={running}
          >
            <option value="">{t('pomodoro.none')}</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-4">
          <div className="text-xs uppercase tracking-wider text-ink-mute font-semibold">{t('pomodoro.focusToday')}</div>
          <div className="text-3xl font-bold mt-1">{todayFocus}<span className="text-base font-medium text-ink-dim ml-1">min</span></div>
        </div>
        <div className="card p-4">
          <div className="text-xs uppercase tracking-wider text-ink-mute font-semibold">{t('pomodoro.sessions')}</div>
          <div className="text-3xl font-bold mt-1">{sessions.filter((s) => s.kind === 'focus').length}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs uppercase tracking-wider text-ink-mute font-semibold">{t('pomodoro.lastSession')}</div>
          <div className="text-sm mt-2 text-ink-dim">
            {sessions[0] ? new Date(sessions[0].endedAt).toLocaleString('es-AR') : '—'}
          </div>
        </div>
      </div>

      <Modal
        open={showSettings}
        onClose={() => setShowSettings(false)}
        title={t('pomodoro.settingsTitle')}
        footer={
          <button className="btn-primary" onClick={() => setShowSettings(false)}>
            {t('pomodoro.done')}
          </button>
        }
      >
        <div className="grid grid-cols-2 gap-4">
          <Field label={t('pomodoro.fieldFocus')} value={settings.focusMin} onChange={(v) => setSettings({ focusMin: v })} />
          <Field label={t('pomodoro.fieldShort')} value={settings.shortBreakMin} onChange={(v) => setSettings({ shortBreakMin: v })} />
          <Field label={t('pomodoro.fieldLong')} value={settings.longBreakMin} onChange={(v) => setSettings({ longBreakMin: v })} />
          <Field label={t('pomodoro.fieldRounds')} value={settings.rounds} onChange={(v) => setSettings({ rounds: v })} />
        </div>
      </Modal>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <label className="label">{label}</label>
      <input
        type="number"
        min={1}
        className="input"
        value={value}
        onChange={(e) => onChange(Math.max(1, Number(e.target.value) || 1))}
      />
    </div>
  );
}
