---
title: Arquitectura y especificación
description: La especificación viva — tesis, principios, límites de módulos, formatos de datos y la postura de coste y seguridad detrás del replay determinista de Windup.
---

# Arquitectura y especificación

Una vista condensada de la [especificación viva](https://github.com/windupjs/windup/blob/main/docs/specs/SPEC.md). Describe el sistema tal como se entrega.

## Tesis

Las pruebas E2E de navegador pueden usar un LLM **solo para planificar** (y replanificar ante fallos), con ejecución determinista y verificación barata — de modo que las ejecuciones repetidas hacen **cero llamadas al LLM**. Validado de extremo a extremo: la primera ejecución planifica en segundos por fracciones de céntimo; los replays tardan ~0.5–1s y cuestan $0.

## Principios

1. **El LLM es la excepción, no la regla.** Una llamada por miss de caché; los replays nunca lo llaman.
2. **Cero conocimiento del sitio incrustado.** El motor puede conocer *frameworks* (Next.js, react-router, nomenclatura de design systems) y la plataforma web — nunca un sitio específico. Todo el conocimiento del sitio llega como entrada o se descubre en tiempo de ejecución.
3. **Cada ejecución es también recolección.** El ejecutor ya visita cada página de un flujo; persistir lo que ve cuesta ~un `evaluate` por acción.
4. **El conocimiento es caché, no verdad.** Cualquier cosa que el mapa del sitio o el scan estático afirme puede estar obsoleta; degrada a descubrimiento en tiempo de ejecución. Precedencia: `execution > static > llm`.
5. **El coste nunca sorprende.** Cada punto de contacto con el LLM tiene un tope explícito; cada llamada se registra en un libro mayor; el trabajo estático/de asistencia repetido se memoiza.
6. **Los planes son datos, no programas.** Sin condicionales, sin bucles, sin código libre. Si un flujo necesita bifurcación, divide el escenario.

## Arquitectura

```
scenario (natural language, versioned)
    │
    ▼
┌─ runner ─────────────────────────┐
│ cache lookup (path-keyed)         │
│   miss → planner (LLM, 1 call)    │
│   hit  → cached plan (rebased)    │
│   → executor (deterministic)      │
│   → verifier (postconditions)     │─▶ fail → invalidate → re-plan
│   → cache save + run ledger       │
└───────────────────────────────────┘

site map (graph) ◀── windup scan (static + LLM-assist)
                 ◀── passive collection (every run)
```

Límites de módulos (todos en `packages/windup/src/`):

| Módulo | Responsabilidad |
|---|---|
| `browser.ts` | Frontera única del motor (Playwright). `BrowserContext` fresco por sesión sobre un singleton perezoso de Chromium; clics confiables con actionability nativa; `ariaSnapshot()` alimenta al planificador. Apunta a la primera coincidencia *visible*, no a la primera del DOM. |
| `llm.ts` | Frontera del LLM multiproveedor. Una interfaz `LlmClient`; implementaciones de Google Gemini (SDK) y OpenAI (REST puro). Varios proveedores configurables a la vez; seleccionados por ejecución. Cambiar de proveedor nunca toca la caché de planes. |
| `planner.ts` | Lógica de planificación (agnóstica al proveedor). Prompt = tarea + árbol de accesibilidad de la página + elementos reales + porción del mapa del sitio + catálogo de fragmentos + manifiesto + hints. Salida estructurada; dos niveles de reintento (semántico + transitorio); salida saneada y luego validada (Ajv es la autoridad). |
| `executor.ts` | Bucle determinista: goto → por acción (comprobar visibilidad → actuar → verificar). Emite observaciones pasivas del mapa del sitio. |
| `verifier.ts` | Postcondiciones, todas sin LLM: elemento visible, glob de URL, valor de input. Polling con esperas seguras entre frames. |
| `cache.ts` | Caché de trayectorias indexada por `scenario_id` + **ruta** de la URL de inicio (portable entre entornos). Guardada solo tras una ejecución completa verificada; un replay fallido invalida y replanifica, conservando la entrada obsoleta como evidencia. |
| `signature.ts` | Identidad estructural de la página: SHA-256 de los elementos interactivos normalizados — sin texto, sin datos — para que el ruido del entorno no divida identidades. |
| `sitemap.ts` | Grafo de páginas/transiciones. Los nodos llevan `source: execution\|static\|llm` con obsolescencia y procedencia. Porción del prompt: BFS (profundidad ≤ 3), puntuado por términos, dentro de un presupuesto de caracteres. |
| `scan/` | Indexación del proyecto. Capa 1: rutas por convención (Next.js, react-router, TanStack Router). Capa 2: elementos interactivos mediante parsing de JSX consciente de llaves (etiquetas crudas + componentes de design system). Capa 3: asistencia LLM con tope, memoizada por hash de archivo. |
| `fragments.ts` | Sub-trayectorias reutilizables y probadas, versionadas en `e2e/fragments/`. Los planes las referencian por id; la caché almacena la referencia (las actualizaciones se propagan). |
| `authoring.ts` | `windup new` — el LLM reescribe una instrucción imprecisa en un escenario preciso anclado en el mapa del sitio y el manifiesto; credenciales autorregistradas y depuradas; la salida es un archivo versionado para revisión. |
| `metrics.ts` / `costs.ts` | Cada ejecución escribe un registro en el libro mayor (tokens, llamadas, modelo, timing, clase de fallo). Los precios son una tabla por modelo con fecha; `windup costs` recalcula para que el historial siga siendo correcto. |
| `summary.ts` / `suggest.ts` | Informe de IA posterior a la ejecución y sugerencia de corrección posterior al fallo, opcionales — una llamada extra al LLM cada uno, rastreados por separado, sin afectar nunca el resultado de la ejecución. |
| `reporters.ts` | Informes JUnit XML, JSON y HTML autocontenido; salida distinta de cero ante fallo. |
| `secrets.ts` | Credenciales sin secretos versionados: valores en `.env.local`, mapeo cuenta → nombre ENV versionado; los planes llevan solo `value_ref`, resuelto en tiempo de ejecución. |

## Formatos de datos

**Plan de acciones** (`plan_version: "0.1"`): `{ plan_version, scenario_id, task, start_url, generated_by, actions[] }`. Una acción es `{ id, type: goto|click|fill|wait_for|use, target?, value? | value_ref?, url?, use?, expect?, timeout_ms }`. Reglas semánticas: click/fill/wait_for requieren `target.selector`; fill requiere exactamente uno de value/value_ref; `value_ref` debe estar mencionado por tarea/hints/manifiesto (sin nombres ENV inventados); la acción final debe llevar `expect` (o ser un `use`).

**Entrada de caché** (`cache_version: "0.2"`): `{ key: {scenario_id, start_url(path), start_sig?}, plan, status: active|stale, stats }`.

**Mapa del sitio** (`map_version: "0.1"`): `{ last_scan_sha, pages, transitions, assist_seen }`.

## Postura de modelo y coste

Modelo planificador por defecto: **`gemini-3.1-flash-lite`** (medido: 1 llamada limpia/generación, ~3–4s, ≈ $0.0025/generación). Agnóstico al proveedor: Google Gemini y OpenAI vienen incluidos tras la frontera `llm.ts`. Cada registro del libro mayor lleva proveedor+modelo; los precios son una tabla plana por modelo. Añadir un proveedor = una implementación de cliente.

## Postura de seguridad

El contenido de la página capturado de la app bajo prueba se pasa al LLM **delimitado y marcado como datos no confiables**, con una instrucción explícita de tratarlo como datos, nunca como instrucciones. Como los planes son datos validados por esquema y ejecutados de forma determinista, una página no puede hacer que Windup ejecute código arbitrario. Los valores de credenciales nunca entran en escenarios, planes, la caché ni prompts del LLM. Modelo de amenazas completo: [SECURITY.md](https://github.com/windupjs/windup/blob/main/SECURITY.md).

## Limitaciones conocidas

- Las rutas relativas anidadas de react-router se recolectan del mejor modo posible (corregidas por las observaciones de ejecución).
- El scan es consciente de un solo paquete; los monorepos se detectan y advierten, los índices por app son trabajo futuro.
- No hay demonio entre invocaciones de la CLI (deliberado); el pool caliente es por proceso.
- La autodetección de fragmentos no está construida; la extracción es manual.

## Verificación

- `npm test` (packages/windup): ~97 pruebas unitarias/de integración, herméticas al LLM. CI las ejecuta con Chromium real en Ubuntu.
- `windup bench <scenario>`: el protocolo de validación — 5 generaciones (≥ 4/5 válidas), 10 replays (10/10 con `llm_calls=0`), replay ≥ 5× más rápido, replay a $0, recuperación al romper un selector.
- Dogfood en proyecto real: una app de react-router con 106 rutas — los planes se reproducen a ~0.5s/$0, caché portable entre entornos.
