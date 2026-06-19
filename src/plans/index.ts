import type { CareerPlan } from '../lib/plan';
import utnIsi from './utn-isi.json';

/**
 * Planes de carrera incluidos en la app (galería).
 * Para sumar el tuyo: agregá un `.json` en esta carpeta y registralo acá.
 * Cualquiera puede aportar planes por Pull Request — ver docs/onboarding-plans.md.
 */
export interface BundledPlan {
  id: string;
  plan: CareerPlan;
}

export const BUNDLED_PLANS: BundledPlan[] = [
  { id: 'utn-isi', plan: utnIsi as CareerPlan },
];

/** Plan por defecto para perfiles nuevos. */
export const DEFAULT_PLAN: CareerPlan = utnIsi as CareerPlan;
