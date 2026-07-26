---
title: Cómo funciona
description: El LLM planifica un escenario una vez en JSON validado por esquema; un ejecutor determinista lo reproduce con cero llamadas al LLM y verificación barata de DOM.
---

# Cómo funciona

```
natural-language task ──▶ planner (LLM, 1 call) ──▶ JSON action plan
                                                        │
       trajectory cache ◀── cheap verification ◀── deterministic executor
             │
             └──▶ subsequent runs: zero LLM, ~1s, $0
```

La parte cara — averiguar las acciones del navegador — ocurre una sola vez y se convierte en datos verificables guardados en caché.

- **Los planes son datos, no código** — JSON validado por esquema; sin scripts generados, sin condicionales.
- **Verificación barata** — postcondiciones de DOM/URL después de cada acción. Una verificación fallida invalida el plan en caché y dispara una replanificación automática.
- **Mapa del sitio** — cada ejecución alimenta un grafo de páginas y transiciones; `windup scan` siembra ese grafo directamente desde tu código fuente antes de la primera ejecución, de modo que el planificador usa los selectores *reales* de tu app en lugar de adivinar.
- **Fragmentos** — bloques de acciones probados (p. ej. login) que el planificador compone mediante `{ "type": "use" }` en vez de regenerarlos.
- **Cero conocimiento del sitio incrustado** — el motor conoce frameworks y la web, nunca *tu* sitio. Todo el conocimiento del sitio llega como entrada (escenarios, config, manifiesto) o se descubre en tiempo de ejecución.

## Por qué Windup

Los scripts escritos a mano son baratos de ejecutar pero caros de mantener. Los agentes de IA por ejecución son fáciles de escribir pero lentos y no deterministas. Windup toma la mitad buena de cada uno.

|  | Scripts escritos a mano | Agente de IA por ejecución | **Windup** |
|---|---|---|---|
| Autoría | código + selectores a mano | lenguaje natural | lenguaje natural |
| Coste por ejecución | $0 | LLM en **cada** ejecución | LLM solo en la **primera** ejecución |
| Velocidad de ejecución | rápido | lento (modelo en el bucle) | ~1s replay |
| Determinismo | alto | bajo — improvisa cada vez | alto — el mismo plan en cada replay |
| La app cambió | arreglas el script | puede hacer algo distinto en silencio | la verificación falla → replanifica automáticamente |

**Lo que la caché te ahorra es `$0`, no "instantáneo".** Un acierto de caché omite la *planificación* del LLM (`plan=0ms`, `llm_calls=0`) — pero las acciones de Playwright del plan igualmente se ejecutan, y cualquier cadena [`depends_on`](/scenarios/) igualmente corre, así que el tiempo real es tiempo de navegador real, no una consulta. Cada ejecución reporta el desglose — `total=… (plan=… deps=… exec=… setup=…)` — donde `deps` es la cadena de dependencias, `exec` son las acciones de este escenario y `setup` es el contexto del navegador. El informe HTML divide la duración de cada escenario en una barra que reconcilia (`setup · deps · plan · nav · actions`), donde **`nav`** es el goto + la carga/hidratación de la página *antes* de la primera acción — normalmente el verdadero sumidero de tiempo en una SPA (así que una acción de 113 ms que aparece como "3.6 s" en realidad es setup + nav). Windup avanza en cuanto la página renderiza elementos interactivos *o* la red queda inactiva, así que una página de solo visualización no se queda esperando el timeout de readiness. La cabecera de la suite muestra el **tiempo real de ejecución** (wall-clock, tiempo transcurrido real), no la suma de los totales por escenario, que se infla ~N× con `--concurrency N`. Bajo concurrencia, el remanente por escenario se etiqueta como **`contention`** (el tiempo que el escenario pasó *esperando* un slot de CPU/navegador mientras corrían sus hermanos — inactivo, no trabajo), y se muestra una cifra de **`active` ms** (su propio trabajo activo, ~estable con la concurrencia) para que los escenarios sigan siendo comparables. La mayor palanca son los **snapshots de sesión**: el estado de autenticación de una dependencia (`storageState`) se captura una vez y se restaura en replays posteriores, de modo que el flujo de inicio de sesión no se vuelve a ejecutar para cada dependiente (`deps≈0`).

Para la mecánica más profunda — límites de módulos, formatos de datos, postura de coste y seguridad — consulta [Arquitectura y especificación](/es/docs/architecture).
