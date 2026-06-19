# Diseño — Onboarding con planes importables y compartibles

> Estado: **Fase A + B + Constructor implementados** (plan como dato, import/export y editor visual).
> Pendiente: galería en el onboarding (Fase C) y refinar el camino "de cero" desde el wizard.
> Filosofía: *make it simple*. Sin backend, sin cuentas, offline-first.

## Cómo funciona hoy (implementado)

- El plan vive en `src/plans/utn-isi.json` y se carga vía `src/lib/plan.ts` (`subjectsFromPlan`).
- `src/plans/index.ts` registra los planes bundled (`BUNDLED_PLANS`, `DEFAULT_PLAN`).
- **Constructor** en `src/pages/PlanBuilder.tsx` (ruta `/constructor`, sidebar): crear/editar/borrar
  materias, año, código y correlativas (aprobadas/regulares), más Importar/Exportar `.aulix-plan.json`.
- Store: acciones `importPlan(plan)` y `setPlanMeta(patch)`; `planMeta` persistido en cada perfil.
- Export = solo currículum (`planFromSubjects` → `downloadPlan`). Import valida con `validatePlan`.

## Idea central

Separar dos cosas que hoy están mezcladas en `src/lib/seed.ts`:

| Concepto | Qué es | Dónde vive |
|---|---|---|
| **Plan de carrera** (currículum) | Materias + correlativas + año. Igual para todos los de esa carrera | Archivo `.json` portable y compartible |
| **Progreso personal** | Estado (aprobada/regular), notas, profesores, horarios | Perfil local, **nunca se comparte** |

Hoy el plan ISI (UTN-FRRe) está hardcodeado en la tabla `PLAN` de `seed.ts`. Lo convertimos en
un **archivo de datos** elegible/importable/exportable.

## Decisiones tomadas

1. **El export comparte solo currículum** (no incluye progreso). El backup personal queda para más adelante si hace falta.
2. **Distribución: bundled + importar archivo.** La app trae planes curados adentro y permite importar cualquier `.json`. La comunidad aporta planes por Pull Request a `/plans`. Sin descarga en vivo desde GitHub (rompería offline-first).

## Formato `.aulix-plan.json`

Correlativas referenciadas por **`code`** (estable y legible), no por id interno.

```jsonc
{
  "format": "aulix-plan",
  "version": 1,
  "meta": {
    "university": "UTN — FRRe",
    "career": "Ingeniería en Sistemas de Información",
    "author": "@usuario",
    "sourceUrl": "https://...resolucion.pdf",
    "updatedAt": "2026-05-30"
  },
  "subjects": [
    { "code": "M01", "name": "Análisis Matemático I", "year": 1,
      "correlativesRegular": [], "correlativesApproved": [] },
    { "code": "M09", "name": "Análisis Matemático II", "year": 2,
      "correlativesRegular": ["M01", "M02"], "correlativesApproved": [] },
    { "code": "M19", "name": "Bases de Datos", "year": 3,
      "correlativesRegular": ["M13","M14","M15","M16"], "correlativesApproved": ["M05","M06"] }
  ],
  "calendar": []   // opcional: feriados/recesos de esa facultad
}
```

## Onboarding rediseñado

Actual: `Bienvenida → Año → Materias`.
Nuevo: `Bienvenida → ¿Cómo empezás? → (Año → Materias) | Constructor manual`.

Paso nuevo con 3 caminos:

- **Elegir un plan de la galería** — planes bundled (arranca con UTN-ISI). Carga materias y sigue al
  paso "Año/Materias" actual (que no se toca).
- **Importar JSON** — `<input type="file">` + `FileReader` (funciona en Electron sin IPC). Valida y
  muestra preview antes de confirmar.
- **Empezar de cero** — constructor mínimo: agregar materia (nombre, año, correlativas con multiselect
  de las ya cargadas). Reutiliza `addSubject` del store.

## Compartir (open-source, sin infraestructura)

1. **Exportar**: botón en el Plan de carrera → descarga `<career>.aulix-plan.json` (solo currículum).
2. **Carpeta `/plans` en el repo**: la comunidad sube planes por PR. README con el formato.
3. **La app trae un set curado bundled**; importar-archivo cubre el resto.

Import/export usan File API + Blob estándar — sin código Electron nuevo.

## Cambios de código (cuando se implemente)

| Archivo | Cambio |
|---|---|
| `src/lib/plan.ts` (nuevo) | `CareerPlan`, `validatePlan(json)`, `subjectsFromPlan(plan)` (code→uid), `planFromSubjects(subjects, meta)` |
| `src/plans/` (nuevo) | `utn-isi.json` (extraído de `seed.ts`) + `index.ts` con los bundled |
| `src/lib/seed.ts` | `buildEmptyProfile()` / `buildSeed()` construyen desde un `CareerPlan`; se va la tabla de 36 filas al JSON |
| `src/store.ts` | Acciones `applyPlan(plan)` (con confirmación) y `exportPlan()` |
| `src/components/OnboardingWizard.tsx` | Paso "source" + sub-flujo constructor manual |
| `src/pages/Simulator.tsx` o Materias | Botones Importar / Exportar plan |
| `/plans/README.md` (repo) | Doc del formato para contribuidores |

## Roadmap por fases

- **Fase A — Plan como dato**: extraer ISI a `utn-isi.json`, crear `lib/plan.ts`, seed/onboarding leen de ahí. Comportamiento idéntico; base de todo.
- **Fase B — Importar / Exportar**: botones con validación + preview. Ya se comparten planes por archivo.
- **Fase C — Galería + paso de onboarding**: paso "¿Cómo empezás?" con planes bundled.
- **Fase D — Constructor manual**: camino "de cero". Menor prioridad (importar JSON cubre el 90%).
- **Repo**: `/plans` + README + PR template, en paralelo a Fase B.

## Guardarraíles "make it simple"

- Sin backend, sin cuentas, sin sync en la nube. Compartir = archivo JSON + PRs.
- Correlativas por `code`, no por id.
- El currículum compartido no incluye progreso personal.
- El flujo "Año → Materias" actual no se modifica.
- Validación de import a mano (~40 líneas), sin schema engine pesado.
