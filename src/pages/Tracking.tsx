import { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, Pencil, Calendar, BookOpen, FileText, ClipboardList, ArrowRight } from 'lucide-react';
import { useStore } from '../store';
import { daysUntil, formatDateShort, todayISO } from '../lib/utils';
import { type Task, type TaskKind, type TaskPriority, type TaskStatus } from '../types';
import { useT } from '../lib/i18n';
import Modal from '../components/Modal';
import SubjectChip from '../components/SubjectChip';
import { deriveStatus } from '../lib/simulator';

const COLUMNS: { key: TaskStatus; labelKey: string; tone: string }[] = [
  { key: 'todo', labelKey: 'tasks.colTodo', tone: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
  { key: 'doing', labelKey: 'tasks.colDoing', tone: 'bg-blue-500/15 text-blue-300 border-blue-500/30' },
  { key: 'done', labelKey: 'tasks.colDone', tone: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
];

const KIND_META: Record<TaskKind, { labelKey: string; icon: React.ComponentType<any>; color: string }> = {
  task: { labelKey: 'tasks.kindTask', icon: ClipboardList, color: 'text-blue-300' },
  exam: { labelKey: 'tasks.kindExam', icon: FileText, color: 'text-rose-300' },
  delivery: { labelKey: 'tasks.kindDelivery', icon: BookOpen, color: 'text-amber-300' },
};

const PRIORITY_META: Record<TaskPriority, { labelKey: string; bar: string; dot: string }> = {
  high: { labelKey: 'tasks.prioHigh', bar: 'bg-red-400', dot: 'text-red-300' },
  normal: { labelKey: 'tasks.prioNormal', bar: 'bg-blue-400', dot: 'text-blue-300' },
  low: { labelKey: 'tasks.prioLow', bar: 'bg-slate-500', dot: 'text-slate-400' },
};

export default function Tracking() {
  const t = useT();
  const tasks = useStore((s) => s.tasks);
  const subjects = useStore((s) => s.subjects);
  const addTask = useStore((s) => s.addTask);
  const updateTask = useStore((s) => s.updateTask);
  const removeTask = useStore((s) => s.removeTask);
  const [editing, setEditing] = useState<Task | null>(null);
  const [creating, setCreating] = useState(false);
  const [subjectFilter, setSubjectFilter] = useState<string>('all');

  const subjectsById = useMemo(
    () => Object.fromEntries(subjects.map((s) => [s.id, s])) as Record<string, typeof subjects[0]>,
    [subjects]
  );

  const activeSubjects = useMemo(() => {
    return subjects.filter((s) => {
      if (s.status === 'approved') return false;
      if (s.status === 'ongoing' || s.status === 'regular') return true;
      return deriveStatus(s, subjectsById) === 'available';
    });
  }, [subjects, subjectsById]);

  const grouped = useMemo(() => {
    const g: Record<TaskStatus, Task[]> = { todo: [], doing: [], done: [] };
    tasks
      .filter((t) =>
        subjectFilter === 'all'
          ? true
          : subjectFilter === 'none'
            ? t.subjectId === null
            : t.subjectId === subjectFilter,
      )
      .forEach((t) => g[t.status].push(t));
    const rank: Record<TaskPriority | 'none', number> = { high: 0, normal: 1, low: 2, none: 3 };
    Object.values(g).forEach((arr) =>
      arr.sort((a, b) => {
        const pr = rank[a.priority ?? 'none'] - rank[b.priority ?? 'none'];
        if (pr !== 0) return pr;
        return (a.dueDate || '9999').localeCompare(b.dueDate || '9999');
      }),
    );
    return g;
  }, [tasks, subjectFilter]);

  const onDrop = (e: React.DragEvent, status: TaskStatus) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain');
    if (id) updateTask(id, { status });
  };

  // Atajo: Ctrl/Cmd+N abre el formulario de nueva tarea.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        setCreating(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-dim">{t('tasks.intro')}</p>
        <div className="flex items-center gap-2">
          <select
            className="input !w-auto !py-1.5"
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value)}
            aria-label={t('tasks.subject')}
          >
            <option value="all">{t('tasks.allSubjects')}</option>
            <option value="none">{t('tasks.noSubject')}</option>
            {activeSubjects.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <button className="btn-primary" onClick={() => setCreating(true)}>
            <Plus className="w-4 h-4" /> {t('tasks.new')}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {COLUMNS.map((col) => (
          <div
            key={col.key}
            className="card p-4 min-h-[60vh] flex flex-col"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => onDrop(e, col.key)}
          >
            <div className="flex items-center justify-between mb-3">
              <span className={`chip ${col.tone}`}>{t(col.labelKey)}</span>
              <span className="text-xs text-ink-mute">{grouped[col.key].length}</span>
            </div>
            <div className="space-y-2 flex-1">
              {grouped[col.key].length === 0 && (
                <div className="text-center py-10 text-sm text-ink-mute">{t('tasks.noCards')}</div>
              )}
              {grouped[col.key].map((t) => (
                <TaskCard
                  key={t.id}
                  task={t}
                  onEdit={() => setEditing(t)}
                  onDelete={() => removeTask(t.id)}
                  onAdvance={() => {
                    const next: TaskStatus = t.status === 'todo' ? 'doing' : t.status === 'doing' ? 'done' : 'todo';
                    updateTask(t.id, { status: next });
                  }}
                />
              ))}
            </div>
            <QuickAdd
              onAdd={(title) =>
                addTask({
                  title,
                  kind: 'task',
                  status: col.key,
                  subjectId: subjectFilter !== 'all' && subjectFilter !== 'none' ? subjectFilter : null,
                })
              }
            />
          </div>
        ))}
      </div>

      {(creating || editing) && (
        <TaskForm task={editing} onClose={() => { setCreating(false); setEditing(null); }} />
      )}
    </div>
  );
}

