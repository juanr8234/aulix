import type { CareerPlanMeta } from './lib/plan';

export type Weekday = 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT' | 'SUN';

export const WEEKDAYS: Weekday[] = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
export const WEEKDAY_LABEL: Record<Weekday, string> = {
  MON: 'Lun', TUE: 'Mar', WED: 'Mié', THU: 'Jue', FRI: 'Vie', SAT: 'Sáb', SUN: 'Dom',
};
export const WEEKDAY_FULL: Record<Weekday, string> = {
  MON: 'Lunes', TUE: 'Martes', WED: 'Miércoles', THU: 'Jueves', FRI: 'Viernes', SAT: 'Sábado', SUN: 'Domingo',
};

export interface ScheduleSlot {
  id: string;
  day: Weekday;
  start: string; // HH:MM
  end: string;   // HH:MM
}

export interface Subject {
  id: string;
  name: string;
  code?: string;
  professor?: string;
  classroom?: string;
  color: string; // hex
  status: 'pending' | 'ongoing' | 'regular' | 'approved';
  slots: ScheduleSlot[];
  createdAt: number;
  year?: number; // 1..5 — usado por simulador de carrera
  /**
   * @deprecated Mantener por compatibilidad. Usar correlativesApproved + correlativesRegular.
   * Si está presente y no hay correlativesApproved/Regular, se interpreta como "todas aprobadas".
   */
  correlatives?: string[];
  correlativesApproved?: string[]; // ids de materias que deben estar APROBADAS para cursar esta
  correlativesRegular?: string[];  // ids de materias que deben estar al menos REGULARES
}

/**
 * Estado derivado para el simulador (calculado, no persistido):
 * - locked: faltan correlativas
 * - available: cumple correlativas, todavía no la cursó
 * - regular: ya está regular
 * - approved: ya está aprobada
 */
export type DerivedStatus = 'locked' | 'available' | 'ongoing' | 'regular' | 'approved';

export interface RepoLink {
  id: string;
  subjectId: string | null; // null = General
  title: string;
  url: string;
  createdAt: number;
}

export type CalendarEventType = 'parcial' | 'final' | 'entrega' | 'personal';

export interface CalendarEvent {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  type: CalendarEventType;
  subjectId: string | null;
  comment?: string;
}

export type AcademicMarkerType = 'cuatri' | 'receso' | 'mesa' | 'feriado';

export interface AcademicMarker {
  id: string;
  date: string; // YYYY-MM-DD
  label: string;
  type: AcademicMarkerType;
}

export interface Note {
  id: string;
  subjectId: string | null;
  title: string;
  contentHtml: string;
  updatedAt: number;
  createdAt: number;
}

export type TaskStatus = 'todo' | 'doing' | 'done';
export type TaskKind = 'task' | 'exam' | 'delivery';
export type TaskPriority = 'low' | 'normal' | 'high';

export interface Task {
  id: string;
  title: string;
  description?: string;
  subjectId: string | null;
  kind: TaskKind;
  status: TaskStatus;
  priority?: TaskPriority; // opcional — sin valor = sin prioridad marcada
  dueDate?: string; // YYYY-MM-DD
  createdAt: number;
}

export interface Grade {
  id: string;
  subjectId: string;
  label: string; // ej: Parcial 1
  score: number; // 0-10
  weight: number; // 0-1
  date?: string;
  comment?: string;
}

export interface PomodoroSession {
  id: string;
  subjectId: string | null;
  durationMin: number;
  startedAt: number;
  endedAt: number;
  kind: 'focus' | 'break';
}

export interface PomodoroSettings {
  focusMin: number;
  shortBreakMin: number;
  longBreakMin: number;
  rounds: number;
}

export type ProfileId = 'personal' | 'dev';

export const PROFILES: Record<ProfileId, { name: string; description: string }> = {
  personal: {
    name: 'Personal',
    description: 'Tu carrera real, tus datos.',
  },
  dev: {
    name: 'Dev',
    description: 'Espacio para probar y demos.',
  },
};

/** Datos que viven dentro de un perfil — los que cada pantalla consume. */
export interface ProfileData {
  subjects: Subject[];
  notes: Note[];
  tasks: Task[];
  grades: Grade[];
  pomodoroSessions: PomodoroSession[];
  pomodoroSettings: PomodoroSettings;
  links: RepoLink[];
  events: CalendarEvent[];
  academicMarkers: AcademicMarker[];
  showAcademicCalendar: boolean;
  /** Metadatos del plan de carrera activo (universidad, carrera, autor…). */
  planMeta?: CareerPlanMeta;
  /** Si el wizard ya fue completado para este perfil. */
  onboardingDone: boolean;
}

/** El estado runtime de la app expone los campos del perfil activo + meta. */
export interface AppState extends ProfileData {
  activeProfile: ProfileId;
  hydrated: boolean;
}
