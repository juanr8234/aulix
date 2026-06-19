import { useMemo, useState } from 'react';
import { Plus, Trash2, Pencil, TrendingUp, Award } from 'lucide-react';
import { useStore } from '../store';
import { hexToRgba, todayISO } from '../lib/utils';
import { useT } from '../lib/i18n';
import type { Grade } from '../types';
import Modal from '../components/Modal';

export default function Performance() {
  const t = useT();
  const subjects = useStore((s) => s.subjects);
  const grades = useStore((s) => s.grades);
  const removeGrade = useStore((s) => s.removeGrade);
  const [creating, setCreating] = useState<string | null>(null); // subjectId
  const [editing, setEditing] = useState<Grade | null>(null);

  const overall = useMemo(() => {
    if (grades.length === 0) return null;
    const sum = grades.reduce((a, g) => a + g.score * g.weight, 0);
    const w = grades.reduce((a, g) => a + g.weight, 0) || 1;
    return sum / w;
  }, [grades]);

  const bySubject = useMemo(() => {
    return subjects.map((s) => {
      const gs = grades.filter((g) => g.subjectId === s.id);
      const sumScore = gs.reduce((a, g) => a + g.score * g.weight, 0);
      const sumW = gs.reduce((a, g) => a + g.weight, 0);
      const avg = sumW > 0 ? sumScore / sumW : null;
      return { subject: s, grades: gs, avg };
    });
  }, [subjects, grades]);

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/15 text-emerald-300 grid place-items-center">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-ink-mute font-semibold">{t('performance.overallAvg')}</div>
              <div className="text-3xl font-bold">{overall !== null ? overall.toFixed(2) : '—'}</div>
            </div>
          </div>
        </div>
        <div className="card p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/15 text-blue-300 grid place-items-center">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-ink-mute font-semibold">{t('performance.evaluated')}</div>
              <div className="text-3xl font-bold">{bySubject.filter((b) => b.avg !== null).length}</div>
            </div>
          </div>
        </div>
        <div className="card p-5">
          <div className="text-xs uppercase tracking-wider text-ink-mute font-semibold">{t('performance.gradesLoaded')}</div>
          <div className="text-3xl font-bold">{grades.length}</div>
        </div>
      </div>

      {bySubject.length === 0 ? (
        <div className="card p-12 text-center text-ink-dim">{t('performance.emptySubjects')}</div>
      ) : (
        <div className="space-y-4">
          {bySubject.map(({ subject, grades: gs, avg }) => {
            const indicator = avg === null ? 'bg-bg-soft text-ink-dim' : avg >= 7 ? 'bg-emerald-500/20 text-emerald-300' : avg >= 4 ? 'bg-amber-500/20 text-amber-300' : 'bg-red-500/20 text-red-300';
            return (
              <div key={subject.id} className="card overflow-hidden" style={{ borderLeft: `4px solid ${subject.color}` }}>
                <div className="flex items-center justify-between gap-4 p-4 border-b border-line">
                  <div className="min-w-0">
                    <h3 className="font-semibold truncate">{subject.name}</h3>
                    <div className="text-xs text-ink-mute">{t('performance.gradeCount', { n: gs.length })}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className={`px-3 py-1 rounded-lg text-sm font-semibold ${indicator}`}>
                      {avg !== null ? t('performance.avgPrefix', { v: avg.toFixed(2) }) : t('performance.noGrades')}
                    </div>
                    <button className="btn-ghost" onClick={() => setCreating(subject.id)}>
                      <Plus className="w-4 h-4" /> {t('performance.addGrade')}
                    </button>
                  </div>
                </div>
                {gs.length > 0 && (
                  <div className="divide-y divide-line">
                    {gs.map((g) => (
                      <div key={g.id} className="grid grid-cols-12 gap-3 items-center px-4 py-3 hover:bg-bg-elev/30">
                        <div className="col-span-4 font-medium text-sm">{g.label}</div>
                        <div className="col-span-2">
                          <ScoreBar score={g.score} color={subject.color} />
                        </div>
                        <div className="col-span-1 text-sm font-mono font-semibold">{g.score.toFixed(1)}</div>
                        <div className="col-span-1 text-xs text-ink-dim">×{g.weight}</div>
                        <div className="col-span-3 text-xs text-ink-dim truncate">{g.comment ?? '—'}</div>
                        <div className="col-span-1 flex justify-end gap-1">
                          <button className="btn-ghost !p-1" onClick={() => setEditing(g)}><Pencil className="w-3.5 h-3.5" /></button>
                          <button className="btn-ghost !p-1 hover:!text-red-400" onClick={() => removeGrade(g.id)}><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {(creating || editing) && (
        <GradeForm
          subjectId={creating ?? editing!.subjectId}
          grade={editing}
          onClose={() => { setCreating(null); setEditing(null); }}
        />
      )}
    </div>
  );
}

function ScoreBar({ score, color }: { score: number; color: string }) {
  const pct = Math.max(0, Math.min(100, (score / 10) * 100));
  return (
    <div className="w-full h-2 rounded-full" style={{ background: hexToRgba(color, 0.15) }}>
      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

function GradeForm({ subjectId, grade, onClose }: { subjectId: string; grade: Grade | null; onClose: () => void }) {
  const t = useT();
  const addGrade = useStore((s) => s.addGrade);
  const updateGrade = useStore((s) => s.updateGrade);
  const subject = useStore((s) => s.subjects.find((x) => x.id === subjectId));

  const [label, setLabel] = useState(grade?.label ?? t('performance.defaultLabel'));
  const [score, setScore] = useState(grade?.score ?? 7);
  const [weight, setWeight] = useState(grade?.weight ?? 0.4);
  const [date, setDate] = useState(grade?.date ?? todayISO());
  const [comment, setComment] = useState(grade?.comment ?? '');

  const submit = () => {
    const payload = { subjectId, label: label.trim() || t('performance.untitled'), score, weight, date, comment: comment.trim() || undefined };
    if (grade) updateGrade(grade.id, payload);
    else addGrade(payload);
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={`${grade ? t('performance.formEdit') : t('performance.formNew')} · ${subject?.name ?? ''}`}
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>{t('common.cancel')}</button>
          <button className="btn-primary" onClick={submit}>{grade ? t('common.save') : t('common.create')}</button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="label">{t('performance.label')}</label>
          <input className="input" value={label} onChange={(e) => setLabel(e.target.value)} placeholder={t('performance.labelPh')} />
        </div>
        <div>
          <label className="label">{t('performance.score')}</label>
          <input type="number" min={0} max={10} step={0.1} className="input" value={score} onChange={(e) => setScore(Number(e.target.value))} />
        </div>
        <div>
          <label className="label">{t('performance.weight')}</label>
          <input type="number" min={0} max={1} step={0.05} className="input" value={weight} onChange={(e) => setWeight(Number(e.target.value))} />
        </div>
        <div className="col-span-2">
          <label className="label">{t('performance.date')}</label>
          <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="col-span-2">
          <label className="label">{t('performance.feedback')}</label>
          <textarea className="input" rows={3} value={comment} onChange={(e) => setComment(e.target.value)} />
        </div>
      </div>
    </Modal>
  );
}
