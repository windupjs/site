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

Para la mecánica más profunda — límites de módulos, formatos de datos, postura de coste y seguridad — consulta [Arquitectura y especificación](/es/docs/architecture).
