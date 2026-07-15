---
title: API programática
description: Ejecuta escenarios desde código con la API programática, o integra Windup en vitest con el adaptador compatible con jest.
---

# API programática y runners de pruebas

Ejecuta un escenario desde código y recibe de vuelta las métricas de la ejecución:

```ts
import { run } from "windupjs";
const result = await run("checkout");   // RunMetrics: result, llm_calls, cost, per-action timing
```

Intégralo en **vitest** (contrato compatible con jest) — una prueba nativa por escenario, compartiendo el motor caliente:

```ts
// e2e/windup.test.ts — vitest
import { windupSuite } from "windupjs/vitest";
await windupSuite();                    // one native test per scenario
```
