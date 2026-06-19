import { useMemo, useState } from 'react';
import { Plus, ChevronLeft, ChevronRight, Trash2, Pencil, CalendarRange, GraduationCap } from 'lucide-react';
import { useStore } from '../store';
import { hexToRgba, formatDate } from '../lib/utils';
import { useT } from '../lib/i18n';
import type { AcademicMarker, AcademicMarkerType, CalendarEvent, CalendarEventType, Subject } from '../types';
import Modal from '../components/Modal';

const DAY_KEYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

const TYPE_LABEL_KEY: Record<CalendarEventType, string> = {
  parcial: 'calendar.evParcial', final: 'calendar.evFinal', entrega: 'calendar.evEntrega', personal: 'calendar.evPersonal',
};

const TYPE_COLOR: Record<CalendarEventType, string> = {
  parcial: '#ef4444',
  final: '#a855f7',
  entrega: '#f0a020',
  personal: '#8b5cf6',
};

const ACAD_LABEL_KEY: Record<AcademicMarkerType, string> = {
  feriado: 'calendar.acFeriado',
  receso:  'calendar.acReceso',
  mesa:    'calendar.acMesa',
  cuatri:  'calendar.acCuatri',
};

const ACAD_CLASS: Record<AcademicMarkerType, string> = {
  feriado:  'cal-day-holiday',
  receso:   'cal-day-recess',
  mesa:     'cal-day-mesa',
  cuatri:   'cal-day-milestone',
};

const ACAD_DOT: Record<AcademicMarkerType, string> = {
  feriado:  '#ef4444',
  receso:   '#7dd3fc',
  mesa:     'linear-gradient(135deg, #ef4444 0%, #fbbf24 100%)',
  cuatri:   '#86efac',
};

/** Prioridad para apilar markers cuando hay varios el mismo día */
const ACAD_PRIO: Record<AcademicMarkerType, number> = { feriado: 4, cuatri: 3, mesa: 2, receso: 1 };

