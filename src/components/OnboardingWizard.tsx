import { useMemo, useState } from 'react';
import { ArrowRight, ArrowLeft, GraduationCap, Sparkles, BookOpen, Check } from 'lucide-react';
import { useStore } from '../store';
import { useT } from '../lib/i18n';
import type { Subject } from '../types';
import Logo from './Logo';

type Step = 'welcome' | 'year' | 'subjects' | 'done';

interface SubjectDraft {
  id: string;
  status: 'pending' | 'regular' | 'approved';
  /** Nota numérica (solo válida si status === 'approved'). */
  grade: number | null;
}

export default function OnboardingWizard() {
  const t = useT();
  const subjects = useStore((s) => s.subjects);
  const updateSubject = useStore((s) => s.updateSubject);
  const addGrade = useStore((s) => s.addGrade);
  const finishOnboarding = useStore((s) => s.finishOnboarding);

  const [step, setStep] = useState<Step>('welcome');
  const [year, setYear] = useState<number>(1);
  const [drafts, setDrafts] = useState<Record<string, SubjectDraft>>(() =>
    Object.fromEntries(
      subjects.map((s) => [s.id, { id: s.id, status: s.status === 'approved' || s.status === 'regular' ? s.status : 'pending', grade: null }]),
    ),
  );

  const subjectsByYear = useMemo(() => {
    const out: Record<number, Subject[]> = {};
    for (const s of subjects) {
      const y = s.year ?? 1;
      (out[y] ??= []).push(s);
    }
    return out;
  }, [subjects]);

  /** Cuando elige un año, marca como pre-seleccionadas las materias de años anteriores. */
  function applyYearPreset(targetYear: number) {
    setYear(targetYear);
    setDrafts((prev) => {
      const next = { ...prev };
      for (const s of subjects) {
        const y = s.year ?? 1;
        if (y < targetYear) {
          next[s.id] = { id: s.id, status: 'approved', grade: null };
        } else {
          next[s.id] = { id: s.id, status: 'pending', grade: null };
        }
      }
      return next;
    });
  }

  function setDraft(id: string, patch: Partial<SubjectDraft>) {
    setDrafts((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  }

  function commit() {
    // Aplicar status y notas
    const today = new Date().toISOString().slice(0, 10);
    for (const id in drafts) {
      const d = drafts[id];
      const subj = subjects.find((s) => s.id === id);
      if (!subj) continue;
      // Solo update si cambió respecto del actual
      if (d.status !== subj.status) {
        updateSubject(id, { status: d.status });
      }
      // Si está aprobada y le puso nota, registrarla en grades
      if (d.status === 'approved' && d.grade !== null && !Number.isNaN(d.grade)) {
        addGrade({
          subjectId: id,
          label: t('onboarding.gradeLabel'),
          score: Math.max(0, Math.min(10, d.grade)),
          weight: 1,
          date: today,
          comment: t('onboarding.gradeComment'),
        });
      }
    }
    finishOnboarding();
  }

  // ───────────── render por paso ─────────────

  if (step === 'welcome') {
    return (
      <Shell>
        <div className="text-center max-w-xl mx-auto">
          <div className="inline-flex mb-6">
            <Logo size={72} />
          </div>
          <h1 className="display text-5xl text-ink mb-3">{t('onboarding.welcomeTitle')}</h1>
          <p className="text-ink-dim mb-8 text-base">
            {t('onboarding.welcomeDesc')}
          </p>
          <div className="grid sm:grid-cols-2 gap-3 text-left mb-8">
            <Feature icon={<Sparkles />} title={t('onboarding.featPlanTitle')} desc={t('onboarding.featPlanDesc')} />
            <Feature icon={<BookOpen />} title={t('onboarding.featCalTitle')} desc={t('onboarding.featCalDesc')} />
          </div>
          <button className="btn-primary text-base !py-3 !px-6" onClick={() => setStep('year')}>
            {t('onboarding.start')} <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </Shell>
    );
  }

  if (step === 'year' && subjects.length === 0) {
    return (
      <Shell>
        <div className="max-w-xl mx-auto text-center">
          <button onClick={() => setStep('welcome')} className="btn-ghost text-xs mb-6">
            <ArrowLeft className="w-3.5 h-3.5" /> {t('onboarding.back')}
          </button>
          <div className="w-16 h-16 mx-auto rounded-full bg-brand/15 text-brand-glow grid place-items-center mb-5">
            <GraduationCap className="w-8 h-8" />
          </div>
          <h2 className="display text-3xl mb-2">{t('onboarding.noSubjectsTitle')}</h2>
          <p className="text-ink-dim mb-8 text-sm max-w-sm mx-auto">{t('onboarding.noSubjectsDesc')}</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button className="btn-ghost" onClick={finishOnboarding}>
              {t('onboarding.skip')}
            </button>
            <button className="btn-primary" onClick={finishOnboarding}>
              {t('onboarding.goToApp')} <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </Shell>
    );
  }

  if (step === 'year') {
    return (
      <Shell>
        <div className="max-w-2xl mx-auto">
          <button onClick={() => setStep('welcome')} className="btn-ghost text-xs mb-4">
            <ArrowLeft className="w-3.5 h-3.5" /> {t('onboarding.back')}
          </button>
          <h2 className="display text-3xl mb-2">{t('onboarding.yearTitle')}</h2>
          <p className="text-ink-dim mb-6 text-sm">
            {t('onboarding.yearDesc')}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
            <YearCard yr={1} active={year === 1} label={t('onboarding.yearIngresante')} desc={t('onboarding.yearIngresanteDesc')} onClick={() => applyYearPreset(1)} />
            <YearCard yr={2} active={year === 2} label={t('onboarding.year2')} desc={t('onboarding.year2Desc')} onClick={() => applyYearPreset(2)} />
            <YearCard yr={3} active={year === 3} label={t('onboarding.year3')} desc={t('onboarding.year3Desc')} onClick={() => applyYearPreset(3)} />
            <YearCard yr={4} active={year === 4} label={t('onboarding.year4')} desc={t('onboarding.year4Desc')} onClick={() => applyYearPreset(4)} />
            <YearCard yr={5} active={year === 5} label={t('onboarding.year5')} desc={t('onboarding.year5Desc')} onClick={() => applyYearPreset(5)} />
            <YearCard yr={0} active={year === 0} label={t('onboarding.yearOther')} desc={t('onboarding.yearOtherDesc')} onClick={() => applyYearPreset(0)} />
          </div>
          <div className="flex justify-between">
            <button className="btn-ghost" onClick={finishOnboarding}>
              {t('onboarding.skip')}
            </button>
            <button className="btn-primary" onClick={() => setStep('subjects')}>
              {t('onboarding.next')} <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </Shell>
    );
  }

  if (step === 'subjects') {
    const years = Object.keys(subjectsByYear).map(Number).sort((a, b) => a - b);
    return (
      <Shell>
        <div className="max-w-4xl mx-auto">
          <button onClick={() => setStep('year')} className="btn-ghost text-xs mb-4">
            <ArrowLeft className="w-3.5 h-3.5" /> {t('onboarding.back')}
          </button>
          <h2 className="display text-3xl mb-2">{t('onboarding.subjTitle')}</h2>
          <p className="text-ink-dim mb-6 text-sm">
            {t('onboarding.subjDesc')}{' '}
            <span className="text-amber-300 font-medium">{t('onboarding.stRegular')}</span> {t('onboarding.subjHintRegular')}{' '}
            <span className="text-emerald-300 font-medium">{t('onboarding.stApproved')}</span> {t('onboarding.subjHintApproved')}
          </p>

          <div className="space-y-5 mb-8">
            {years.map((yr) => (
              <div key={yr} className="card p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-md bg-brand/15 text-brand-glow grid place-items-center font-bold text-sm">
                    {yr}
                  </div>
                  <h3 className="font-semibold">{t('onboarding.level', { n: yr })}</h3>
                  <div className="text-xs text-ink-mute ml-auto">
                    {t('onboarding.counts', { a: countBy(drafts, subjectsByYear[yr], 'approved'), r: countBy(drafts, subjectsByYear[yr], 'regular') })}
                  </div>
                </div>
                <div className="space-y-2">
                  {subjectsByYear[yr].map((s) => {
                    const d = drafts[s.id];
                    if (!d) return null;
                    return (
                      <div
                        key={s.id}
                        className="grid grid-cols-12 gap-2 items-center p-2 rounded-lg hover:bg-bg-elev/40 transition"
                      >
                        <div className="col-span-12 sm:col-span-5 flex items-center gap-2 min-w-0">
                          <div className="w-1 h-6 rounded-full shrink-0" style={{ background: s.color }} />
                          <div className="min-w-0">
                            <div className="text-sm font-medium truncate">{s.name}</div>
                            <div className="text-[10px] text-ink-mute">{s.code}</div>
                          </div>
                        </div>
                        <div className="col-span-12 sm:col-span-5 flex gap-1.5">
                          <StatusBtn active={d.status === 'pending'}  onClick={() => setDraft(s.id, { status: 'pending', grade: null })} className="bg-bg-soft text-ink-dim">
                            {t('onboarding.stNotTaken')}
                          </StatusBtn>
                          <StatusBtn active={d.status === 'regular'}  onClick={() => setDraft(s.id, { status: 'regular', grade: null })} className="bg-amber-500/20 text-amber-300 border-amber-500/30">
                            {t('onboarding.stRegular')}
                          </StatusBtn>
                          <StatusBtn active={d.status === 'approved'} onClick={() => setDraft(s.id, { status: 'approved' })} className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30">
                            {t('onboarding.stApproved')}
                          </StatusBtn>
                        </div>
                        <div className="col-span-12 sm:col-span-2">
                          {d.status === 'approved' ? (
                            <input
                              type="number"
                              min={4}
                              max={10}
                              step={0.5}
                              placeholder={t('onboarding.gradePh')}
                              className="input !py-1.5 text-sm"
                              value={d.grade ?? ''}
                              onChange={(e) => {
                                const v = e.target.value;
                                setDraft(s.id, { grade: v === '' ? null : Number(v) });
                              }}
                            />
                          ) : (
                            <div className="text-[11px] text-ink-mute italic text-center">
                              {d.status === 'regular' ? t('onboarding.noGrade') : '—'}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-between sticky bottom-0 bg-bg/95 backdrop-blur py-4 border-t border-line -mx-6 px-6">
            <button className="btn-ghost" onClick={() => setStep('year')}>
              <ArrowLeft className="w-4 h-4" /> {t('onboarding.back')}
            </button>
            <button className="btn-primary !px-6" onClick={() => { commit(); setStep('done'); }}>
              <Check className="w-4 h-4" /> {t('onboarding.confirmStart')}
            </button>
          </div>
        </div>
      </Shell>
    );
  }

  // step === 'done'
  return (
    <Shell>
      <div className="text-center max-w-md mx-auto">
        <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/20 grid place-items-center text-emerald-300 mb-5">
          <GraduationCap className="w-8 h-8" />
        </div>
        <h2 className="display text-3xl mb-2">{t('onboarding.doneTitle')}</h2>
        <p className="text-ink-dim mb-6 text-sm">
          {t('onboarding.doneDesc')}
        </p>
        <button className="btn-primary" onClick={finishOnboarding}>
          {t('onboarding.goToApp')} <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </Shell>
  );
}

/* ──────────── helpers visuales ──────────── */

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-bg flex items-start justify-center py-12 px-6 overflow-y-auto">
      <div className="w-full">{children}</div>
    </div>
  );
}

function Feature({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="card p-4">
      <div className="w-9 h-9 rounded-lg bg-brand/15 text-brand-glow grid place-items-center mb-2">
        {icon}
      </div>
      <div className="font-semibold text-sm">{title}</div>
      <div className="text-xs text-ink-dim mt-0.5">{desc}</div>
    </div>
  );
}

function YearCard({
  yr, active, label, desc, onClick,
}: { yr: number; active: boolean; label: string; desc: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`p-4 rounded-xl border text-left transition ${
        active
          ? 'border-brand bg-brand/10 shadow-glow'
          : 'border-line bg-bg-elev/40 hover:border-brand/40'
      }`}
    >
      <div className="text-2xl display mb-1">{yr === 0 ? '?' : `${yr}°`}</div>
      <div className="text-sm font-semibold">{label}</div>
      <div className="text-[11px] text-ink-mute mt-0.5">{desc}</div>
    </button>
  );
}

function StatusBtn({
  active, onClick, className = '', children,
}: { active: boolean; onClick: () => void; className?: string; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 px-2 py-1.5 rounded-md text-[11px] font-semibold border transition ${
        active ? `${className} border` : 'border-line text-ink-mute hover:text-ink hover:border-ink-mute bg-transparent'
      }`}
    >
      {children}
    </button>
  );
}

function countBy(
  drafts: Record<string, SubjectDraft>,
  subjects: Subject[],
  status: SubjectDraft['status'],
): number {
  return subjects.reduce((acc, s) => acc + (drafts[s.id]?.status === status ? 1 : 0), 0);
}
