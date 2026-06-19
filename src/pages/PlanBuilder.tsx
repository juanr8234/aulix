import { useMemo, useRef, useState } from 'react';
import { Plus, Pencil, Trash2, Download, Upload, GraduationCap } from 'lucide-react';
import { useStore } from '../store';
import type { Subject } from '../types';
import { colorForYear, planFromSubjects, downloadPlan, validatePlan } from '../lib/plan';
import { useT } from '../lib/i18n';
import Modal from '../components/Modal';

export default function PlanBuilder() {
  const t = useT();
  const subjects = useStore((s) => s.subjects);
  const planMeta = useStore((s) => s.planMeta ?? {});
  const setPlanMeta = useStore((s) => s.setPlanMeta);
  const removeSubject = useStore((s) => s.removeSubject);
  const importPlan = useStore((s) => s.importPlan);

  const [editing, setEditing] = useState<Subject | null>(null);
  const [creating, setCreating] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const byYear = useMemo(() => {
    const out: Record<number, Subject[]> = {};
    for (const s of subjects) (out[s.year ?? 1] ??= []).push(s);
    return out;
  }, [subjects]);
  const years = Object.keys(byYear).map(Number).sort((a, b) => a - b);

  const onExport = () => downloadPlan(planFromSubjects(subjects, planMeta));

  const onPickFile = () => fileRef.current?.click();
  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // permitir re-importar el mismo archivo
    if (!file) return;
    let raw: unknown;
    try {
      raw = JSON.parse(await file.text());
    } catch {
      alert(t('builder.importInvalidJson'));
      return;
    }
    const res = validatePlan(raw);
    if (!res.ok) {
      alert(t('builder.importError', { e: res.error }));
      return;
    }
    const { plan } = res;
    const label = [plan.meta.career, plan.meta.university].filter(Boolean).join(' · ') || t('builder.importUnnamed');
    const ok = confirm(t('builder.importConfirm', { label, n: plan.subjects.length }));
    if (ok) importPlan(plan);
  };

  return (
    <div className="p-6 max-w-[1100px] mx-auto space-y-5">
      {/* Cabecera: metadatos + acciones */}
      <div className="card p-5">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[180px]">
            <label className="label">{t('builder.university')}</label>
            <input
              className="input"
              placeholder={t('builder.universityPh')}
              value={planMeta.university ?? ''}
              onChange={(e) => setPlanMeta({ university: e.target.value })}
            />
          </div>
          <div className="flex-1 min-w-[180px]">
            <label className="label">{t('builder.career')}</label>
            <input
              className="input"
              placeholder={t('builder.careerPh')}
              value={planMeta.career ?? ''}
              onChange={(e) => setPlanMeta({ career: e.target.value })}
            />
          </div>
          <div className="flex gap-2">
            <button className="btn-outline" onClick={onPickFile}>
              <Upload className="w-4 h-4" /> {t('builder.import')}
            </button>
            <button className="btn-outline" onClick={onExport} disabled={subjects.length === 0}>
              <Download className="w-4 h-4" /> {t('builder.export')}
            </button>
          </div>
        </div>
        <input ref={fileRef} type="file" accept=".json,application/json" className="hidden" onChange={onFile} />
        <p className="text-xs text-ink-mute mt-3">
          {t('builder.exportHint')}
        </p>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm text-ink-dim">
          {t('builder.subjectsCount', { n: subjects.length })} · {years.length === 1 ? t('builder.yearOne', { n: years.length }) : t('builder.yearMany', { n: years.length })}
        </div>
        <button className="btn-primary" onClick={() => setCreating(true)}>
          <Plus className="w-4 h-4" /> {t('builder.addSubject')}
        </button>
      </div>

      {subjects.length === 0 ? (
        <div className="card p-12 text-center text-ink-dim">
          <GraduationCap className="w-10 h-10 mx-auto mb-3 opacity-40" />
          {t('builder.emptyBody')}
        </div>
      ) : (
        <div className="space-y-5">
          {years.map((yr) => (
            <div key={yr} className="card p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-md bg-brand/15 text-brand-glow grid place-items-center font-bold text-sm">
                  {yr}
                </div>
                <h3 className="font-semibold">{t('builder.year', { n: yr })}</h3>
                <span className="text-xs text-ink-mute ml-auto">{t('builder.inYear', { n: byYear[yr].length })}</span>
              </div>
              <div className="space-y-2">
                {byYear[yr].map((s) => (
                  <SubjectRow
                    key={s.id}
                    subject={s}
                    subjects={subjects}
                    onEdit={() => setEditing(s)}
                    onDelete={() => {
                      if (confirm(t('builder.confirmDelete', { name: s.name }))) removeSubject(s.id);
                    }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {(creating || editing) && (
        <SubjectPlanForm
          subject={editing}
          onClose={() => { setCreating(false); setEditing(null); }}
        />
      )}
    </div>
  );
}

function SubjectRow({
  subject, subjects, onEdit, onDelete,
}: { subject: Subject; subjects: Subject[]; onEdit: () => void; onDelete: () => void }) {
  const t = useT();
  const nameById = (id: string) => subjects.find((x) => x.id === id)?.code ?? subjects.find((x) => x.id === id)?.name ?? '?';
  const reg = subject.correlativesRegular ?? [];
  const app = subject.correlativesApproved ?? [];

  return (
    <div className="group flex items-center gap-3 p-2.5 rounded-lg hover:bg-bg-elev/40 transition">
      <div className="w-1 h-9 rounded-full shrink-0" style={{ background: subject.color }} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium truncate">{subject.name}</span>
          {subject.code && <span className="text-[10px] text-ink-mute font-mono shrink-0">{subject.code}</span>}
        </div>
        <div className="text-[11px] text-ink-mute mt-0.5">
          {reg.length === 0 && app.length === 0 ? (
            <span className="italic">{t('builder.noCorrelatives')}</span>
          ) : (
            <span className="flex flex-wrap gap-x-3 gap-y-0.5">
              {app.length > 0 && <span className="text-emerald-300/80">{t('builder.approvedPrefix')} {app.map(nameById).join(', ')}</span>}
              {reg.length > 0 && <span className="text-amber-300/80">{t('builder.regularPrefix')} {reg.map(nameById).join(', ')}</span>}
            </span>
          )}
        </div>
      </div>
      <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition shrink-0">
        <button className="btn-ghost !p-1.5" onClick={onEdit} aria-label={t('common.edit')}><Pencil className="w-4 h-4" /></button>
        <button className="btn-ghost !p-1.5 hover:!text-red-400" onClick={onDelete} aria-label={t('common.delete')}><Trash2 className="w-4 h-4" /></button>
      </div>
    </div>
  );
}

function SubjectPlanForm({ subject, onClose }: { subject: Subject | null; onClose: () => void }) {
  const t = useT();
  const subjects = useStore((s) => s.subjects);
  const addSubject = useStore((s) => s.addSubject);
  const updateSubject = useStore((s) => s.updateSubject);

  const [name, setName] = useState(subject?.name ?? '');
  const [code, setCode] = useState(subject?.code ?? '');
  const [year, setYear] = useState<number>(subject?.year ?? 1);
  const [regular, setRegular] = useState<string[]>(subject?.correlativesRegular ?? []);
  const [approved, setApproved] = useState<string[]>(subject?.correlativesApproved ?? []);

  // Solo materias de años anteriores o iguales pueden ser correlativas (y nunca uno mismo).
  const candidates = subjects.filter((s) => s.id !== subject?.id);

  const toggle = (list: string[], set: (v: string[]) => void, id: string) =>
    set(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);

  const submit = () => {
    if (!name.trim()) return;
    const payload = {
      name: name.trim(),
      code: code.trim() || undefined,
      year,
      color: subject?.color ?? colorForYear(year),
      status: subject?.status ?? ('pending' as const),
      slots: subject?.slots ?? [],
      correlativesRegular: regular,
      correlativesApproved: approved,
    };
    if (subject) updateSubject(subject.id, payload);
    else addSubject(payload);
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      wide
      title={subject ? t('builder.formEdit') : t('builder.formNew')}
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>{t('common.cancel')}</button>
          <button className="btn-primary" onClick={submit} disabled={!name.trim()}>
            {subject ? t('common.save') : t('builder.add')}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <div className="sm:col-span-7">
            <label className="label">{t('builder.name')} *</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder={t('builder.namePh')} autoFocus />
          </div>
          <div className="sm:col-span-3">
            <label className="label">{t('builder.code')}</label>
            <input className="input" value={code} onChange={(e) => setCode(e.target.value)} placeholder={t('builder.codeAuto')} />
          </div>
          <div className="sm:col-span-2">
            <label className="label">{t('builder.yearField')}</label>
            <input
              type="number" min={1} max={9} className="input"
              value={year}
              onChange={(e) => setYear(Math.max(1, Number(e.target.value) || 1))}
            />
          </div>
        </div>

        <CorrelativePicker
          title={t('builder.corrApproved')}
          hint={t('builder.corrApprovedHint')}
          tone="emerald"
          candidates={candidates}
          selected={approved}
          onToggle={(id) => toggle(approved, setApproved, id)}
        />
        <CorrelativePicker
          title={t('builder.corrRegular')}
          hint={t('builder.corrRegularHint')}
          tone="amber"
          candidates={candidates}
          selected={regular}
          onToggle={(id) => toggle(regular, setRegular, id)}
        />
        <p className="text-[11px] text-ink-mute italic">
          {t('builder.firstYearHint')}
        </p>
      </div>
    </Modal>
  );
}

function CorrelativePicker({
  title, hint, tone, candidates, selected, onToggle,
}: {
  title: string; hint: string; tone: 'emerald' | 'amber';
  candidates: Subject[]; selected: string[]; onToggle: (id: string) => void;
}) {
  const t = useT();
  const toneCls = tone === 'emerald'
    ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
    : 'border-amber-500/40 bg-amber-500/15 text-amber-300';

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <label className="label !mb-1">{title}</label>
        <span className="text-[10px] text-ink-mute">{t('builder.selectedCount', { n: selected.length })}</span>
      </div>
      <p className="text-[11px] text-ink-mute mb-2">{hint}</p>
      {candidates.length === 0 ? (
        <p className="text-xs text-ink-mute italic">{t('builder.noOthers')}</p>
      ) : (
        <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1">
          {candidates.map((c) => {
            const on = selected.includes(c.id);
            return (
              <button
                key={c.id}
                onClick={() => onToggle(c.id)}
                className={`px-2 py-1 rounded-md text-[11px] border transition ${
                  on ? toneCls : 'border-line text-ink-mute hover:text-ink hover:border-ink-mute'
                }`}
              >
                {c.code ? <span className="font-mono mr-1 opacity-70">{c.code}</span> : null}
                {c.name}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
