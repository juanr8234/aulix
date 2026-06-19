import type { Subject, DerivedStatus } from '../types';

/**
 * Devuelve los IDs de correlativas requeridas como aprobadas,
 * normalizando el campo legacy `correlatives` (todos como aprobadas).
 */
export function getApprovedReqs(s: Subject): string[] {
  if (s.correlativesApproved !== undefined) return s.correlativesApproved;
  if (s.correlatives) return s.correlatives;
  return [];
}

export function getRegularReqs(s: Subject): string[] {
  return s.correlativesRegular ?? [];
}

/**
 * Calcula el estado derivado de una materia:
 * - 'approved' / 'regular' si la materia ya está en ese estado
 * - 'available' si están todas las correlativas cumplidas
 * - 'locked' en caso contrario
 *
 * Reglas:
 * - Una correlativa "aprobada" se cumple SOLO con status='approved'.
 * - Una correlativa "regular" se cumple con status='regular' O 'approved'
 *   (porque aprobada implica haberla cursado).
 */
export function deriveStatus(
  subject: Subject,
  byId: Record<string, Subject>,
): DerivedStatus {
  if (subject.status === 'approved') return 'approved';
  if (subject.status === 'regular') return 'regular';

  const approvedReqs = getApprovedReqs(subject);
  const regularReqs = getRegularReqs(subject);

  const allApprovedOk = approvedReqs.every((id) => byId[id]?.status === 'approved');
  const allRegularOk = regularReqs.every((id) => {
    const s = byId[id]?.status;
    return s === 'regular' || s === 'approved';
  });

  if (allApprovedOk && allRegularOk) return 'available';
  return 'locked';
}

/**
 * Devuelve los requisitos pendientes de una materia (para tooltip / detalle).
 */
export function getMissingReqs(
  subject: Subject,
  byId: Record<string, Subject>,
): { approved: Subject[]; regular: Subject[] } {
  const missingApproved = getApprovedReqs(subject)
    .map((id) => byId[id])
    .filter((s) => s && s.status !== 'approved');

  const missingRegular = getRegularReqs(subject)
    .map((id) => byId[id])
    .filter((s) => s && s.status !== 'regular' && s.status !== 'approved');

  return { approved: missingApproved, regular: missingRegular };
}

export const DERIVED_COLOR: Record<DerivedStatus, string> = {
  locked: '#6b7795',    // gris (no cursable)
  available: '#3b82f6', // azul (cursable)
  regular: '#f59e0b',   // amarillo
  approved: '#22c55e',  // verde
};

export const DERIVED_LABEL: Record<DerivedStatus, string> = {
  locked: 'No cursable',
  available: 'Cursable',
  regular: 'Regular',
  approved: 'Aprobada',
};
