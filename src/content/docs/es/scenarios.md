---
title: Escenarios
description: Un escenario es un archivo JSON que describe un test en lenguaje simple. Aprende el formato y los campos — dependencias, reúso isomórfico, fixtures del lado del cliente, diálogos y más.
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
- Termina la tarea con **qué verificar** — eso se convierte en la postcondición final del plan. Más allá de "un elemento es visible" o "la URL es X", el plan puede asertar **condiciones más ricas**: el texto contiene una cadena, un **conteo** de elementos (`equals`/`min`/`max`), un selector **desapareció** (no visible), o un **atributo** igual a un valor — así "verifica que aparecen 3 pedidos", "verifica que el banner de error desaparece" o "verifica que el campo queda marcado como válido" se vuelven chequeos precisos. Redacta la tarea así y el planificador emite el `expect` correspondiente.
- **Cita el texto que quieres verificar — Windup lo aserta por ti.** Cuando la tarea nombra un literal entre comillas ("…y verifica que aparece el texto **'Popular parking'**") y el chequeo final del plan resulta ser débil, Windup lo reescribe como un `text_contains` sobre ese texto exacto — **de forma determinista, sin ninguna llamada extra al LLM**, y solo tras confirmar que la página real de verdad lo contiene. Esta es la manera fiable de conseguir una aserción fuerte: no depende de que el modelo elija bien.
- **Una verificación que no puede fallar es rechazada.** Un chequeo final no vale nada si pasa sin importar cómo esté la funcionalidad: un *landmark* a secas (`body`, `html`, `main`, `div`, `#root`) o **cualquier selector a secas que coincida con más de un elemento en la página real** (`h2` en una página con cinco encabezados — borrar la sección entera todavía deja cuatro). Windup comprueba ambas cosas — la lista de landmarks sin conexión, el número de coincidencias contra la página real en el momento de planificar — y **rechaza** ese plan, replanificando con un error que indica cuántos elementos coincidieron y qué asertar en su lugar. Las aserciones de contenido valen sobre cualquier selector: `text_contains: { selector: "main", text: "Popular parking" }` pasa, porque lo que aserta es el texto. Los planes ya cacheados siguen reproduciéndose intactos; ejecuta `windup explain <id>` para detectar una verificación débil que ya tengas (imprime `⚠ weak verification: …`).
- Nunca pongas secretos en las tareas. Referencia las cuentas desde el manifiesto del proyecto (consulta [Credenciales de prueba](/es/docs/credentials)); el plan usará `value_ref: "ENV:VAR"` y el valor real se resuelve solo en tiempo de ejecución, nunca se guarda en caché.
- **Diálogos nativos y verificación no-toast.** Windup maneja los diálogos nativos del navegador (`window.confirm`/`alert`/`prompt`) que protegen acciones destructivas (archivar, eliminar, cancelar): el planificador añade `"dialog": "accept"` (o `"dismiss"` para cancelar) a la acción que abre el diálogo — de lo contrario el diálogo se descarta automáticamente y la acción no hace nada en silencio. También orienta la verificación final hacia una señal **persistente** (una fila que desaparece, una etiqueta que cambia, una URL) en vez de un toast/snackbar efímero que se desvanece en segundos.
- **Diálogo por defecto para todo el escenario (`on_dialog`).** Si un flujo dispara la *misma* confirmación en varios pasos (borrado masivo, guardas de "¿salir de la página?"), pon `"on_dialog": "accept"` (o `"dismiss"`) una sola vez en el escenario y un manejador **persistente** responde cada diálogo nativo durante toda la ejecución — sin necesidad de un `dialog` por acción. El `dialog` por acción sigue funcionando para casos puntuales; cuando `on_dialog` está presente, éste tiene prioridad.
- **Forzar una interacción por paso (`atomic_steps`).** Por defecto el planificador puede comprimir un revelar-y-actuar en una sola acción. Pon `"atomic_steps": true` y deberá emitir **una interacción por acción** — sin fusionar nunca un clic de expandir/abrir con el control que descubre — para que el replay quede granular y el reporte legible cuando la UI oculta controles tras un despliegue.
- **Poner en cuarentena un escenario flaky (`quarantine`).** Pon `"quarantine": true` y el escenario igual **corre y reporta**, pero una falla **no hará fallar la suite** (código de salida distinto de cero) — así un flake terco deja de bloquear el CI mientras lo arreglas, sin borrar el test ni dejar que enrojezca cada build. Se muestra de forma llamativa (una línea `🔶` en consola, una insignia `QUARANTINED` en el reporte, `quarantined: true` en el JSON), nunca se omite en silencio. Combínalo con `windup trends <id>` para ver si se estabilizó.
- **Fallback por etiqueta de accesibilidad (automático).** Cuando el selector CSS de un plan falla en el replay, Windup reintenta el objetivo por su **nombre accesible** (la descripción de la acción cotejada contra label/placeholder/rol) y actúa solo cuando coincide **exactamente un** campo visible — recuperándose de un selector adivinado y frágil sin re-planificar. El paso recuperado se marca en el reporte (`≈ found "<label>" by label …`). Si no resuelve ni el selector ni la etiqueta, el fallo indica que el control probablemente **no tiene etiqueta accesible (brecha de a11y)** y que lo ancles con un hint — así una ejecución rota se convierte también en un hallazgo de accesibilidad.
- **Determinismo por escenario (`network` / `clock`).** Los stubs de peticiones `network` y el reloj congelado `clock` que `windup.config.ts` expone de forma global también pueden vivir en **un solo escenario** — acotados a esa ejecución y **fusionados sobre la config global, con el escenario ganando**. Así pruebas un estado de error sin efectos colaterales: `{ "scenario_id": "erro-lista-500", "network": [{ "url": "v1/passports", "status": 500 }] }` fuerza un 500 en ese endpoint **solo aquí** (los stubs globales siguen aplicándose; el escenario de listado normal queda intacto). `clock` se fusiona campo por campo (el `now`/`timezone` del escenario sobrescribe al global). Se aplica al crear el contexto, nunca se cachea — el plan se planifica contra la página con stub, así que una aserción sobre la UI de error es estable. (Un escenario con su propio `network`/`clock` omite el prewarming del navegador — el contexto precalentado solo lleva la config global.) El error que un stub produce deliberadamente queda **excluido de la puerta `failOn`** — un `500` con stub no dispara `--fail-on-resource`/`--fail-on-5xx`.
- **`failOn` por escenario.** Abre una excepción de salud en runtime para **un solo** escenario en vez de cegar toda la suite: `{ "scenario_id": "…", "failOn": { "resourceErrors": false } }`, o un `"ignore"` acotado al escenario. Se fusiona sobre el `config.failOn` global — las puertas booleanas toman el valor del escenario cuando está definido, y las listas `ignore` **se concatenan** (el ruido global + el de este escenario). Así, una URL que solo necesitas silenciar para un listado deja de ser una entrada `ignore` que todos los demás escenarios cargan también.
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
- **Los snapshots de sesión evitan repetir la cadena (la gran palanca de velocidad).** Volver a ejecutar un flujo de inicio de sesión a través de la UI para cada escenario que depende de él es el coste dominante de tiempo real de una suite en caché. Windup captura el **estado de salida** de cada dependencia — el `storageState` de Playwright (cookies + localStorage) más su URL final — después de que se ejecuta, y en un replay en caché posterior **restaura ese estado en un contexto nuevo y omite volver a ejecutar la cadena `depends_on`** (`deps≈0ms`, reportado como `reused_session_from`). La ejecución restaurada **sigue verificándose**: si la sesión está obsoleta o no se capturó por completo, Windup descarta el snapshot y **vuelve a ejecutar la cadena completa** — sin falsos positivos, sin llamadas LLM desperdiciadas. Los snapshots viven en `.windup/state/` (**ignorado por git — contienen cookies/tokens de autenticación; nunca los subas al repositorio**).
- **Autorreparación guiada.** Una replanificación le indica al planificador el selector exacto que falló ("no lo reutilices"), reenfatiza tus hints y — con `--suggest` — le pasa a la replanificación el mismo diagnóstico experto que leerías, de modo que corrige en vez de volver a proponer un selector refutado. Si un escenario sigue replanificando sin estabilizarse, Windup advierte que probablemente la app carece de un selector estable (una brecha de accesibilidad) o tiene una race, en lugar de dar vueltas en silencio.
- Editar el `task` de un escenario invalida su plan en caché (una prueba reescrita es una prueba distinta).