function QuickAdd({ onAdd }: { onAdd: (title: string) => void }) {
  const t = useT();
  const [value, setValue] = useState('');
  const submit = () => {
    const v = value.trim();
    if (!v) return;
    onAdd(v);
    setValue('');
  };
  return (
    <div className="mt-2 flex items-center gap-1.5 pt-2 border-t border-line/60">
      <Plus className="w-4 h-4 text-ink-mute shrink-0" />
      <input
        className="flex-1 bg-transparent text-sm text-ink placeholder:text-ink-mute focus:outline-none py-1"
        placeholder={t('tasks.quickAdd')}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') submit();
          if (e.key === 'Escape') setValue('');
        }}
      />
    </div>
  );
}

function TaskCard({ task, onEdit, onDelete, onAdvance }: { task: Task; onEdit: () => void; onDelete: () => void; onAdvance: () => void }) {
  const t = useT();
  const meta = KIND_META[task.kind];
  const Icon = meta.icon;
  const d = daysUntil(task.dueDate);
  const overdue = task.status !== 'done' && d < 0;
  const soon = task.status !== 'done' && d >= 0 && d <= 2;

  const prio = task.priority ? PRIORITY_META[task.priority] : null;

  return (
    <article
      draggable
      onDragStart={(e) => e.dataTransfer.setData('text/plain', task.id)}
      className="relative overflow-hidden rounded-lg border border-line bg-bg-elev/40 p-3 pl-3.5 cursor-grab active:cursor-grabbing hover:border-brand/40 transition"
    >
      {prio && <span className={`absolute left-0 top-0 bottom-0 w-1 ${prio.bar}`} aria-hidden />}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className={`flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-semibold ${meta.color}`}>
            <Icon className="w-3 h-3" /> {t(meta.labelKey)}
            {prio && <span className={`ml-1 ${prio.dot}`}>· {t(prio.labelKey)}</span>}
          </div>
          <h4 className="font-medium mt-1 text-sm">{task.title}</h4>
        </div>
        <div className="flex gap-0.5 shrink-0">
          <button className="btn-ghost !p-1" onClick={onEdit} aria-label={t('common.edit')}><Pencil className="w-3.5 h-3.5" /></button>
          <button className="btn-ghost !p-1 hover:!text-red-400" onClick={onDelete} aria-label={t('common.delete')}><Trash2 className="w-3.5 h-3.5" /></button>
        </div>
      </div>
      {task.description && <p className="text-xs text-ink-dim mt-2 line-clamp-2">{task.description}</p>}
      <div className="flex items-center justify-between gap-2 mt-3">
        <SubjectChip subjectId={task.subjectId} />
        {task.dueDate && (
          <span className={`text-[11px] flex items-center gap-1 font-medium ${overdue ? 'text-red-300' : soon ? 'text-amber-300' : 'text-ink-dim'}`}>
            <Calendar className="w-3 h-3" /> {overdue ? t('tasks.overdue') : formatDateShort(task.dueDate)}
          </span>
        )}
      </div>
      <button className="btn-ghost w-full justify-center mt-2 !py-1 !text-xs" onClick={onAdvance}>
        Avanzar estado <ArrowRight className="w-3 h-3" />
      </button>
    </article>
  );
}

