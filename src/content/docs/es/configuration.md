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
});
```

- **`context.credentials`** mapea nombres de cuenta a referencias ENV. Cuando una tarea menciona la cuenta, el plan usa `value_ref` — las credenciales del manifiesto tienen precedencia aunque la página muestre valores, y al planificador se le prohíbe inventar nombres ENV.
- **`readySignals`** mapea un glob de ruta al/los selector(es) CSS que deben estar **visibles antes de que el ejecutor lance la primera acción** en una página coincidente. Se aplica de forma determinista en tiempo de ejecución (sin LLM, $0, no forma parte del plan en caché) cada vez que una ejecución entra en una ruta coincidente — así una espera de hidratación/carga se define una vez por ruta en lugar de repetirse como una pista en cada escenario. Cierra la carrera en tiempo de carga donde un elemento está presente pero sus manejadores aún no están adjuntos (algo que la espera por elemento de Playwright no puede ver). Best-effort: una señal que nunca aparece dentro del timeout registra una advertencia y continúa (nunca hace fallar de forma dura la suite).
- **`suite.setup` / `suite.teardown`** son comando(s) de shell que se ejecutan **una vez** alrededor de un `run --all` — el setup antes del primer escenario, el teardown después del último (siempre, incluso si falla) — para fixtures de toda la suite (sembrar/resetear una base de datos compartida, arrancar un stub). El `setup`/`teardown` por escenario (en el JSON del escenario) siguen gestionando el estado por prueba. Un `suite.setup` que falla aborta la suite antes de que se ejecute cualquier escenario; un `suite.teardown` que falla es una advertencia.
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