`windup new` maneja las dependencias en ambos sentidos: `--depends-on login` las declara explícitamente, y **el LLM autor también las sugiere por su cuenta** — ve cada escenario existente (id + tarea) y, cuando la instrucción presupone un estado que uno de ellos produce ("ya con sesión iniciada…"), emite `depends_on` automáticamente (filtrado mecánicamente contra los ids de escenarios reales — nunca inventados).

**Precondiciones de datos (`requires`).** `depends_on` captura una dependencia de *escenario*; `requires` documenta una de *datos* — los datos de semilla (seed) que un escenario asume: `"requires": ["1 active attraction", "a paid order"]`. Es declarativo (Windup lo muestra en el informe para que un fallo causado por datos faltantes sea legible, y traza el ciclo crear→usar→archivar) — para sembrar realmente los datos, usa `setup` / `suite.setup`.

**Etiquetas (`tags`).** Etiqueta un escenario con `"tags": ["smoke", "checkout"]` y ejecuta un subconjunto en CI con `run --all --tag smoke` — smoke en cada push, la suite completa cada noche.

## Reutilización isomórfica de planes (`like`)

A gran escala, muchos escenarios son el **mismo flujo en una ruta/entidad distinta** — crear un contacto, crear un negocio, crear una empresa accionan todos el mismo formulario. En lugar de pagar una llamada de planificación al LLM por cada uno, un escenario puede reutilizar el plan **ya probado** de otro:

