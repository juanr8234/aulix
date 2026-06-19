import type { Subject } from '../types';
import { uid, pickColor } from './utils';
import { getApprovedReqs, getRegularReqs } from './simulator';

/**
 * Formato portable de un plan de carrera (`.aulix-plan.json`).
 *
 * Filosofía: el plan describe SOLO el currículum (materias + correlativas + año).
 * Nunca incluye progreso personal (estados, notas, profesores, horarios).
 * Las correlativas se referencian por `code` (estable y legible), no por id interno.
 */

export interface PlanSubject {
  code: string;
  name: string;
  year: number;
  correlativesRegular?: string[];  // códigos que deben estar al menos REGULARES
  correlativesApproved?: string[]; // códigos que deben estar APROBADOS
}

export interface CareerPlanMeta {
  university?: string;
  career?: string;
  author?: string;
  sourceUrl?: string;
  updatedAt?: string;
}

export interface CareerPlan {
  format: 'aulix-plan';
  version: 1;
  meta: CareerPlanMeta;
  subjects: PlanSubject[];
}

/** Color por año (cae a la paleta general si el año supera el mapa). */
const COLOR_BY_YEAR: Record<number, string> = {
  1: '#3b82f6', // azul
  2: '#a855f7', // violeta
  3: '#22c55e', // verde
  4: '#f59e0b', // ámbar
  5: '#ef4444', // rojo
};

export function colorForYear(year: number, index = 0): string {
  return COLOR_BY_YEAR[year] ?? pickColor(index);
}

/** Convierte un plan portable en materias internas (status 'pending', ids nuevos). */
export function subjectsFromPlan(plan: CareerPlan): Subject[] {
  const now = Date.now();
  const idByCode: Record<string, string> = {};
  plan.subjects.forEach((s) => { idByCode[s.code] = uid(); });

  return plan.subjects.map((s, i) => ({
    id: idByCode[s.code],
    name: s.name,
    code: s.code,
    color: colorForYear(s.year, i),
    status: 'pending',
    slots: [],
    createdAt: now,
    year: s.year,
    correlativesApproved: (s.correlativesApproved ?? []).map((c) => idByCode[c]).filter(Boolean),
    correlativesRegular: (s.correlativesRegular ?? []).map((c) => idByCode[c]).filter(Boolean),
  }));
}

/** Construye un plan portable a partir de las materias actuales (para exportar/compartir). */
export function planFromSubjects(subjects: Subject[], meta: CareerPlanMeta = {}): CareerPlan {
  // Garantizar un code único por materia (genera uno si falta).
  const codeById: Record<string, string> = {};
  const used = new Set<string>();
  subjects.forEach((s, i) => {
    let code = (s.code || '').trim();
    if (!code || used.has(code)) {
      code = `S${String(i + 1).padStart(2, '0')}`;
      while (used.has(code)) code += 'x';
    }
    used.add(code);
    codeById[s.id] = code;
  });

  return {
    format: 'aulix-plan',
    version: 1,
    meta: { updatedAt: new Date().toISOString().slice(0, 10), ...meta },
    subjects: subjects
      .slice()
      .sort((a, b) => (a.year ?? 1) - (b.year ?? 1))
      .map((s) => ({
        code: codeById[s.id],
        name: s.name,
        year: s.year ?? 1,
        correlativesRegular: getRegularReqs(s).map((id) => codeById[id]).filter(Boolean),
        correlativesApproved: getApprovedReqs(s).map((id) => codeById[id]).filter(Boolean),
      })),
  };
}

export type ValidationResult =
  | { ok: true; plan: CareerPlan }
  | { ok: false; error: string };

/** Valida y normaliza un objeto crudo (parseado de JSON) como CareerPlan. */
export function validatePlan(raw: unknown): ValidationResult {
  if (typeof raw !== 'object' || raw === null) {
    return { ok: false, error: 'El archivo no contiene un objeto JSON válido.' };
  }
  const obj = raw as Record<string, any>;

  if (obj.format !== 'aulix-plan') {
    return { ok: false, error: 'No parece un plan de Aulix (falta "format": "aulix-plan").' };
  }
  if (!Array.isArray(obj.subjects) || obj.subjects.length === 0) {
    return { ok: false, error: 'El plan no tiene materias.' };
  }

  const codes = new Set<string>();
  const subjects: PlanSubject[] = [];
  for (let i = 0; i < obj.subjects.length; i++) {
    const s = obj.subjects[i];
    if (typeof s?.name !== 'string' || !s.name.trim()) {
      return { ok: false, error: `La materia #${i + 1} no tiene nombre.` };
    }
    const code = typeof s.code === 'string' && s.code.trim() ? s.code.trim() : `S${String(i + 1).padStart(2, '0')}`;
    if (codes.has(code)) {
      return { ok: false, error: `El código "${code}" está repetido.` };
    }
    codes.add(code);
    const year = Number(s.year);
    subjects.push({
      code,
      name: s.name.trim(),
      year: Number.isFinite(year) && year >= 1 ? Math.floor(year) : 1,
      correlativesRegular: Array.isArray(s.correlativesRegular) ? s.correlativesRegular.map(String) : [],
      correlativesApproved: Array.isArray(s.correlativesApproved) ? s.correlativesApproved.map(String) : [],
    });
  }

  // Descartar correlativas que apunten a códigos inexistentes (tolerante).
  for (const s of subjects) {
    s.correlativesRegular = s.correlativesRegular!.filter((c) => codes.has(c));
    s.correlativesApproved = s.correlativesApproved!.filter((c) => codes.has(c));
  }

  const meta: CareerPlanMeta = typeof obj.meta === 'object' && obj.meta ? obj.meta : {};
  return { ok: true, plan: { format: 'aulix-plan', version: 1, meta, subjects } };
}

/** Dispara la descarga de un plan como archivo `.aulix-plan.json`. */
export function downloadPlan(plan: CareerPlan) {
  const slug = (plan.meta.career || plan.meta.university || 'plan')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const blob = new Blob([JSON.stringify(plan, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${slug || 'plan'}.aulix-plan.json`;
  a.click();
  URL.revokeObjectURL(url);
}
