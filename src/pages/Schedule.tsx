import { useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useStore } from '../store';
import { hexToRgba, timeToMinutes, uid } from '../lib/utils';
import { WEEKDAYS, type ScheduleSlot, type Weekday } from '../types';
import { useT } from '../lib/i18n';
import Modal from '../components/Modal';

const HOUR_START = 7;
const HOUR_END = 24;
const PX_PER_MIN = 1.1; // 60 min ≈ 66px

export default function Schedule() {
  const subjects = useStore((s) => s.subjects);
  const updateSubject = useStore((s) => s.updateSubject);
  const t = useT();
  const [editing, setEditing] = useState<{ subjectId: string; slot: ScheduleSlot } | null>(null);
  const [adding, setAdding] = useState<Weekday | null>(null);

  const blocks = useMemo(() => {
    const map: Record<Weekday, { subj: typeof subjects[0]; slot: ScheduleSlot }[]> = { MON: [], TUE: [], WED: [], THU: [], FRI: [], SAT: [], SUN: [] };
    subjects.forEach((s) => s.slots.forEach((sl) => map[sl.day].push({ subj: s, slot: sl })));
    Object.values(map).forEach((arr) => arr.sort((a, b) => timeToMinutes(a.slot.start) - timeToMinutes(b.slot.start)));
    return map;
  }, [subjects]);

  const totalMin = (HOUR_END - HOUR_START) * 60;
  const totalHeight = totalMin * PX_PER_MIN;

  const handleSlotEdit = (subjectId: string, slot: ScheduleSlot, patch: Partial<ScheduleSlot>) => {
    const subj = subjects.find((s) => s.id === subjectId);
    if (!subj) return;
    const newSlots = patch === null ? subj.slots.filter((s) => s.id !== slot.id) : subj.slots.map((s) => (s.id === slot.id ? { ...s, ...patch } : s));
    updateSubject(subjectId, { slots: newSlots });
  };

  return (
    <div className="p-6 space-y-4 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink-dim">
          {t('schedule.intro')}
        </p>
      </div>

      <div className="card overflow-hidden">
        <div className="grid" style={{ gridTemplateColumns: '60px repeat(7, 1fr)' }}>
          <div className="border-b border-r border-line bg-bg-elev/40" />
          {WEEKDAYS.map((d) => (
            <div key={d} className="border-b border-line px-3 py-3 text-center bg-bg-elev/40 relative">
              <div className="text-[11px] uppercase tracking-wider text-ink-mute font-semibold">{t(`weekdayShort.${d}`)}</div>
              <button
                className="absolute right-1.5 top-1.5 w-5 h-5 rounded grid place-items-center text-ink-mute hover:text-brand hover:bg-bg-soft"
                onClick={() => setAdding(d)}
                aria-label={t('schedule.addBlock')}
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}

          <div className="relative border-r border-line" style={{ height: totalHeight }}>
            {Array.from({ length: HOUR_END - HOUR_START + 1 }, (_, i) => HOUR_START + i).map((h) => (
              <div
                key={h}
                className="absolute left-0 right-0 text-[10px] text-ink-mute font-mono px-1 -translate-y-1/2"
                style={{ top: (h - HOUR_START) * 60 * PX_PER_MIN }}
              >
                {String(h).padStart(2, '0')}:00
              </div>
            ))}
          </div>

          {WEEKDAYS.map((d) => (
            <div key={d} className="relative border-r border-line last:border-r-0" style={{ height: totalHeight }}>
              {Array.from({ length: HOUR_END - HOUR_START }, (_, i) => i).map((i) => (
                <div
                  key={i}
                  className="absolute left-0 right-0 border-t border-line/50"
                  style={{ top: i * 60 * PX_PER_MIN }}
                />
              ))}
              {blocks[d].map(({ subj, slot }) => {
                const top = (timeToMinutes(slot.start) - HOUR_START * 60) * PX_PER_MIN;
                const height = (timeToMinutes(slot.end) - timeToMinutes(slot.start)) * PX_PER_MIN;
                return (
                  <button
                    key={slot.id}
                    onClick={() => setEditing({ subjectId: subj.id, slot })}
                    className="absolute left-1 right-1 rounded-lg p-2 text-left overflow-hidden text-xs hover:ring-2 transition"
                    style={{
                      top,
                      height: Math.max(height, 28),
                      background: hexToRgba(subj.color, 0.18),
                      border: `1px solid ${hexToRgba(subj.color, 0.5)}`,
                      // @ts-expect-error css var
                      '--tw-ring-color': subj.color,
                    }}
                  >
                    <div className="font-semibold truncate" style={{ color: subj.color }}>
                      {subj.name}
                    </div>
                    <div className="text-[10px] font-mono opacity-80">
                      {slot.start}–{slot.end}
                    </div>
                    {subj.classroom && height > 50 && <div className="text-[10px] text-ink-dim mt-0.5 truncate">{subj.classroom}</div>}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {editing && (
        <SlotEditor
          subjectId={editing.subjectId}
          slot={editing.slot}
          onClose={() => setEditing(null)}
          onSave={(patch) => {
            handleSlotEdit(editing.subjectId, editing.slot, patch);
            setEditing(null);
          }}
          onDelete={() => {
            const subj = subjects.find((s) => s.id === editing.subjectId);
            if (subj) updateSubject(editing.subjectId, { slots: subj.slots.filter((s) => s.id !== editing.slot.id) });
            setEditing(null);
          }}
        />
      )}

      {adding && (
        <SlotAdder
          day={adding}
          onClose={() => setAdding(null)}
          onSave={(subjectId, slot) => {
            const subj = subjects.find((s) => s.id === subjectId);
            if (!subj) return;
            updateSubject(subjectId, { slots: [...subj.slots, slot] });
            setAdding(null);
          }}
        />
      )}
    </div>
  );
}

function SlotEditor({
  subjectId,
  slot,
  onClose,
  onSave,
  onDelete,
}: {
  subjectId: string;
  slot: ScheduleSlot;
  onClose: () => void;
  onSave: (patch: Partial<ScheduleSlot>) => void;
  onDelete: () => void;
}) {
  const subjects = useStore((s) => s.subjects);
  const t = useT();
  const subj = subjects.find((s) => s.id === subjectId)!;
  const [day, setDay] = useState<Weekday>(slot.day);
  const [start, setStart] = useState(slot.start);
  const [end, setEnd] = useState(slot.end);

  return (
    <Modal
      open
      onClose={onClose}
      title={`${t('schedule.editTitle')} · ${subj.name}`}
      footer={
        <>
          <button className="btn-danger mr-auto" onClick={onDelete}>
            <Trash2 className="w-4 h-4" /> {t('common.delete')}
          </button>
          <button className="btn-ghost" onClick={onClose}>
            {t('common.cancel')}
          </button>
          <button className="btn-primary" onClick={() => onSave({ day, start, end })}>
            {t('common.save')}
          </button>
        </>
      }
    >
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="label">{t('schedule.day')}</label>
          <select className="input" value={day} onChange={(e) => setDay(e.target.value as Weekday)}>
            {WEEKDAYS.map((d) => (
              <option key={d} value={d}>
                {t(`weekdayShort.${d}`)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">{t('schedule.start')}</label>
          <input type="time" className="input" value={start} onChange={(e) => setStart(e.target.value)} />
        </div>
        <div>
          <label className="label">{t('schedule.end')}</label>
          <input type="time" className="input" value={end} onChange={(e) => setEnd(e.target.value)} />
        </div>
      </div>
    </Modal>
  );
}

function SlotAdder({ day, onClose, onSave }: { day: Weekday; onClose: () => void; onSave: (subjectId: string, slot: ScheduleSlot) => void }) {
  const subjects = useStore((s) => s.subjects);
  const t = useT();
  const [subjectId, setSubjectId] = useState(subjects[0]?.id ?? '');
  const [start, setStart] = useState('18:00');
  const [end, setEnd] = useState('20:00');

  if (subjects.length === 0) {
    return (
      <Modal open onClose={onClose} title={t('schedule.addTitle')}>
        <p className="text-sm text-ink-dim">{t('schedule.subjectFirst')}</p>
      </Modal>
    );
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={`${t('schedule.addTitle')} · ${t(`weekdayShort.${day}`)}`}
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>
            {t('common.cancel')}
          </button>
          <button
            className="btn-primary"
            onClick={() => onSave(subjectId, { id: uid(), day, start, end })}
            disabled={!subjectId || timeToMinutes(end) <= timeToMinutes(start)}
          >
            {t('common.add')}
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <div>
          <label className="label">{t('schedule.subject')}</label>
          <select className="input" value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">{t('schedule.start')}</label>
            <input type="time" className="input" value={start} onChange={(e) => setStart(e.target.value)} />
          </div>
          <div>
            <label className="label">{t('schedule.end')}</label>
            <input type="time" className="input" value={end} onChange={(e) => setEnd(e.target.value)} />
          </div>
        </div>
      </div>
    </Modal>
  );
}
