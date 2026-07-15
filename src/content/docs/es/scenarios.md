---
title: Escenarios
description: Un escenario es un archivo JSON que describe una prueba en lenguaje natural. Aprende el formato, las dependencias entre escenarios y la autoría asistida por LLM con windup new.
---

# Escenarios

Un escenario es un archivo JSON en tu directorio de escenarios (por defecto `e2e/scenarios/`):

```json
{
  "scenario_id": "checkout",
  "start_url": "/",
  "task": "Log in as the qa account, add 'Backpack' to the cart, check out and verify the order confirmation message appears.",
  "hints": ["Optional site-specific tips for the planner. Delete if not needed."]
}
```

- `start_url` es **opcional** (por defecto `/`) y debería mantenerse libre de entorno: una ruta, resuelta contra la base URL efectiva.
- Termina la tarea con **qué verificar** — eso se convierte en la postcondición final del plan.
- Nunca pongas secretos en las tareas. Referencia las cuentas desde el manifiesto del proyecto (consulta [Credenciales de prueba](/es/docs/credentials)); el plan usará `value_ref: "ENV:VAR"` y el valor real se resuelve solo en tiempo de ejecución, nunca se guarda en caché.

## Dependencias entre escenarios (`depends_on`)

Los flujos rara vez empiezan de cero — crear una cuenta bancaria requiere haber iniciado sesión. Declara los prerrequisitos y cada escenario se mantiene pequeño, enfocado y cacheable de forma individual:

```json
{
  "scenario_id": "create-bank-account",
  "depends_on": ["login"],
  "task": "Already on the dashboard, open Settings > Bank accounts, create an account named 'Inter' and verify it appears in the list."
}
```

- Las dependencias se ejecutan **en la misma sesión del navegador**, en orden, cada una con su propia caché — una suite caliente reproduce toda la cadena con cero llamadas al LLM.
- Sin un `start_url`, el escenario dependiente **continúa desde donde terminó la última dependencia** — y en la primera planificación el LLM ve esa página real (el dashboard tras el login), en lugar de planificar a ciegas.
- Las cadenas funcionan (`login` → `select-company` → `create-account`), los ciclos se rechazan, y una dependencia fallida hace fallar la ejecución con el tipo `dependency` antes de que el escenario en sí empiece.
- Cada dependencia conserva su propia autorreparación: si su plan en caché se rompe, se replanifica y se vuelve a cachear — los dependientes se benefician automáticamente.
- Editar el `task` de un escenario invalida su plan en caché (una prueba reescrita es una prueba distinta).

`windup new` maneja las dependencias en ambos sentidos: `--depends-on login` las declara explícitamente, y **el LLM autor también las sugiere por su cuenta** — ve cada escenario existente (id + tarea) y, cuando la instrucción presupone un estado que uno de ellos produce ("ya con sesión iniciada…"), emite `depends_on` automáticamente (filtrado mecánicamente contra los ids de escenarios reales — nunca inventados).

## Autoría con `windup new`

No tienes que escribir tareas detalladas a mano. Dale a `windup new` una instrucción imprecisa y el LLM actúa como autor de pruebas — la reescribe en un escenario preciso y verificable usando el **mapa del sitio** (pantallas, menús y elementos reales de `windup scan` y ejecuciones pasadas) y el **manifiesto del proyecto** (cuentas referenciadas por nombre, nunca credenciales literales):

```bash
npx windup new "log in with the qa user, add the backpack to the cart and check out"
# → e2e/scenarios/purchase-backpack-qa.json — real screen names, concrete fake
#   form data, account referenced as "the qa account", explicit final verification
```

Genera el `scenario_id`, elige el `start_url` entre las rutas conocidas (con `/` como respaldo — nunca inventa rutas) y añade sugerencias de selectores del mapa cuando ayudan. Añade **`--validate`** para que ejecute el escenario generado y, si falla, lo refine a partir del fallo y lo reintente (hasta 3 intentos) — recibes de vuelta un escenario que *ya pasó una vez*, con una caché caliente:

```bash
npx windup new "log in and create a cost center named Marketing" --validate
#   attempt 1: FAIL — element button:has-text('Save') not visible
#   attempt 2: PASSED
#   ✓ validated in 2 attempts — the plan is cached
```

**Las credenciales en la instrucción nunca llegan al archivo del escenario**: se registran automáticamente como una cuenta con nombre (valores en `.env.local`, mapeo en `windup.credentials.json`) y la tarea referencia la cuenta — consulta [Credenciales de prueba](/es/docs/credentials).

Flags: `--id <id>`, `--force` (sobrescribir), `--depends-on <ids>`, `--llm <provider[:model]>`. La salida es un archivo para que **tú lo revises, edites y versiones** — la autoría es asistida, la prueba sigue siendo tuya. Una llamada al LLM (~$0.001), registrada en el libro mayor de `windup costs` bajo `authoring`.