function TaskForm({ task, onClose }: { task: Task | null; onClose: () => void }) {
  const subjects = useStore((s) => s.subjects);
  const addTask = useStore((s) => s.addTask);
  const updateTask = useStore((s) => s.updateTask);

  const subjectsById = useMemo(
    () => Object.fromEntries(subjects.map((s) => [s.id, s])) as Record<string, typeof subjects[0]>,
    [subjects]
  );

  const activeSubjects = useMemo(() => {
    return subjects.filter((s) => {
      if (s.id === task?.subjectId) return true;
      if (s.status === 'approved') return false;
      if (s.status === 'ongoing' || s.status === 'regular') return true;
      return deriveStatus(s, subjectsById) === 'available';
    });
  }, [subjects, subjectsById, task]);

  const [title, setTitle] = useState(task?.title ?? '');
  const [description, setDescription] = useState(task?.description ?? '');
  const [kind, setKind] = useState<TaskKind>(task?.kind ?? 'task');
  const [status, setStatus] = useState<TaskStatus>(task?.status ?? 'todo');
  const [priority, setPriority] = useState<TaskPriority | ''>(task?.priority ?? '');
  const [subjectId, setSubjectId] = useState<string | null>(task?.subjectId ?? null);
  const [dueDate, setDueDate] = useState(task?.dueDate ?? todayISO());

  const submit = () => {
    if (!title.trim()) return;
    const payload = {
      title: title.trim(),
      description: description.trim() || undefined,
      kind,
      status,
      priority: priority || undefined,
      subjectId,
      dueDate: dueDate || undefined,
    };
    if (task) updateTask(task.id, payload);
    else addTask(payload);
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={task ? 'Editar tarea' : 'Nueva tarea'}
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" onClick={submit} disabled={!title.trim()}>
            {task ? 'Guardar' : 'Crear'}
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <div>
          <label className="label">Título *</label>
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ej: TP final" />
        </div>
        <div>
          <label className="label">Descripción</label>
          <textarea className="input" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Tipo</label>
            <select className="input" value={kind} onChange={(e) => setKind(e.target.value as TaskKind)}>
              <option value="task">Tarea</option>
              <option value="exam">Examen</option>
              <option value="delivery">Entrega</option>
            </select>
          </div>
          <div>
            <label className="label">Estado</label>
            <select className="input" value={status} onChange={(e) => setStatus(e.target.value as TaskStatus)}>
              <option value="todo">Pendiente</option>
              <option value="doing">En progreso</option>
              <option value="done">Completado</option>
            </select>
          </div>
          <div>
            <label className="label">Prioridad</label>
            <select className="input" value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority | '')}>
              <option value="">Sin prioridad</option>
              <option value="high">Alta</option>
              <option value="normal">Normal</option>
              <option value="low">Baja</option>
            </select>
          </div>
          <div>
            <label className="label">Materia</label>
            <select className="input" value={subjectId ?? ''} onChange={(e) => setSubjectId(e.target.value || null)}>
              <option value="">Sin asignar</option>
              {activeSubjects.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Fecha</label>
            <input type="date" className="input" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
        </div>
      </div>
    </Modal>
  );
}
