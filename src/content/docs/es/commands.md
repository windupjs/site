---
title: Comandos
description: La referencia completa de la CLI de Windup — cada comando, los flags de run y los ayudantes opcionales de informe de IA (--summary) y sugerencia de corrección (--suggest).
---

# Comandos

| Comando | Descripción |
|---|---|
| `windup init` | Crea `windup.config.ts`, `.windup/` (gitignored) y un escenario de ejemplo |
| `windup new "<instruction>" [--id x] [--force] [--depends-on ids] [--validate]` | Genera un escenario a partir de una instrucción imprecisa; `--validate` lo ejecuta y refina hasta que pasa (≤3 intentos) |
| `windup run [scenario]` | Ejecuta un escenario (replay cuando está en caché, planifica ante un miss) |
| `windup run --all` | Ejecuta cada escenario — modo CI |
| `windup scan [--update] [--no-assist]` | Indexa estáticamente rutas y elementos interactivos en el mapa del sitio; `--update` reindexa solo los archivos cambiados desde el último scan (git diff); `--no-assist` omite la capa LLM (coste cero) |
| `windup costs [--last n] [--days n] [--json]` | Informe de uso de IA desde el libro mayor de ejecuciones: totales, replays gratuitos, desglose por proveedor, por modelo y por escenario, gasto de scan y de autoría |
| `windup status` | Páginas del mapa del sitio por fuente, obsolescencia, escenarios en caché, fragmentos |
| `windup fragment extract <scenario> <a1..aN> --id <id> --description <text>` | Promueve una porción de un plan en caché a un fragmento reutilizable |
| `windup secret set <account> [--user u] [--password p]` | Registra credenciales de prueba: valores → `.env.local`, mapeo → `windup.credentials.json` |
| `windup secret list` | Cuentas + si cada ENV está definida (nunca imprime valores) |
| `windup secret remove <account>` | Elimina una cuenta: quita el mapeo y sus valores de `.env.local` (alias: `rm`) |
| `windup sig <url> [--repeat n]` | Firma estructural de la página (diagnósticos) |
| `windup bench <scenario>` | Protocolo de validación completo (generación, determinismo del replay, recuperación ante fallos) |
| `windup cache clear` | Descarta la caché de trayectorias (las siguientes ejecuciones replanifican) |

### Flags de `run`

| Flag | Qué hace |
|---|---|
| `--all` | Ejecuta cada escenario del directorio — modo CI, un navegador caliente para toda la suite. Código de salida distinto de cero si algún escenario falla. |
| `--concurrency <n>` | Ejecuta hasta `n` escenarios en paralelo sobre un único navegador caliente compartido con contextos aislados — ~2× más rápido en una suite mixta. Secuencial por defecto. |
| `--no-cache` | Ignora el plan en caché y replanifica desde cero (fuerza una llamada al LLM), incluso cuando existe una trayectoria válida. Úsalo para regenerar un plan a propósito. |
| `--no-map` | Planifica sin el grafo del mapa del sitio — omite las rutas y selectores indexados. Útil para depurar el planificador o un entorno recién creado. |
| `--repeat <n>` | Ejecuta el escenario `n` veces seguidas sobre el mismo navegador caliente — comprobaciones de estabilidad y flakes. |
| `--headed` | Muestra la ventana del navegador en vez de ejecutar en modo headless. |
| `--slowmo <ms>` | Añade un retardo entre acciones para que puedas observar cada paso — ritmo de demo y depuración. |
| `--base-url <url>` | Sobrescribe el origen de la URL de inicio para esta ejecución (dev / staging / CI). Rebasa incluso las URLs absolutas del escenario, preservando ruta y query. |
| `--browser chromium\|firefox\|webkit` | Ejecuta en el motor elegido (Chromium por defecto). El mismo plan se reproduce en los tres — escribe una vez, ejecuta en todos. |
| `--llm <provider[:model]>` | Elige el LLM planificador para esta ejecución (p. ej. `openai:gpt-5-mini`). Solo afecta a la planificación; los replays en caché nunca llaman a un LLM. |
| `--summary` | Tras la ejecución, una llamada extra al LLM escribe un informe legible por humanos citando valores reales observados en la página final. Desactivado por defecto para que los replays sigan a $0. |
| `--suggest` | En una ejecución **fallida**, una llamada extra al LLM propone una corrección concreta para el escenario. Se dispara solo ante un fallo. |
| `--reporter junit\|json\|html` | Emite un informe de CI — JUnit XML, un resumen JSON legible por máquina o una página HTML autocontenida. |
| `--report-file <path>` | Escribe el informe en una ruta específica (por defecto `.windup/reports/`). |

## Informe de IA (`--summary`)

Para humanos que leen resultados (no CI), `--summary` añade una llamada al LLM después de cada ejecución que escribe un breve informe: qué hizo la prueba, el resultado, **valores concretos observados en la página final** (precios, mensajes, nombres de productos — citados literalmente desde la página) y cualquier dificultad (pasos lentos, replanificación, fallos). Se imprime en la terminal, queda en el libro mayor de ejecuciones y se muestra como un bloque destacado en los informes HTML/JSON.

```bash
npx windup run checkout --summary --reporter html
# summary: "The test logged in and completed checkout for 3 items; the
#  confirmation page showed 'Thank you for your order'. Prices observed: ..."
```

Desactivado por defecto a propósito — los replays en caché se mantienen en cero llamadas al LLM y $0. El coste del informe (~$0.0005 en el modelo por defecto) se rastrea por separado en las métricas de la ejecución y se incluye en `estimated_cost_usd`.

## Sugerencias de corrección ante fallos (`--suggest`)

Cuando una ejecución **falla**, `--suggest` añade una llamada al LLM que actúa como un ingeniero senior de QA depurándola: compara el plan ejecutado y el paso fallido contra la **página final real** y los selectores conocidos del mapa del sitio, y luego propone una corrección concreta para el escenario — el selector equivocado y el real, una pantalla objetivo que no contiene lo que la tarea espera, un paso faltante, o un timeout demasiado corto para una página lenta.

```bash
npx windup run create-invoice --suggest
# FAIL  create-invoice  ... element button:has-text('Save') not visible
#   suggested fix: The 'Save' button does not exist; the dialog's real button
#   is labeled 'Create'. Change the hint to button:has-text('Create').
```

Convierte una ejecución en rojo en una edición concreta — en vez de tener que hacer ingeniería inversa de la app a mano. Solo se dispara ante un fallo (las ejecuciones en verde no cuestan nada), nunca edita el escenario en sí, y se muestra como un bloque destacado en los informes HTML/JSON. Combina de forma natural con `--summary`.
