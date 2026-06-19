import type { ProfileData, Subject } from '../types';
import { uid } from './utils';
import { ACADEMIC_2026 } from './academic-calendar';
import { subjectsFromPlan } from './plan';
import { DEFAULT_PLAN } from '../plans';

/**
 * El plan de carrera ya NO está hardcodeado acá: vive como dato portable en
 * `src/plans/*.json` y se materializa con `subjectsFromPlan`.
 * Para sumar/editar planes ver `docs/onboarding-plans.md`.
 */
function buildSubjects(): Subject[] {
  return subjectsFromPlan(DEFAULT_PLAN);
}

/**
 * Perfil de demo / mockup ("Dev"): plan completo con materias en distintos estados,
 * notas, tareas, grades y links de ejemplo. Onboarding se considera hecho.
 */
export function buildSeed(): ProfileData {
  const now = Date.now();
  const inDays = (n: number) => {
    const d = new Date(); d.setDate(d.getDate() + n);
    return d.toISOString().slice(0, 10);
  };

  const subjects = buildSubjects();
  const id = (code: string): string | null => subjects.find((s) => s.code === code)?.id ?? null;
  const setStatus = (code: string, status: Subject['status']) => {
    const s = subjects.find((x) => x.code === code);
    if (s) s.status = status;
  };

  // Algunas materias ya en estado de ejemplo, para que la app no arranque toda gris
  setStatus('M01', 'approved');
  setStatus('M02', 'approved');
  setStatus('M05', 'approved');
  setStatus('M06', 'regular');
  setStatus('M07', 'regular');

  const todayISO = new Date().toISOString().slice(0, 10);

  return {
    subjects,
    notes: [
      {
        id: uid(),
        subjectId: id('M14'),
        title: 'Paradigmas — comparación rápida',
        contentHtml: '<h2>Imperativo vs Funcional</h2><p>Estado mutable vs inmutabilidad. Side effects vs pureza.</p><ul><li>OOP</li><li>Funcional</li><li>Lógico</li></ul>',
        createdAt: now - 86400000,
        updatedAt: now - 3600000,
      },
    ],
    tasks: [
      { id: uid(), title: 'Repasar listas enlazadas', kind: 'task', status: 'todo', subjectId: id('M06'), dueDate: inDays(1), createdAt: now },
      { id: uid(), title: 'TP integrador AyED', kind: 'delivery', status: 'doing', subjectId: id('M06'), dueDate: inDays(5), createdAt: now },
      { id: uid(), title: 'Parcial Arquitectura', kind: 'exam', status: 'todo', subjectId: id('M07'), dueDate: inDays(7), description: 'Pipeline, jerarquía de memoria', createdAt: now },
      { id: uid(), title: 'Resumen lógica proposicional', kind: 'task', status: 'done', subjectId: id('M05'), dueDate: todayISO, createdAt: now - 86400000 },
    ],
    grades: [
      { id: uid(), subjectId: id('M01')!, label: 'Final', score: 8, weight: 1, date: inDays(-30), comment: 'Aprobado.' },
      { id: uid(), subjectId: id('M05')!, label: 'Parcial 1', score: 9, weight: 0.5, date: inDays(-20) },
    ],
    pomodoroSessions: [],
    pomodoroSettings: { focusMin: 25, shortBreakMin: 5, longBreakMin: 15, rounds: 4 },
    links: [
      { id: uid(), subjectId: id('M06'), title: 'Repo de la cátedra', url: 'https://github.com/', createdAt: now },
      { id: uid(), subjectId: null, title: 'Apuntes generales', url: 'https://drive.google.com/', createdAt: now },
    ],
    events: [
      { id: uid(), date: inDays(7), title: 'Parcial Arquitectura', type: 'parcial', subjectId: id('M07') },
      { id: uid(), date: inDays(5), title: 'Entrega TP AyED', type: 'entrega', subjectId: id('M06') },
    ],
    academicMarkers: ACADEMIC_2026,
    showAcademicCalendar: true,
    planMeta: DEFAULT_PLAN.meta,
    onboardingDone: true,
  };
}

/**
 * Perfil vacío para usuario real ("Personal"): sin materias precargadas.
 * El usuario importa su propio plan desde el constructor durante el onboarding.
 * El calendario académico oficial sí viene precargado.
 * Onboarding pendiente para que se le muestre el wizard.
 */
export function buildEmptyProfile(): ProfileData {
  return {
    subjects: [],
    notes: [],
    tasks: [],
    grades: [],
    pomodoroSessions: [],
    pomodoroSettings: { focusMin: 25, shortBreakMin: 5, longBreakMin: 15, rounds: 4 },
    links: [],
    events: [],
    academicMarkers: ACADEMIC_2026,
    showAcademicCalendar: true,
    planMeta: {},
    onboardingDone: false,
  };
}
