---
title: Configuración
description: La referencia de windup.config.ts — base URL, proveedores de LLM, ajustes de scan y el manifiesto del proyecto que inyecta el conocimiento del equipo en el planificador.
---

# Configuración (`windup.config.ts`)

```ts
import { defineConfig } from "windupjs";

export default defineConfig({
  baseUrl: "http://localhost:3000",
  llm: {
    provider: "google",
    model: "gemini-3.1-flash-lite",
    // Several providers at once — pick per run with --llm (see "LLM providers"):
    providers: { openai: { model: "gpt-5-mini" } },
  },
  scenarios: "e2e/scenarios",
  framework: "react-router",          // detected by init; used by scan
  // browser: "chromium",             // or "firefox" / "webkit" (need: npx playwright install <name>)
  scan: {
    llmAssist: { enabled: true, maxCalls: 20 },   // hard cost cap per scan
  },
  // Project manifest: team-provided knowledge injected into the planner prompt.
  context: {
    conventions: ["every interactive element has a data-testid"],
    credentials: {
      qa: { user: "ENV:QA_USER", password: "ENV:QA_PASSWORD" },
    },
    vocabulary: { "order": "the Order entity, screen /orders" },
  },
  // Señales de disponibilidad reutilizables por glob de ruta (anti-flaky) — ver abajo.
  readySignals: {
    "**/workspace/**": "#app-ready",              // espera esto antes de actuar en cualquier página /workspace/*
    "**/reports/**": ["#grid", "[data-loaded]"],  // uno o más selectores
  },
  // Fixtures a nivel de suite: se ejecutan una vez alrededor de `run --all` (beforeAll / afterAll).
  suite: {
    setup:    "npm run db:seed",
    teardown: "npm run db:reset",
  },
  // Lista de bloqueo de seguridad: aborta si un plan llega a tocar esto (guardarraíl de CI).
  forbid: {
    selectors: ["#change-password", "[data-danger]"],  // coincidencia de subcadena en el selector de un plan
    urls: ["**/account/password", "**/admin/**"],       // globs de ruta que la ejecución nunca debe alcanzar
  },
  // Valores dinámicos obtenidos en tiempo de ejecución (OTP, magic-links) — referenciados por un plan vía value_ref/url_ref.
  resolve: {
    otp_code:   { source: { kind: "cmd", command: "psql \"$DATABASE_URL\" -tAc \"select code from otp_codes order by created_at desc limit 1\"" }, extract: { regex: "(\\d{6})" }, poll: { timeout_ms: 30000 } },
    magic_link: { source: { kind: "http", url: "https://inbox.test/latest" }, extract: { json: "body.url" }, url: true },
  },
  // Enlace determinista: cualquier fill en un campo coincidente se rellena desde el resolver.
  resolveFields: { "[name=otp]": "otp_code" },
  // Stub de requests: respuestas deterministas para peticiones que casen (un 500, una lista vacía, una llamada caída).
  network: [
    { url: "**/api/orders", json: [] },                 // fuerza una lista vacía
    { url: "**/api/report", status: 500 },              // simula un error del servidor
    { url: "**/analytics", abort: true },               // descarta la petición (error de red)
  ],
  // Reloj congelado: fija la hora y/o el timezone de la página para escenarios dependientes de fecha.
  clock: { now: "2026-01-15T09:00:00Z", timezone: "America/Sao_Paulo" },
  // Barreras de salud en runtime: falla un escenario ante un error de consola / 5xx durante el run.
  failOn: { consoleErrors: true, http5xx: true, ignore: ["/analytics", "third-party.example"] },
  // Emulación de dispositivo: un preset de Playwright aplicado a cada run (viewport/UA/mobile). El cache se keyea por dispositivo.
  device: "iPhone 14",
  // Presupuestos de performance: falla cuando la métrica de la página final supera el umbral (ms, o sin unidad para cls).
  budgets: { lcp_ms: 2500, cls: 0.1, load_ms: 4000 },
});
```

