import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { CalendarClock, BookOpen, ClipboardList, GraduationCap, ArrowRight, AlertTriangle } from 'lucide-react';
import { useStore } from '../store';
import { type Weekday } from '../types';
import { daysUntil, formatDateShort, hexToRgba, timeToMinutes } from '../lib/utils';
import { useT } from '../lib/i18n';
import SubjectChip from '../components/SubjectChip';

function todayWeekday(): Weekday {
  const idx = new Date().getDay(); // 0 sun
  return (['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'] as Weekday[])[idx];
}

export default function Dashboard() {
  const subjects = useStore((s) => s.subjects);
  const tasks = useStore((s) => s.tasks);
  const grades = useStore((s) => s.grades);
  const sessions = useStore((s) => s.pomodoroSessions);
  const t = useT();

  const today = todayWeekday();

  const todayClasses = useMemo(() => {
    const out: { subj: typeof subjects[0]; start: string; end: string }[] = [];
    subjects.forEach((s) => s.slots.filter((sl) => sl.day === today).forEach((sl) => out.push({ subj: s, start: sl.start, end: sl.end })));
    return out.sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start));
  }, [subjects, today]);

  const upcoming = useMemo(
    () =>
      tasks
        .filter((t) => t.status !== 'done' && t.dueDate)
        .sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''))
        .slice(0, 5),
    [tasks],
  );

  const overall = useMemo(() => {
    if (grades.length === 0) return null;
    const sum = grades.reduce((acc, g) => acc + g.score * g.weight, 0);
    const w = grades.reduce((acc, g) => acc + g.weight, 0) || 1;
    return (sum / w).toFixed(2);
  }, [grades]);

  const focusToday = useMemo(() => {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    return sessions
      .filter((s) => s.kind === 'focus' && s.endedAt >= start.getTime())
      .reduce((acc, s) => acc + s.durationMin, 0);
  }, [sessions]);

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Stat icon={<BookOpen className="w-5 h-5" />} label={t('dashboard.activeSubjects')} value={subjects.filter((s) => s.status === 'ongoing').length} />
        <Stat icon={<ClipboardList className="w-5 h-5" />} label={t('dashboard.pending')} value={tasks.filter((t) => t.status !== 'done').length} accent="amber" />
        <Stat icon={<GraduationCap className="w-5 h-5" />} label={t('dashboard.average')} value={overall ?? '—'} accent="emerald" />
        <Stat icon={<CalendarClock className="w-5 h-5" />} label={`${t('dashboard.focusToday')}`} value={`${focusToday} min`} accent="blue" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">{t('dashboard.todayClasses')} · {t(`weekday.${today}`)}</h2>
            <Link to="/horarios" className="text-sm text-brand hover:underline flex items-center gap-1">
              {t('dashboard.seeWeek')} <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          {todayClasses.length === 0 ? (
            <Empty msg={t('dashboard.noClasses')} />
          ) : (
            <ul className="space-y-2">
              {todayClasses.map((c, i) => (
                <li
                  key={i}
                  className="flex items-center gap-3 p-3 rounded-lg border border-line"
                  style={{ background: hexToRgba(c.subj.color, 0.08), borderColor: hexToRgba(c.subj.color, 0.3) }}
                >
                  <div className="w-1.5 h-10 rounded" style={{ background: c.subj.color }} />
                  <div className="flex-1">
                    <div className="font-medium">{c.subj.name}</div>
                    <div className="text-xs text-ink-dim">
                      {c.subj.classroom ?? t('dashboard.classroomNA')} · {c.subj.professor ?? t('dashboard.professorNA')}
                    </div>
                  </div>
                  <div className="text-sm font-mono">
                    {c.start} – {c.end}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">{t('dashboard.upcoming')}</h2>
            <Link to="/seguimiento" className="text-sm text-brand hover:underline flex items-center gap-1">
              {t('dashboard.all')} <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          {upcoming.length === 0 ? (
            <Empty msg={t('dashboard.noUpcoming')} />
          ) : (
            <ul className="space-y-2.5">
              {upcoming.map((task) => {
                const d = daysUntil(task.dueDate);
                const overdue = d < 0;
                return (
                  <li key={task.id} className="p-3 rounded-lg border border-line bg-bg-elev/40">
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-medium text-sm truncate">{task.title}</div>
                      <span className={`chip ${overdue ? 'bg-red-500/20 text-red-300' : d <= 2 ? 'bg-amber-500/20 text-amber-300' : 'bg-bg-soft text-ink-dim'}`}>
                        {overdue ? t('dashboard.overdue') : d === 0 ? t('dashboard.today') : d === 1 ? t('dashboard.tomorrow') : t('dashboard.inDays', { n: d })}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <SubjectChip subjectId={task.subjectId} />
                      <span className="text-xs text-ink-dim">{formatDateShort(task.dueDate)}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      <QuickAccess />
    </div>
  );
}

function Stat({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: React.ReactNode; accent?: 'amber' | 'emerald' | 'blue' }) {
  const colorMap: Record<string, string> = {
    amber: 'text-amber-400 bg-amber-500/10',
    emerald: 'text-emerald-400 bg-emerald-500/10',
    blue: 'text-blue-400 bg-blue-500/10',
  };
  const cls = accent ? colorMap[accent] : 'text-ink bg-bg-soft';
  return (
    <div className="card p-4 flex items-center gap-4">
      <div className={`w-10 h-10 rounded-lg grid place-items-center ${cls}`}>{icon}</div>
      <div>
        <div className="text-xs uppercase tracking-wider text-ink-mute font-semibold">{label}</div>
        <div className="text-2xl font-bold leading-tight">{value}</div>
      </div>
    </div>
  );
}

function Empty({ msg }: { msg: string }) {
  return (
    <div className="text-center py-8 text-ink-dim flex flex-col items-center gap-2">
      <AlertTriangle className="w-5 h-5 opacity-50" />
      <p className="text-sm">{msg}</p>
    </div>
  );
}

function QuickAccess() {
  const t = useT();
  const items = [
    { to: '/materias', labelKey: 'nav.subjects', color: 'bg-blue-500/15 text-blue-300' },
    { to: '/horarios', labelKey: 'nav.schedule', color: 'bg-emerald-500/15 text-emerald-300' },
    { to: '/notas', labelKey: 'nav.notes', color: 'bg-violet-500/15 text-violet-300' },
    { to: '/pomodoro', labelKey: 'nav.pomodoro', color: 'bg-rose-500/15 text-rose-300' },
    { to: '/seguimiento', labelKey: 'nav.tasks', color: 'bg-amber-500/15 text-amber-300' },
    { to: '/rendimiento', labelKey: 'nav.performance', color: 'bg-cyan-500/15 text-cyan-300' },
  ];
  return (
    <div className="card p-5">
      <h2 className="font-semibold mb-4">{t('dashboard.quickAccess')}</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {items.map((i) => (
          <Link
            key={i.to}
            to={i.to}
            className={`p-4 rounded-xl border border-line hover:border-brand/40 transition flex items-center justify-center font-medium text-sm ${i.color}`}
          >
            {t(i.labelKey)}
          </Link>
        ))}
      </div>
    </div>
  );
}