```json
{
  "scenario_id": "deals-create",
  "start_url": "/deals/new",
  "task": "Type 'Big Deal' into the Name field and click Save; verify a new row appears.",
  "like": { "scenario": "contacts-create", "set": { "Alice": "Big Deal" } }
}
```

- `like.scenario` nombra el escenario cuyo plan en caché activo es la plantilla. Windup lo instancia para **este** escenario — este `start_url`, y `like.set` intercambia cualquier valor de relleno que difiera (`"source literal" → "value to use here"`, aplicado solo a los campos `value`; los selectores y los secretos `value_ref` quedan intactos).
- El plan reutilizado **igual se ejecuta y se verifica** antes de confiar en él y guardarlo en caché — exactamente la misma barrera que pasa todo plan. Si las páginas no son realmente isomórficas (un selector no coincide, la verificación falla), Windup **recurre a la planificación normal con el LLM**. Nunca omite la verificación, así que no puede producir un falso verde silencioso.
- Cuando verifica, la ejecución costó **cero llamadas al LLM** y el escenario ya tiene su propio plan en caché; las ejecuciones siguientes son reproducciones `$0` normales.
- El origen debe haberse planificado una vez primero (su plan es la plantilla). En una suite donde el origen se ejecuta más tarde, el escenario `like` simplemente planifica con el LLM esa ronda y reutiliza en la siguiente — sin error, solo una optimización perdida.

Reutiliza planes enteros con `like`; reutiliza un **bloque de acciones** entre flujos por lo demás distintos con un fragmento (`windup fragment extract`). Ambos mantienen la garantía determinista y verificada.

## Fixtures del lado del cliente (`seed`)

Parte del estado vive por completo en el navegador — un carrito en `localStorage`, un dispositivo POS seleccionado en `sessionStorage`. Construirlo a través de la UI cada vez es lento y acopla la prueba a ese flujo. `seed` inyecta ese estado **antes de que el plan se ejecute**, de forma determinista y sin ninguna llamada al servidor:

```json
{
  "scenario_id": "cart-updates-quantity",
  "start_url": "/checkout/cart",
  "task": "Increase the first item's quantity to 3 and verify the total updates.",
  "seed": {
    "localStorage": { "cart": "[{\"id\":\"tkt-1\",\"qty\":2,\"price\":50}]" },
    "sessionStorage": { "pos_device": "reader-7" }
  }
}
```

- Se siembra por **origen** (por defecto: el origen de `start_url`; anúlalo con `seed.origin`) mediante un script de inicialización de Playwright que se ejecuta antes de los scripts de la app, de modo que la página carga ya en ese estado.
- **Cada clave se establece solo si está ausente** — las mutaciones propias de la app (un carrito que la prueba luego edita) nunca se sobrescriben en navegaciones posteriores.
- **No** forma parte del plan en caché: se ejecuta en cada corrida (incluidas las repeticiones `$0`), de modo que los escenarios sembrados permanecen deterministas.
- Seguro para CI por construcción: alcanzas un estado del lado del cliente directamente en lugar de conducir un flujo que podría llegar al servidor. Ideal para escenarios de carrito/checkout y POS.

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
## No escribas escenarios a mano

Dos formas de crear un escenario sin escribir JSON:

- **[Autoría con `windup new`](/es/docs/authoring)** — da una instrucción imprecisa y el LLM escribe un escenario preciso y verificable desde las pantallas reales de tu app.
- **[`windup record`](/es/docs/record)** — autoría por demostración: maneja un navegador headful, marca qué verificar, finaliza. Windup escribe el escenario y cachea el plan grabado para un replay $0.
