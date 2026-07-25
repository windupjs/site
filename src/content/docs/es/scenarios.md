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
- **Diálogos nativos y verificación no-toast.** Windup maneja los diálogos nativos del navegador (`window.confirm`/`alert`/`prompt`) que protegen acciones destructivas (archivar, eliminar, cancelar): el planificador añade `"dialog": "accept"` (o `"dismiss"` para cancelar) a la acción que abre el diálogo — de lo contrario el diálogo se descarta automáticamente y la acción no hace nada en silencio. También orienta la verificación final hacia una señal **persistente** (una fila que desaparece, una etiqueta que cambia, una URL) en vez de un toast/snackbar efímero que se desvanece en segundos.
- **Organiza por carpeta.** Los escenarios se descubren de forma recursiva, así que puedes agruparlos en subcarpetas (`e2e/scenarios/contacts/list.json`, `e2e/scenarios/auth/login.json`). El **`scenario_id` es la identidad** — `run --all`, la suite de vitest y `depends_on` se resuelven todos por él, con independencia de la ruta del archivo (los ids duplicados se reportan).

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
- **Autorreparación guiada.** Una replanificación le indica al planificador el selector exacto que falló ("no lo reutilices"), reenfatiza tus hints y — con `--suggest` — le pasa a la replanificación el mismo diagnóstico experto que leerías, de modo que corrige en vez de volver a proponer un selector refutado. Si un escenario sigue replanificando sin estabilizarse, Windup advierte que probablemente la app carece de un selector estable (una brecha de accesibilidad) o tiene una race, en lugar de dar vueltas en silencio.
- Editar el `task` de un escenario invalida su plan en caché (una prueba reescrita es una prueba distinta).

`windup new` maneja las dependencias en ambos sentidos: `--depends-on login` las declara explícitamente, y **el LLM autor también las sugiere por su cuenta** — ve cada escenario existente (id + tarea) y, cuando la instrucción presupone un estado que uno de ellos produce ("ya con sesión iniciada…"), emite `depends_on` automáticamente (filtrado mecánicamente contra los ids de escenarios reales — nunca inventados).

## Idempotencia, setup y teardown

Un replay reejecuta el **mismo plan en caché con los mismos valores** — ideal para flujos **idempotentes** (editar un registro fijo a un valor fijo, alternar y comprobar, leer/listar/filtrar). **No** encaja con un **CREATE** puro cuyo recurso tiene una clave única no reutilizable: la primera ejecución lo crea, cada replay viola la restricción. Dos formas de cubrir las escrituras:

1. **Prefiere escenarios idempotentes** — edita un registro de prueba conocido en vez de crear uno nuevo; el replay cuesta `$0` y no deja residuos.
2. **Hooks `setup` / `teardown`** — comandos de shell que se ejecutan **fuera** del plan en caché (por tanto en cada replay), para fixtures o limpieza (hard-delete de lo que la prueba creó, reset vía SQL/HTTP):

```json
{
  "scenario_id": "create-contact",
  "task": "Open Contacts, create a contact with CPF 111.111.111-11 and verify it appears in the list.",
  "setup":    "psql \"$DATABASE_URL\" -c \"delete from contacts where national_id = '11111111111'\"",
  "teardown": "psql \"$DATABASE_URL\" -c \"delete from contacts where national_id = '11111111111'\""
}
```

`setup` se ejecuta antes del escenario y sus dependencias (un fallo hace fallar la ejecución); `teardown` se ejecuta después, **siempre** — pase o falle (un fallo es una advertencia). Son tus propios comandos de confianza (como el `beforeEach`/`afterEach` de una prueba), se ejecutan en la raíz del proyecto con el env del proceso, y nunca entran en el plan ni en la caché.

Para el estado compartido por toda la suite (sembrar una base de datos de fixtures una vez, arrancar un stub), usa `suite.setup` / `suite.teardown` en la [configuración](/configuration/) — se ejecutan **una vez** alrededor de `run --all` (el análogo de `beforeAll`/`afterAll`), mientras que los hooks por escenario gestionan el estado por prueba.

## Autoría con `windup new`

> **La tarea y su verificación final son la mejor conjetura del LLM** a partir de tu instrucción y el mapa del sitio — un LLM puede elegir un destino plausible pero equivocado. `windup new` orienta la verificación hacia el objetivo real de la instrucción (un elemento/texto visible en vez de una ruta adivinada) y recomienda confirmar con `--validate` (generar → ejecutar → autorrefinar hasta ponerse en verde) o una primera `windup run`.

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
