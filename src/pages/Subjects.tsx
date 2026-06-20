import { useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, Search, Clock, MapPin, User } from 'lucide-react';
import { useStore } from '../store';
import { SUBJECT_COLORS, hexToRgba, pickColor, uid } from '../lib/utils';
import { WEEKDAYS, type ScheduleSlot, type Subject, type Weekday } from '../types';
import { useT } from '../lib/i18n';
import Modal from '../components/Modal';
import { getMissingReqs } from '../lib/simulator';

const STATUS_COLOR: Record<Subject['status'], string> = {
  pending: 'bg-bg-soft text-ink-dim',
  ongoing: 'bg-blue-500/20 text-blue-300',
  regular: 'bg-amber-500/20 text-amber-300',
  approved: 'bg-emerald-500/20 text-emerald-300',
};

const FILTER_KEYS: ('all' | Subject['status'])[] = ['all', 'pending', 'ongoing', 'regular', 'approved'];

export default function Subjects() {
  const subjects = useStore((s) => s.subjects);
  const t = useT();
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<'all' | Subject['status']>('all');
  const [editing, setEditing] = useState<Subject | null>(null);
  const [creating, setCreating] = useState(false);
  const statusLabel = (st: Subject['status']) => t(`subjects.status.${st}`);
  const filterLabel = (k: 'all' | Subject['status']) => (k === 'all' ? t('subjects.filterAll') : statusLabel(k));

  const filtered = useMemo(() => {
    return subjects
      .filter((s) => filter === 'all' || s.status === filter)
      .filter((s) => !q || s.name.toLowerCase().includes(q.toLowerCase()) || s.code?.toLowerCase().includes(q.toLowerCase()));
  }, [subjects, filter, q]);

  return (
    <div className="p-6 space-y-5 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 relative max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-mute" />
          <input className="input pl-9" placeholder={t('subjects.searchPh')} value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <button className="btn-primary" onClick={() => setCreating(true)}>
          <Plus className="w-4 h-4" /> {t('subjects.new')}
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTER_KEYS.map((k) => (
          <button
            key={k}
            onClick={() => setFilter(k)}
            className={`px-3.5 py-1.5 rounded-full text-sm transition ${
              filter === k ? 'bg-brand text-white' : 'bg-bg-elev text-ink-dim hover:text-ink border border-line'
            }`}
          >
            {filterLabel(k)}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="card p-12 text-center text-ink-dim">
          {subjects.length === 0 ? t('subjects.emptyNone') : t('subjects.emptyFilter')}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((s) => (
            <article
              key={s.id}
              className="card p-5 relative group hover:border-brand/40 transition"
              style={{ borderLeft: `4px solid ${s.color}` }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <span className={`chip ${STATUS_COLOR[s.status]}`}>{statusLabel(s.status)}</span>
                  <h3 className="font-semibold mt-2 truncate">{s.name}</h3>
                  {s.code && <div className="text-xs text-ink-mute mt-0.5">#{s.code}</div>}
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                  <button className="btn-ghost !p-1.5" onClick={() => setEditing(s)} aria-label="Editar">
                    <Pencil className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="mt-4 space-y-1.5 text-sm text-ink-dim">
                {s.professor && (
                  <div className="flex items-center gap-2">
                    <User className="w-3.5 h-3.5" /> {s.professor}
                  </div>
                )}
                {s.classroom && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5" /> {s.classroom}
                  </div>
                )}
                {s.slots.length > 0 && (
                  <div className="flex items-start gap-2">
                    <Clock className="w-3.5 h-3.5 mt-0.5" />
                    <div className="flex flex-wrap gap-1.5">
                      {s.slots.map((sl) => (
                        <span
                          key={sl.id}
                          className="text-[11px] px-2 py-0.5 rounded font-mono"
                          style={{ background: hexToRgba(s.color, 0.15), color: s.color }}
                        >
                          {t(`weekdayShort.${sl.day}`)} {sl.start}-{sl.end}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      {(creating || editing) && (
        <SubjectForm
          subject={editing}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function SubjectForm({ subject, onClose }: { subject: Subject | null; onClose: () => void }) {
  const t = useT();
  const subjects = useStore((s) => s.subjects);
  const addSubject = useStore((s) => s.addSubject);
  const updateSubject = useStore((s) => s.updateSubject);
  const subjectsCount = useStore((s) => s.subjects.length);
  const grades = useStore((s) => s.grades);
  const addGrade = useStore((s) => s.addGrade);
  const updateGrade = useStore((s) => s.updateGrade);

  // Si la materia ya tenía una nota "Final" cargada, la usamos como inicial
  const existingFinal = subject
    ? grades.find((g) => g.subjectId === subject.id && g.label === 'Final')
    : undefined;

  const [name, setName] = useState(subject?.name ?? '');
  const [warningSubj, setWarningSubj] = useState<{ name: string; missing: { approved: Subject[]; regular: Subject[] } } | null>(null);
  const [code, setCode] = useState(subject?.code ?? '');
  const [professor, setProfessor] = useState(subject?.professor ?? '');
  const [classroom, setClassroom] = useState(subject?.classroom ?? '');
  const [color, setColor] = useState(subject?.color ?? pickColor(subjectsCount));
  const [status, setStatus] = useState<Subject['status']>(subject?.status ?? 'ongoing');
  const [slots, setSlots] = useState<ScheduleSlot[]>(subject?.slots ?? []);
  const [grade, setGrade] = useState<number | ''>(existingFinal?.score ?? '');

  const addSlot = () => setSlots((cur) => [...cur, { id: uid(), day: 'MON', start: '18:00', end: '20:00' }]);
  const updateSlot = (id: string, patch: Partial<ScheduleSlot>) =>
    setSlots((cur) => cur.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  const removeSlot = (id: string) => setSlots((cur) => cur.filter((s) => s.id !== id));

  const submit = () => {
    if (!name.trim()) return;
    const payload = {
      name: name.trim(),
      code: code.trim() || undefined,
      professor: professor.trim() || undefined,
      classroom: classroom.trim() || undefined,
      color, status, slots,
    };

    let hasWarning = false;
    if (status === 'ongoing') {
      const subjectMap = Object.fromEntries(subjects.map((s) => [s.id, s])) as Record<string, Subject>;
      const tempSubj: Subject = subject 
        ? { ...subject, ...payload } 
        : { id: 'temp', ...payload, createdAt: Date.now(), slots: [], correlativesApproved: [], correlativesRegular: [] };
      const missing = getMissingReqs(tempSubj, subjectMap);
      if (missing.approved.length > 0 || missing.regular.length > 0) {
        setWarningSubj({ name: name.trim(), missing });
        hasWarning = true;
      }
    }

    let subjectId = subject?.id;
    if (subject) {
      updateSubject(subject.id, payload);
    } else {
      // addSubject no devuelve el id; generamos uno aparte si necesitamos guardar grade
      addSubject(payload);
    }

    // Manejo de la nota final: solo aplica si está aprobada y hay materia existente
    if (subjectId && status === 'approved' && grade !== '' && !Number.isNaN(Number(grade))) {
      const score = Math.max(0, Math.min(10, Number(grade)));
      const today = new Date().toISOString().slice(0, 10);
      if (existingFinal) {
        updateGrade(existingFinal.id, { score });
      } else {
        addGrade({ subjectId, label: 'Final', score, weight: 1, date: today });
      }
    }

    if (!hasWarning) {
      onClose();
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={subject ? t('subjects.formEdit') : t('subjects.formNew')}
      wide
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>
            {t('common.cancel')}
          </button>
          <button className="btn-primary" onClick={submit} disabled={!name.trim()}>
            {subject ? t('common.save') : t('common.create')}
          </button>
        </>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="label">{t('subjects.name')} *</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder={t('subjects.namePh')} />
        </div>
        <div>
          <label className="label">{t('subjects.code')}</label>
          <input className="input" value={code} onChange={(e) => setCode(e.target.value)} placeholder={t('subjects.codePh')} />
        </div>
        <div>
          <label className="label">{t('subjects.statusLabel')}</label>
          <select className="input" value={status} onChange={(e) => setStatus(e.target.value as Subject['status'])}>
            <option value="pending">{t('subjects.status.pending')}</option>
            <option value="ongoing">{t('subjects.status.ongoing')}</option>
            <option value="regular">{t('subjects.status.regular')}</option>
            <option value="approved">{t('subjects.status.approved')}</option>
          </select>
          {status === 'approved' && (
            <div className="mt-3">
              <label className="label">{t('subjects.finalGrade')} {!subject && <span className="text-ink-mute normal-case font-normal">{t('subjects.finalGradeHint')}</span>}</label>
              <input
                type="number"
                min={4}
                max={10}
                step={0.5}
                placeholder={t('subjects.finalGradePh')}
                className="input"
                value={grade}
                onChange={(e) => setGrade(e.target.value === '' ? '' : Number(e.target.value))}
                disabled={!subject}
              />
            </div>
          )}
          {status === 'regular' && (
            <p className="text-[11px] text-ink-mute mt-2 italic">
              {t('subjects.regularNoGrade')}
            </p>
          )}
        </div>
        <div>
          <label className="label">{t('subjects.professor')}</label>
          <input className="input" value={professor} onChange={(e) => setProfessor(e.target.value)} placeholder={t('subjects.professorPh')} />
        </div>
        <div>
          <label className="label">{t('subjects.classroom')}</label>
          <input className="input" value={classroom} onChange={(e) => setClassroom(e.target.value)} placeholder={t('subjects.classroomPh')} />
        </div>
        <div className="md:col-span-2">
          <label className="label">{t('subjects.color')}</label>
          <div className="flex flex-wrap gap-2">
            {SUBJECT_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={`w-8 h-8 rounded-lg border-2 transition ${color === c ? 'border-white scale-110' : 'border-transparent'}`}
                style={{ background: c }}
                aria-label={`Color ${c}`}
              />
            ))}
          </div>
        </div>
        <div className="md:col-span-2">
          <div className="flex items-center justify-between mb-2">
            <label className="label !mb-0">{t('subjects.schedules')}</label>
            <button className="btn-ghost !py-1" onClick={addSlot}>
              <Plus className="w-3.5 h-3.5" /> {t('subjects.addBlock')}
            </button>
          </div>
          {slots.length === 0 && <p className="text-sm text-ink-mute">{t('subjects.noSchedules')}</p>}
          <div className="space-y-2">
            {slots.map((sl) => (
              <div key={sl.id} className="flex items-center gap-2">
                <select className="input !w-28" value={sl.day} onChange={(e) => updateSlot(sl.id, { day: e.target.value as Weekday })}>
                  {WEEKDAYS.map((d) => (
                    <option key={d} value={d}>
                      {t(`weekdayShort.${d}`)}
                    </option>
                  ))}
                </select>
                <input type="time" className="input !w-32" value={sl.start} onChange={(e) => updateSlot(sl.id, { start: e.target.value })} />
                <span className="text-ink-mute">—</span>
                <input type="time" className="input !w-32" value={sl.end} onChange={(e) => updateSlot(sl.id, { end: e.target.value })} />
                <button className="btn-ghost !p-2 ml-auto hover:!text-red-400" onClick={() => removeSlot(sl.id)} aria-label="Quitar">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal de Advertencia de Correlativas Pendientes */}
      {warningSubj && (
        <Modal
          open
          onClose={onClose}
          title="Advertencia: Correlativas pendientes"
          footer={
            <button className="btn-primary" onClick={onClose}>
              Entendido
            </button>
          }
        >
          <div className="space-y-3">
            <p className="text-sm text-ink-dim">
              Has marcado la materia <strong>{warningSubj.name}</strong> como <strong>Cursando</strong>, pero aún no cumples con los siguientes requisitos del plan de estudios:
            </p>
            <div className="card p-4 bg-red-500/5 border border-red-500/20 space-y-3">
              {warningSubj.missing.approved.length > 0 && (
                <div>
                  <div className="text-xs uppercase tracking-wide text-red-300 font-semibold mb-1">
                    Debe estar aprobada:
                  </div>
                  <ul className="list-disc pl-5 text-xs space-y-1 text-ink">
                    {warningSubj.missing.approved.map((s) => (
                      <li key={s.id}>{s.name} {s.code ? `(${s.code})` : ''}</li>
                    ))}
                  </ul>
                </div>
              )}
              {warningSubj.missing.regular.length > 0 && (
                <div>
                  <div className="text-xs uppercase tracking-wide text-amber-300 font-semibold mb-1">
                    Debe estar regularizada:
                  </div>
                  <ul className="list-disc pl-5 text-xs space-y-1 text-ink">
                    {warningSubj.missing.regular.map((s) => (
                      <li key={s.id}>{s.name} {s.code ? `(${s.code})` : ''}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}
    </Modal>
  );
}