function toISO(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function buildMonthGrid(year: number, monthIdx: number): Date[] {
  const first = new Date(year, monthIdx, 1);
  const startOffset = (first.getDay() + 6) % 7; // lunes = 0
  const start = new Date(year, monthIdx, 1 - startOffset);
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

interface EventForm {
  id?: string;
  date: string;
  title: string;
  type: CalendarEventType;
  subjectId: string | null;
  comment?: string;
}

interface MarkerForm {
  id?: string;
  date: string;
  label: string;
  type: AcademicMarkerType;
}

export default function CalendarPage() {
  const t = useT();
  const events = useStore((s) => s.events);
  const academicMarkers = useStore((s) => s.academicMarkers);
  const subjects = useStore((s) => s.subjects);
  const showAcademic = useStore((s) => s.showAcademicCalendar);
  const setShowAcademic = useStore((s) => s.setShowAcademicCalendar);
  const addEvent = useStore((s) => s.addEvent);
  const updateEvent = useStore((s) => s.updateEvent);
  const removeEvent = useStore((s) => s.removeEvent);
  const addMarker = useStore((s) => s.addAcademicMarker);
  const updateMarker = useStore((s) => s.updateAcademicMarker);
  const removeMarker = useStore((s) => s.removeAcademicMarker);

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const [cursor, setCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState<string>(toISO(today));
  const [showPersonal, setShowPersonal] = useState(true);
  const [editingEvent, setEditingEvent] = useState<EventForm | null>(null);
  const [editingMarker, setEditingMarker] = useState<MarkerForm | null>(null);

  const subjectMap = useMemo(
    () => Object.fromEntries(subjects.map((s) => [s.id, s])) as Record<string, Subject>,
    [subjects],
  );

  const visibleEvents = useMemo(() => {
    return events.filter((e) => (e.type === 'personal' ? showPersonal : true));
  }, [events, showPersonal]);

  const eventsByDay = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    visibleEvents.forEach((e) => { (map[e.date] ??= []).push(e); });
    return map;
  }, [visibleEvents]);

  const markersByDay = useMemo(() => {
    if (!showAcademic) return {} as Record<string, AcademicMarker[]>;
    const map: Record<string, AcademicMarker[]> = {};
    (academicMarkers ?? []).forEach((m) => { (map[m.date] ??= []).push(m); });
    // Ordenar por prioridad
    Object.keys(map).forEach((k) => {
      map[k].sort((a, b) => ACAD_PRIO[b.type] - ACAD_PRIO[a.type]);
    });
    return map;
  }, [academicMarkers, showAcademic]);

  const grid = useMemo(() => buildMonthGrid(cursor.getFullYear(), cursor.getMonth()), [cursor]);

  const counts = useMemo(() => {
    const monthIso = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`;
    const monthEvents = visibleEvents.filter((e) => e.date.startsWith(monthIso));
    const exams = monthEvents.filter((e) => e.type === 'parcial' || e.type === 'final').length;
    const todayIso = toISO(today);
    const upcoming = visibleEvents.filter((e) => e.date >= todayIso).sort((a, b) => a.date.localeCompare(b.date));
    return { total: monthEvents.length, exams, upcoming: upcoming.slice(0, 5) };
  }, [visibleEvents, cursor, today]);

  const dayEvents = eventsByDay[selectedDate] ?? [];
  const dayMarkers = markersByDay[selectedDate] ?? [];

  function gotoMonth(delta: number) {
    setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + delta, 1));
  }
  function gotoToday() {
    setCursor(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedDate(toISO(today));
  }

  function saveEvent() {
    if (!editingEvent) return;
    const ti = editingEvent.title.trim();
    if (!ti || !editingEvent.date) return;
    if (editingEvent.id) {
      updateEvent(editingEvent.id, {
        title: ti, date: editingEvent.date, type: editingEvent.type,
        subjectId: editingEvent.subjectId, comment: editingEvent.comment,
      });
    } else {
      addEvent({
        title: ti, date: editingEvent.date, type: editingEvent.type,
        subjectId: editingEvent.subjectId, comment: editingEvent.comment,
      });
    }
    setEditingEvent(null);
  }

  function saveMarker() {
    if (!editingMarker) return;
    const lbl = editingMarker.label.trim();
    if (!lbl || !editingMarker.date) return;
    if (editingMarker.id) {
      updateMarker(editingMarker.id, { label: lbl, date: editingMarker.date, type: editingMarker.type });
    } else {
      addMarker({ label: lbl, date: editingMarker.date, type: editingMarker.type });
    }
    setEditingMarker(null);
  }

  return (
    <div className="p-6 max-w-[1600px] mx-auto h-full">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            <span className="display text-3xl">{t('calendar.title')}</span>
          </h1>
          <p className="text-sm text-ink-dim mt-1">
            {t('calendar.subtitle')}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn-outline text-sm" onClick={gotoToday}>
            <CalendarRange className="w-4 h-4" /> {t('calendar.today')}
          </button>
          <button
            className="btn-outline text-sm"
            onClick={() => setEditingMarker({ date: selectedDate, label: '', type: 'feriado' })}
          >
            <GraduationCap className="w-4 h-4" /> {t('calendar.markDay')}
          </button>
          <button
            className="btn-primary"
            onClick={() => setEditingEvent({ date: selectedDate, title: '', type: 'personal', subjectId: null })}
          >
            <Plus className="w-4 h-4" /> {t('calendar.btnNewEvent')}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-5">
        {/* Calendar */}
        <div className="card p-4 sm:p-5">
          <div className="flex items-center justify-between mb-4">
            <button className="btn-ghost !p-1.5" onClick={() => gotoMonth(-1)} aria-label={t('calendar.prevMonth')}>
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-semibold">
              {t('months.m' + cursor.getMonth())}{' '}
              <span className="text-ink-dim font-normal display text-xl">{cursor.getFullYear()}</span>
            </h2>
            <button className="btn-ghost !p-1.5" onClick={() => gotoMonth(1)} aria-label={t('calendar.nextMonth')}>
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-1">
            {DAY_KEYS.map((d) => (
              <div key={d} className="text-[11px] uppercase tracking-wider text-ink-mute font-semibold text-center py-1">
                {t('weekdayShort.' + d)}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {grid.map((d) => {
              const iso = toISO(d);
              const isOtherMonth = d.getMonth() !== cursor.getMonth();
              const isToday = iso === toISO(today);
              const isSelected = iso === selectedDate;
              const dayEvts = eventsByDay[iso] ?? [];
              const marks = markersByDay[iso] ?? [];
              const topMark = marks[0]; // mayor prioridad

              const baseBg = topMark ? ACAD_CLASS[topMark.type] : '';
              const tooltip = [
                ...marks.map((mk) => `${t(ACAD_LABEL_KEY[mk.type])}: ${mk.label}`),
                ...dayEvts.map((e) => `${t(TYPE_LABEL_KEY[e.type])}: ${e.title}`),
              ].join('\n');

              return (
                <button
                  key={iso}
                  onClick={() => setSelectedDate(iso)}
                  title={tooltip || undefined}
                  className={`min-h-[92px] rounded-lg border p-1.5 text-left transition flex flex-col gap-1 cal-day ${baseBg} ${
                    isSelected
                      ? 'ring-2 ring-brand ring-offset-1 ring-offset-bg-card'
                      : isOtherMonth && !topMark
                      ? 'border-line/40 bg-bg-elev/30 text-ink-mute hover:border-line'
                      : !topMark
                      ? 'border-line bg-bg-elev/40 hover:border-brand/40'
                      : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div
                      className={`text-xs font-semibold ${
                        isToday
                          ? 'inline-grid place-items-center w-6 h-6 rounded-full text-white shadow-glow'
                          : ''
                      }`}
                      style={isToday ? { background: '#8b5cf6' } : undefined}
                    >
                      {d.getDate()}
                    </div>
                    {marks.length > 0 && (
                      <div className="flex gap-0.5">
                        {marks.slice(0, 3).map((mk) => (
                          <span
                            key={mk.id}
                            className="w-1.5 h-1.5 rounded-full shrink-0"
                            style={{ background: ACAD_DOT[mk.type] }}
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex-1 space-y-0.5 overflow-hidden">
                    {dayEvts.slice(0, 2).map((e) => {
                      const subj = e.subjectId ? subjectMap[e.subjectId] : null;
                      const color = subj ? subj.color : TYPE_COLOR[e.type];
                      return (
                        <div
                          key={e.id}
                          className="text-[10px] truncate px-1.5 py-0.5 rounded font-medium"
                          style={{ background: hexToRgba(color, 0.22), color }}
                        >
                          {e.title}
                        </div>
                      );
                    })}
                    {dayEvts.length > 2 && (
                      <div className="text-[10px] text-ink-mute px-1.5">+{dayEvts.length - 2}</div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right panel */}
        <div className="space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-2">
            <div className="card p-3 text-center">
              <div className="text-[10px] uppercase tracking-wider text-ink-mute font-semibold">{t('calendar.statEvents')}</div>
              <div className="text-2xl font-bold mt-1">{counts.total}</div>
            </div>
            <div className="card p-3 text-center">
              <div className="text-[10px] uppercase tracking-wider text-ink-mute font-semibold">{t('calendar.statExams')}</div>
              <div className="text-2xl font-bold mt-1 text-red-400">{counts.exams}</div>
            </div>
            <div className="card p-3 text-center">
              <div className="text-[10px] uppercase tracking-wider text-ink-mute font-semibold">{t('calendar.statUpcoming')}</div>
              <div className="text-2xl font-bold mt-1 text-brand-glow">{counts.upcoming.length}</div>
            </div>
          </div>

          {/* Filtros */}
          <div className="card p-4">
            <div className="section-title mb-3">{t('calendar.calendars')}</div>
            <label className="flex items-center justify-between py-2 cursor-pointer">
              <span className="text-sm">{t('calendar.academic2026')}</span>
              <input
                type="checkbox"
                checked={showAcademic}
                onChange={(e) => setShowAcademic(e.target.checked)}
                className="accent-brand w-4 h-4"
              />
            </label>
            <label className="flex items-center justify-between py-2 cursor-pointer">
              <span className="text-sm">{t('calendar.personalEvents')}</span>
              <input
                type="checkbox"
                checked={showPersonal}
                onChange={(e) => setShowPersonal(e.target.checked)}
                className="accent-brand w-4 h-4"
              />
            </label>
          </div>

          {/* Leyenda */}
          {showAcademic && (
            <div className="card p-4">
              <div className="section-title mb-3">{t('calendar.legend')}</div>
              <div className="space-y-2 text-xs">
                <LegendRow type="cuatri" />
                <LegendRow type="mesa" />
                <LegendRow type="receso" />
                <LegendRow type="feriado" />
              </div>
            </div>
          )}

          {/* Día seleccionado */}
          <div className="card p-4">
            <div className="section-title mb-3">{formatDate(selectedDate)}</div>

            {dayMarkers.length > 0 && (
              <div className="mb-3 space-y-1.5">
                {dayMarkers.map((mk) => (
                  <div
                    key={mk.id}
                    className={`text-xs flex items-start gap-2 p-2 rounded-md border group ${ACAD_CLASS[mk.type]}`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold truncate">{mk.label}</div>
                      <div className="text-[10px] uppercase tracking-wider opacity-75">
                        {t(ACAD_LABEL_KEY[mk.type])}
                      </div>
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition shrink-0">
                      <button
                        className="hover:opacity-80 p-0.5"
                        onClick={() => setEditingMarker({ id: mk.id, date: mk.date, label: mk.label, type: mk.type })}
                        aria-label={t('common.edit')}
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                      <button
                        className="hover:text-red-400 p-0.5"
                        onClick={() => { if (confirm(t('common.confirmDelete', { name: mk.label }))) removeMarker(mk.id); }}
                        aria-label={t('common.delete')}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {dayEvents.length === 0 && dayMarkers.length === 0 ? (
              <p className="text-sm text-ink-dim py-4 text-center">{t('calendar.noActivity')}</p>
            ) : dayEvents.length === 0 ? null : (
              <ul className="space-y-2">
                {dayEvents.map((e) => {
                  const subj = e.subjectId ? subjectMap[e.subjectId] : null;
                  const color = subj ? subj.color : TYPE_COLOR[e.type];
                  return (
                    <li key={e.id} className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-bg-soft group">
                      <div className="w-1 self-stretch rounded-full mt-0.5" style={{ background: color }} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold truncate">{e.title}</div>
                        <div className="text-[11px] text-ink-mute">
                          {t(TYPE_LABEL_KEY[e.type])}{subj ? ` · ${subj.name}` : ''}
                        </div>
                        {e.comment && <div className="text-xs text-ink-dim mt-1 line-clamp-2">{e.comment}</div>}
                      </div>
                      <div className="opacity-0 group-hover:opacity-100 flex gap-1">
                        <button
                          className="btn-ghost !p-1"
                          onClick={() => setEditingEvent({ id: e.id, date: e.date, title: e.title, type: e.type, subjectId: e.subjectId, comment: e.comment })}
                          aria-label={t('common.edit')}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          className="btn-ghost !p-1 hover:!text-red-400"
                          onClick={() => { if (confirm(t('common.confirmDelete', { name: e.title }))) removeEvent(e.id); }}
                          aria-label={t('common.delete')}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Modal: evento */}
      <Modal
        open={!!editingEvent}
        onClose={() => setEditingEvent(null)}
        title={editingEvent?.id ? t('calendar.modalEditEvent') : t('calendar.modalNewEvent')}
        footer={
          <>
            <button className="btn-ghost" onClick={() => setEditingEvent(null)}>{t('common.cancel')}</button>
            <button className="btn-primary" onClick={saveEvent}>{t('common.save')}</button>
          </>
        }
      >
        {editingEvent && (
          <div className="space-y-4">
            <div>
              <label className="label">{t('calendar.evTitle')}</label>
              <input
                className="input"
                value={editingEvent.title}
                onChange={(e) => setEditingEvent({ ...editingEvent, title: e.target.value })}
                autoFocus
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">{t('calendar.evDate')}</label>
                <input
                  type="date"
                  className="input"
                  value={editingEvent.date}
                  onChange={(e) => setEditingEvent({ ...editingEvent, date: e.target.value })}
                />
              </div>
              <div>
                <label className="label">{t('calendar.evType')}</label>
                <select
                  className="input"
                  value={editingEvent.type}
                  onChange={(e) => setEditingEvent({ ...editingEvent, type: e.target.value as CalendarEventType })}
                >
                  <option value="personal">{t('calendar.evPersonal')}</option>
                  <option value="parcial">{t('calendar.evParcial')}</option>
                  <option value="final">{t('calendar.evFinal')}</option>
                  <option value="entrega">{t('calendar.evEntrega')}</option>
                </select>
              </div>
            </div>
            <div>
              <label className="label">{t('calendar.evSubject')}</label>
              <select
                className="input"
                value={editingEvent.subjectId ?? ''}
                onChange={(e) => setEditingEvent({ ...editingEvent, subjectId: e.target.value || null })}
              >
                <option value="">{t('calendar.evNone')}</option>
                {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">{t('calendar.evComment')}</label>
              <textarea
                className="input min-h-[80px] resize-none"
                value={editingEvent.comment ?? ''}
                onChange={(e) => setEditingEvent({ ...editingEvent, comment: e.target.value })}
              />
            </div>
          </div>
        )}
      </Modal>

      {/* Modal: marker académico */}
      <Modal
        open={!!editingMarker}
        onClose={() => setEditingMarker(null)}
        title={editingMarker?.id ? t('calendar.modalEditMarker') : t('calendar.modalMarkMarker')}
        footer={
          <>
            <button className="btn-ghost" onClick={() => setEditingMarker(null)}>{t('common.cancel')}</button>
            <button className="btn-primary" onClick={saveMarker}>{t('common.save')}</button>
          </>
        }
      >
        {editingMarker && (
          <div className="space-y-4">
            <div>
              <label className="label">{t('calendar.mkDesc')}</label>
              <input
                className="input"
                value={editingMarker.label}
                onChange={(e) => setEditingMarker({ ...editingMarker, label: e.target.value })}
                placeholder={t('calendar.mkDescPh')}
                autoFocus
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">{t('calendar.mkDate')}</label>
                <input
                  type="date"
                  className="input"
                  value={editingMarker.date}
                  onChange={(e) => setEditingMarker({ ...editingMarker, date: e.target.value })}
                />
              </div>
              <div>
                <label className="label">{t('calendar.mkType')}</label>
                <select
                  className="input"
                  value={editingMarker.type}
                  onChange={(e) => setEditingMarker({ ...editingMarker, type: e.target.value as AcademicMarkerType })}
                >
                  <option value="cuatri">{t('calendar.acCuatri')}</option>
                  <option value="mesa">{t('calendar.acMesa')}</option>
                  <option value="receso">{t('calendar.acReceso')}</option>
                  <option value="feriado">{t('calendar.acFeriado')}</option>
                </select>
              </div>
            </div>
            <div className="card p-3 text-xs text-ink-dim">
              <div className="font-semibold text-ink mb-1">{t('calendar.colorPreview')}</div>
              <div className={`p-3 rounded-md border ${ACAD_CLASS[editingMarker.type]}`}>
                {editingMarker.label || t('calendar.noDescription')}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function LegendRow({ type }: { type: AcademicMarkerType }) {
  const t = useT();
  return (
    <div className="flex items-center gap-2.5">
      <div
        className="w-4 h-4 rounded shrink-0 border border-line/50"
        style={{ background: ACAD_DOT[type] }}
      />
      <span className="text-ink-dim">{t(ACAD_LABEL_KEY[type])}</span>
    </div>
  );
}
