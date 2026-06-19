import type { AcademicMarker } from '../types';

/**
 * Calendario académico 2026 — Resolución N° 832/2025 (CET FRRe).
 * Extraído de la imagen oficial. Los días se interpretan como:
 *
 *  - 'feriado'  (rojo)            — feriado nacional o asueto
 *  - 'receso'   (azul)            — receso invernal
 *  - 'mesa'     (gradiente rojo→amarillo) — mesa con suspensión de clases
 *  - 'cuatri'   (verde)           — inicio o fin de cuatrimestre
 *
 * IDs estables por fecha+tipo para que en futuras hidrataciones no se dupliquen.
 */

const m = (date: string, label: string, type: AcademicMarker['type']): AcademicMarker => ({
  id: `acad:${type}:${date}`,
  date,
  label,
  type,
});

/** Devuelve un array de AcademicMarker entre dos fechas (inclusivo) con la misma etiqueta y tipo. */
function range(start: string, end: string, label: string, type: AcademicMarker['type']): AcademicMarker[] {
  const out: AcademicMarker[] = [];
  const d = new Date(start + 'T00:00:00');
  const last = new Date(end + 'T00:00:00');
  while (d <= last) {
    const iso = d.toISOString().slice(0, 10);
    out.push(m(iso, label, type));
    d.setDate(d.getDate() + 1);
  }
  return out;
}

export const ACADEMIC_2026: AcademicMarker[] = [
  // ─── Marzo 2026 ───────────────────────────────
  m('2026-03-16', 'Inicio del 1er cuatrimestre', 'cuatri'),
  m('2026-03-23', 'Día de la Memoria', 'feriado'),
  m('2026-03-24', 'Día de la Memoria (asueto)', 'feriado'),

  // ─── Abril 2026 ───────────────────────────────
  m('2026-04-02', 'Día del Veterano (Malvinas)', 'feriado'),
  m('2026-04-03', 'Viernes Santo', 'feriado'),
  ...range('2026-04-13', '2026-04-18', 'Mesa de exámenes', 'mesa'),

  // ─── Mayo 2026 ────────────────────────────────
  m('2026-05-01', 'Día del Trabajador', 'feriado'),
  m('2026-05-25', 'Revolución de Mayo', 'feriado'),

  // ─── Junio 2026 ───────────────────────────────
  m('2026-06-10', 'Mesa de un día', 'mesa'),
  m('2026-06-15', 'Paso a la Inmortalidad de Güemes', 'feriado'),
  m('2026-06-20', 'Día de la Bandera', 'feriado'),

  // ─── Julio 2026 ───────────────────────────────
  m('2026-07-09', 'Día de la Independencia', 'feriado'),
  ...range('2026-07-10', '2026-07-17', 'Mesa de exámenes', 'mesa'),
  m('2026-07-18', 'Fin del 1er cuatrimestre', 'cuatri'),
  ...range('2026-07-20', '2026-07-31', 'Receso invernal', 'receso'),

  // ─── Agosto 2026 ──────────────────────────────
  m('2026-08-01', 'Receso invernal', 'receso'),
  ...range('2026-08-03', '2026-08-08', 'Mesa de exámenes', 'mesa'),
  m('2026-08-10', 'Inicio del 2do cuatrimestre', 'cuatri'),
  m('2026-08-17', 'Paso a la Inmortalidad de San Martín', 'feriado'),
  m('2026-08-19', 'Mesa de un día', 'mesa'),
  m('2026-08-27', 'Mesa de un día', 'mesa'),

  // ─── Septiembre 2026 ──────────────────────────
  ...range('2026-09-07', '2026-09-12', 'Mesa de exámenes', 'mesa'),
  m('2026-09-21', 'Día del Estudiante', 'mesa'),

  // ─── Octubre 2026 ─────────────────────────────
  m('2026-10-12', 'Día del Respeto a la Diversidad Cultural', 'feriado'),
  m('2026-10-20', 'Mesa de un día', 'mesa'),

  // ─── Noviembre 2026 ───────────────────────────
  m('2026-11-23', 'Día de la Soberanía Nacional', 'feriado'),

  // ─── Diciembre 2026 ───────────────────────────
  m('2026-12-05', 'Fin del 2do cuatrimestre', 'cuatri'),
  ...range('2026-12-07', '2026-12-13', 'Mesa de exámenes', 'mesa'),
  m('2026-12-08', 'Inmaculada Concepción', 'feriado'),
  ...range('2026-12-14', '2026-12-20', 'Mesa de exámenes', 'mesa'),
  m('2026-12-25', 'Navidad', 'feriado'),

  // ─── Febrero 2027 ─────────────────────────────
  ...range('2027-02-08', '2027-02-09', 'Mesa de exámenes', 'mesa'),
  ...range('2027-02-15', '2027-02-21', 'Mesa de exámenes', 'mesa'),
  ...range('2027-02-22', '2027-02-28', 'Mesa de exámenes', 'mesa'),

  // ─── Marzo 2027 ───────────────────────────────
  ...range('2027-03-01', '2027-03-07', 'Mesa de exámenes', 'mesa'),
  m('2027-03-24', 'Día de la Memoria', 'feriado'),
  m('2027-03-25', 'Día de la Memoria (asueto)', 'feriado'),
  m('2027-03-26', 'Día de la Memoria (asueto)', 'feriado'),
];