- **`context.credentials`** mapea nombres de cuenta a referencias ENV. Cuando una tarea menciona la cuenta, el plan usa `value_ref` — las credenciales del manifiesto tienen precedencia aunque la página muestre valores, y al planificador se le prohíbe inventar nombres ENV.
- **`readySignals`** mapea un glob de ruta al/los selector(es) CSS que deben estar **visibles antes de que el ejecutor lance la primera acción** en una página coincidente. Se aplica de forma determinista en tiempo de ejecución (sin LLM, $0, no forma parte del plan en caché) cada vez que una ejecución entra en una ruta coincidente — así una espera de hidratación/carga se define una vez por ruta en lugar de repetirse como una pista en cada escenario. Cierra la carrera en tiempo de carga donde un elemento está presente pero sus manejadores aún no están adjuntos (algo que la espera por elemento de Playwright no puede ver). Best-effort: una señal que nunca aparece dentro del timeout registra una advertencia y continúa (nunca hace fallar de forma dura la suite).
- **`suite.setup` / `suite.teardown`** son comando(s) de shell que se ejecutan **una vez** alrededor de un `run --all` — el setup antes del primer escenario, el teardown después del último (siempre, incluso si falla) — para fixtures de toda la suite (sembrar/resetear una base de datos compartida, arrancar un stub). El `setup`/`teardown` por escenario (en el JSON del escenario) siguen gestionando el estado por prueba. Un `suite.setup` que falla aborta la suite antes de que se ejecute cualquier escenario; un `suite.teardown` que falla es una advertencia.
- **`forbid`** es una lista de bloqueo de seguridad — un guardarraíl de CI contra efectos secundarios irreversibles. Si alguna acción del plan apunta a un **selector** prohibido (coincidencia de subcadena, p. ej. `#change-password`) o la ejecución alcanza una **URL** prohibida (glob de ruta, p. ej. `**/account/password`), la ejecución **aborta** con un fallo `forbidden` en lugar de realizarla. Tú declaras la lista de peligros (el motor nunca la infiere), así que aunque un replan derive hacia "Cambiar contraseña", se detiene antes del clic. Un fallo `forbidden` nunca invalida la caché ni replanifica, por lo que no necesita clave de LLM.
- **`resolve`** declara valores dinámicos obtenidos en tiempo de ejecución (un código OTP, una URL de magic-link) — lo que desbloquea el inicio de sesión con OTP/magic-link/sin contraseña. Un plan referencia uno vía `value_ref: "<name>"` (un fill) o `url_ref: "<name>"` (un goto); Windup obtiene el **`source`** (`cmd` stdout de shell, `http` fetch, o `fn` un módulo del proyecto), extrae el valor con **`extract`** (un grupo de captura `regex` o una ruta de puntos `json`) y hace **`poll`** hasta que aparece (30 s por defecto). El **source lo declara el autor, nunca lo genera el LLM** (sin vector de ejecución de código desde el modelo), y el valor resuelto es **efímero** — se usa para el fill/goto y nunca se escribe en la caché, el informe ni los logs.
- **`network`** hace stub de peticiones HTTP de forma determinista — una lista de reglas cotejadas contra la URL de la petición (una **substring** o un **glob**) más un `method` opcional, **gana la primera coincidencia**. Responde con `status` (por defecto 200) + `body`/`json` (un cuerpo `json` fija el `content-type` automáticamente) + `headers`/`contentType` opcionales, o `abort: true` para descartar la petición (un error de red simulado). Permite que un escenario alcance un estado difícil de sembrar — un 500, una lista vacía, una llamada de terceros que falla — sin tocar el backend. Declarado por el autor, aplicado en cada run y **nunca parte del plan cacheado**.
- **`clock`** fija la hora de la página. `now` (una cadena ISO o epoch ms) congela `Date`/`Date.now()` en un instante fijo — inyectado antes de cualquier script de la página, así que `new Date()` en la app lo devuelve — para escenarios que si no derivarían ("pedidos de hoy", una cuenta regresiva). `timezone` (un nombre IANA) fija la zona del navegador de forma nativa. Congelado, no avanza; aplicado en cada run, nunca cacheado.
- **`failOn`** convierte señales de salud en runtime en fallas. `consoleErrors: true` falla un escenario que registró un error de consola o lanzó una excepción no capturada; `http5xx: true` falla uno cuya página recibió un 5xx. `ignore` es una lista de substrings de URL/texto para silenciar ruido conocido (analytics, un 500 de terceros que no controlas). Las peticiones respondidas por `config.network` siempre se excluyen — un stub deliberado no es una falla real. Las banderas `--fail-on-console` / `--fail-on-5xx` las fuerzan para un run; en cualquier caso las señales se registran y se muestran en los reportes.
- **`device`** emula un preset de dispositivo de Playwright (un nombre como `"iPhone 14"`, `"Pixel 7"`, `"iPad Pro 11"`) en cada run — viewport, user-agent, escala, mobile/touch. También `--device <name>` (gana sobre config). Los planes cacheados se **keyean por dispositivo**, así mobile y desktop mantienen trayectorias separadas (correr el mismo escenario en dos viewports no pisa un plan); sin dispositivo, el cache no cambia. La emulación mobile necesita chromium; un preset desconocido falla rápido con una pista.
- **`budgets`** define umbrales de performance en la página final — `ttfb_ms`, `fcp_ms`, `lcp_ms`, `dcl_ms`, `load_ms` (milisegundos) y `cls` (sin unidad). Cualquier exceso falla el escenario (kind `budget`). Definir cualquier budget activa la captura de web-vitals; `--web-vitals` captura y reporta sin poner gate. Los números de performance son ruidosos, así que define budgets con holgura (atrapan regresiones, no micro-jitter).
- **`resolveFields`** vincula un campo a un resolver de forma determinista — recomendado para CI. Indexado por una **substring de selector** (`{ "[name=otp]": "otp_code" }`), cualquier fill en un campo coincidente se rellena desde ese resolver, **sobrescribiendo lo que sea que el plan haya puesto ahí**. Así el flujo de OTP ya no depende de que el planificador recuerde emitir `value_ref` — incluso si rellena un literal o un nombre con distinta capitalización, Windup aún resuelve el campo (nombres como `OTP_CODE` / `otp-code` se normalizan a un `otp_code` declarado).
- **Asistencia LLM** (capa 3 de scan) lee archivos que las capas estáticas no pudieron resolver (rutas construidas dinámicamente, componentes indirectos), limitada por `maxCalls`. Los resultados se recuerdan por hash de archivo — los archivos sin cambios nunca vuelven a costar. Los costes se registran en el libro mayor y se muestran con `windup costs`.

## Qué vive dónde

| Ruta | Contenido | ¿Versionar? |
|---|---|---|
| `windup.config.ts` | Configuración | ✅ |
| `e2e/scenarios/*.json` | Tus pruebas, en lenguaje natural | ✅ |
| `e2e/fragments/*.json` | Bloques reutilizables curados | ✅ |
| `windup.credentials.json` | Mapeo cuenta → nombre ENV (sin valores) | ✅ |
| `.env.local` | Valores de credenciales | ❌ (auto-gitignored; CI usa secretos con los mismos nombres) |
| `.windup/` | Estado derivado: caché de planes, libro mayor de ejecuciones, mapa del sitio, informes | ❌ (init lo añade a `.gitignore`) |
