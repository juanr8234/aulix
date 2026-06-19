import { create } from 'zustand';
import type {
  AcademicMarker, AppState, CalendarEvent, Grade, Note, PomodoroSession,
  PomodoroSettings, ProfileData, ProfileId, RepoLink, Subject, Task,
} from './types';
import { buildSeed, buildEmptyProfile } from './lib/seed';
import { uid } from './lib/utils';
import { subjectsFromPlan, type CareerPlan, type CareerPlanMeta } from './lib/plan';

declare global {
  interface Window {
    aulix?: {
      storage: {
        read: () => Promise<string | null>;
        write: (payload: string) => Promise<boolean>;
      };
    };
  }
}

const STORAGE_KEY = 'aulix:data:v2';
const LEGACY_KEYS = ['aulix:data:v1', 'gaul:data:v1'];

/** Persistencia: contenedor de perfiles. */
interface PersistedDocument {
  version: 2;
  activeProfile: ProfileId;
  profiles: Record<ProfileId, ProfileData>;
}

function defaultProfileData(profile: ProfileId): ProfileData {
  // El perfil "personal" arranca con onboarding pendiente y plan completo.
  // El perfil "dev" viene poblado con datos de ejemplo (mockup).
  if (profile === 'dev') {
    return { ...buildSeed(), onboardingDone: true };
  }
  return buildEmptyProfile();
}

function defaultDocument(): PersistedDocument {
  return {
    version: 2,
    activeProfile: 'personal',
    profiles: {
      personal: defaultProfileData('personal'),
      dev: defaultProfileData('dev'),
    },
  };
}

/**
 * Migración desde formatos legacy:
 * - v1 (un solo blob plano): se mete como perfil "personal" + se crea "dev" con seed.
 */
function migrateLegacyBlob(parsed: any): PersistedDocument {
  const personalData: ProfileData = {
    subjects: parsed.subjects ?? [],
    notes: parsed.notes ?? [],
    tasks: parsed.tasks ?? [],
    grades: parsed.grades ?? [],
    pomodoroSessions: parsed.pomodoroSessions ?? [],
    pomodoroSettings: parsed.pomodoroSettings ?? {
      focusMin: 25, shortBreakMin: 5, longBreakMin: 15, rounds: 4,
    },
    links: parsed.links ?? [],
    events: parsed.events ?? [],
    academicMarkers: parsed.academicMarkers ?? [],
    showAcademicCalendar: parsed.showAcademicCalendar ?? true,
    planMeta: parsed.planMeta ?? {},
    onboardingDone: true, // si tenía datos previos, no le mostramos el wizard
  };
  return {
    version: 2,
    activeProfile: 'personal',
    profiles: {
      personal: personalData,
      dev: defaultProfileData('dev'),
    },
  };
}

/** Descarta sesiones de pomodoro con duración imposible (datos corruptos históricos). */
function sanitizeProfile(p: ProfileData): ProfileData {
  const MAX_SESSION_MIN = 24 * 60; // una sesión jamás dura más de un día
  return {
    ...p,
    pomodoroSessions: (p.pomodoroSessions ?? []).filter(
      (s) => Number.isFinite(s.durationMin) && s.durationMin > 0 && s.durationMin <= MAX_SESSION_MIN,
    ),
  };
}

function withDocumentDefaults(parsed: any): PersistedDocument {
  if (parsed?.version === 2 && parsed.profiles?.personal && parsed.profiles?.dev) {
    const doc = parsed as PersistedDocument;
    return {
      ...doc,
      profiles: {
        personal: sanitizeProfile(doc.profiles.personal),
        dev: sanitizeProfile(doc.profiles.dev),
      },
    };
  }
  // Asumir que es un blob legacy
  return migrateLegacyBlob(parsed);
}

async function loadDocument(): Promise<PersistedDocument> {
  try {
    if (window.aulix?.storage) {
      const raw = await window.aulix.storage.read();
      if (raw) return withDocumentDefaults(JSON.parse(raw));
    } else {
      // Probar la key actual primero
      let raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        // Migrar de keys viejas si existen
        for (const k of LEGACY_KEYS) {
          const legacy = localStorage.getItem(k);
          if (legacy) { raw = legacy; break; }
        }
      }
      if (raw) return withDocumentDefaults(JSON.parse(raw));
    }
  } catch (e) {
    console.error('load error', e);
  }
  return defaultDocument();
}

let currentDocument: PersistedDocument = defaultDocument();

/** Escritura a disco diferida: el estado en memoria es inmediato; el disco se calma. */
let writeTimer: ReturnType<typeof setTimeout> | null = null;

function flushDocument() {
  const payload = JSON.stringify(currentDocument);
  try {
    if (window.aulix?.storage) {
      window.aulix.storage.write(payload);
    } else {
      localStorage.setItem(STORAGE_KEY, payload);
    }
  } catch (e) {
    console.error('persist error', e);
  }
}

function persistDocument() {
  if (writeTimer) clearTimeout(writeTimer);
  writeTimer = setTimeout(flushDocument, 400);
}

/** Toma el state actual y lo vuelca como ProfileData del perfil activo. */
function snapshotToProfileData(st: AppState): ProfileData {
  return {
    subjects: st.subjects,
    notes: st.notes,
    tasks: st.tasks,
    grades: st.grades,
    pomodoroSessions: st.pomodoroSessions,
    pomodoroSettings: st.pomodoroSettings,
    links: st.links,
    events: st.events,
    academicMarkers: st.academicMarkers,
    showAcademicCalendar: st.showAcademicCalendar,
    planMeta: st.planMeta ?? {},
    onboardingDone: st.onboardingDone,
  };
}

/** Persiste: actualiza el documento con el snapshot actual del perfil activo y guarda a disco. */
function persist(st: AppState) {
  currentDocument = {
    ...currentDocument,
    profiles: {
      ...currentDocument.profiles,
      [st.activeProfile]: snapshotToProfileData(st),
    },
  };
  persistDocument();
}

interface Actions {
  hydrate: () => Promise<void>;
  // profiles
  switchProfile: (profile: ProfileId) => void;
  resetProfile: (profile: ProfileId) => void;
  // onboarding
  finishOnboarding: () => void;
  resetOnboarding: () => void;
  // subjects
  addSubject: (s: Omit<Subject, 'id' | 'createdAt'>) => void;
  updateSubject: (id: string, patch: Partial<Subject>) => void;
  removeSubject: (id: string) => void;
  // plan
  importPlan: (plan: CareerPlan) => void;
  setPlanMeta: (patch: Partial<CareerPlanMeta>) => void;
  // notes
  addNote: (n: Partial<Note>) => string;
  updateNote: (id: string, patch: Partial<Note>) => void;
  removeNote: (id: string) => void;
  // tasks
  addTask: (t: Omit<Task, 'id' | 'createdAt'>) => void;
  updateTask: (id: string, patch: Partial<Task>) => void;
  removeTask: (id: string) => void;
  // grades
  addGrade: (g: Omit<Grade, 'id'>) => void;
  updateGrade: (id: string, patch: Partial<Grade>) => void;
  removeGrade: (id: string) => void;
  // pomodoro
  setPomodoroSettings: (s: Partial<PomodoroSettings>) => void;
  logPomodoro: (s: Omit<PomodoroSession, 'id'>) => void;
  // links
  addLink: (l: Omit<RepoLink, 'id' | 'createdAt'>) => void;
  updateLink: (id: string, patch: Partial<RepoLink>) => void;
  removeLink: (id: string) => void;
  // calendar
  addEvent: (e: Omit<CalendarEvent, 'id'>) => void;
  updateEvent: (id: string, patch: Partial<CalendarEvent>) => void;
  removeEvent: (id: string) => void;
  // academic markers
  addAcademicMarker: (m: Omit<AcademicMarker, 'id'>) => void;
  updateAcademicMarker: (id: string, patch: Partial<AcademicMarker>) => void;
  removeAcademicMarker: (id: string) => void;
  setShowAcademicCalendar: (v: boolean) => void;
}

const initialEmpty = buildEmptyProfile();

const initial: AppState = {
  hydrated: false,
  activeProfile: 'personal',
  ...initialEmpty,
};

export const useStore = create<AppState & Actions>((set, get) => ({
  ...initial,

  hydrate: async () => {
    const doc = await loadDocument();
    currentDocument = doc;
    const data = doc.profiles[doc.activeProfile];
    set({ ...data, activeProfile: doc.activeProfile, hydrated: true });
  },

  switchProfile: (profile) => {
    // Antes de cambiar, guardamos el snapshot del perfil actual
    const st = get();
    currentDocument = {
      ...currentDocument,
      activeProfile: profile,
      profiles: {
        ...currentDocument.profiles,
        [st.activeProfile]: snapshotToProfileData(st),
      },
    };
    const next = currentDocument.profiles[profile];
    set({ ...next, activeProfile: profile });
    persistDocument();
  },

  resetProfile: (profile) => {
    const fresh = defaultProfileData(profile);
    currentDocument = {
      ...currentDocument,
      profiles: { ...currentDocument.profiles, [profile]: fresh },
    };
    if (get().activeProfile === profile) {
      set({ ...fresh });
    }
    persistDocument();
  },

  finishOnboarding: () => {
    set({ onboardingDone: true });
    persist(get());
  },
  resetOnboarding: () => {
    set({ onboardingDone: false });
    persist(get());
  },

  addSubject: (s) => {
    set((st) => ({ subjects: [...st.subjects, { ...s, id: uid(), createdAt: Date.now() }] }));
    persist(get());
  },
  updateSubject: (id, patch) => {
    set((st) => ({ subjects: st.subjects.map((x) => (x.id === id ? { ...x, ...patch } : x)) }));
    persist(get());
  },
  removeSubject: (id) => {
    set((st) => ({
      subjects: st.subjects.filter((x) => x.id !== id),
      notes: st.notes.map((n) => (n.subjectId === id ? { ...n, subjectId: null } : n)),
      tasks: st.tasks.map((t) => (t.subjectId === id ? { ...t, subjectId: null } : t)),
      grades: st.grades.filter((g) => g.subjectId !== id),
      // limpiar correlativas que apuntaban a la materia borrada
      // (se recalcula en el map de abajo)
    }));
    set((st) => ({
      subjects: st.subjects.map((s) => ({
        ...s,
        correlativesApproved: s.correlativesApproved?.filter((c) => c !== id),
        correlativesRegular: s.correlativesRegular?.filter((c) => c !== id),
      })),
    }));
    persist(get());
  },

  importPlan: (plan) => {
    const subjects = subjectsFromPlan(plan);
    // Reemplaza el currículum. Como cambian los ids, se limpian las
    // referencias personales a materias (notas/tareas/links/eventos) y las notas de grade.
    set((st) => ({
      subjects,
      planMeta: plan.meta ?? {},
      grades: [],
      notes: st.notes.map((n) => ({ ...n, subjectId: null })),
      tasks: st.tasks.map((t) => ({ ...t, subjectId: null })),
      links: (st.links ?? []).map((l) => ({ ...l, subjectId: null })),
      events: (st.events ?? []).map((e) => ({ ...e, subjectId: null })),
    }));
    persist(get());
  },
  setPlanMeta: (patch) => {
    set((st) => ({ planMeta: { ...(st.planMeta ?? {}), ...patch } }));
    persist(get());
  },

  addNote: (n) => {
    const id = uid();
    const now = Date.now();
    set((st) => ({
      notes: [
        { id, subjectId: n.subjectId ?? null, title: n.title ?? 'Nueva nota', contentHtml: n.contentHtml ?? '', createdAt: now, updatedAt: now },
        ...st.notes,
      ],
    }));
    persist(get());
    return id;
  },
  updateNote: (id, patch) => {
    set((st) => ({
      notes: st.notes.map((x) => (x.id === id ? { ...x, ...patch, updatedAt: Date.now() } : x)),
    }));
    persist(get());
  },
  removeNote: (id) => {
    set((st) => ({ notes: st.notes.filter((x) => x.id !== id) }));
    persist(get());
  },

  addTask: (t) => {
    set((st) => ({ tasks: [...st.tasks, { ...t, id: uid(), createdAt: Date.now() }] }));
    persist(get());
  },
  updateTask: (id, patch) => {
    set((st) => ({ tasks: st.tasks.map((x) => (x.id === id ? { ...x, ...patch } : x)) }));
    persist(get());
  },
  removeTask: (id) => {
    set((st) => ({ tasks: st.tasks.filter((x) => x.id !== id) }));
    persist(get());
  },

  addGrade: (g) => {
    set((st) => ({ grades: [...st.grades, { ...g, id: uid() }] }));
    persist(get());
  },
  updateGrade: (id, patch) => {
    set((st) => ({ grades: st.grades.map((x) => (x.id === id ? { ...x, ...patch } : x)) }));
    persist(get());
  },
  removeGrade: (id) => {
    set((st) => ({ grades: st.grades.filter((x) => x.id !== id) }));
    persist(get());
  },

  setPomodoroSettings: (s) => {
    set((st) => ({ pomodoroSettings: { ...st.pomodoroSettings, ...s } }));
    persist(get());
  },
  logPomodoro: (s) => {
    set((st) => ({ pomodoroSessions: [{ ...s, id: uid() }, ...st.pomodoroSessions].slice(0, 200) }));
    persist(get());
  },

  addLink: (l) => {
    set((st) => ({ links: [{ ...l, id: uid(), createdAt: Date.now() }, ...(st.links ?? [])] }));
    persist(get());
  },
  updateLink: (id, patch) => {
    set((st) => ({ links: (st.links ?? []).map((x) => (x.id === id ? { ...x, ...patch } : x)) }));
    persist(get());
  },
  removeLink: (id) => {
    set((st) => ({ links: (st.links ?? []).filter((x) => x.id !== id) }));
    persist(get());
  },

  addEvent: (e) => {
    set((st) => ({ events: [...(st.events ?? []), { ...e, id: uid() }] }));
    persist(get());
  },
  updateEvent: (id, patch) => {
    set((st) => ({ events: (st.events ?? []).map((x) => (x.id === id ? { ...x, ...patch } : x)) }));
    persist(get());
  },
  removeEvent: (id) => {
    set((st) => ({ events: (st.events ?? []).filter((x) => x.id !== id) }));
    persist(get());
  },
  addAcademicMarker: (m) => {
    set((st) => ({ academicMarkers: [...(st.academicMarkers ?? []), { ...m, id: uid() }] }));
    persist(get());
  },
  updateAcademicMarker: (id, patch) => {
    set((st) => ({
      academicMarkers: (st.academicMarkers ?? []).map((x) => (x.id === id ? { ...x, ...patch } : x)),
    }));
    persist(get());
  },
  removeAcademicMarker: (id) => {
    set((st) => ({
      academicMarkers: (st.academicMarkers ?? []).filter((x) => x.id !== id),
    }));
    persist(get());
  },
  setShowAcademicCalendar: (v) => {
    set({ showAcademicCalendar: v });
    persist(get());
  },
}));
