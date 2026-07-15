---
title: API programática
description: Rode cenários a partir de código com a API programática, ou integre o Windup ao vitest com o adaptador compatível com jest.
---

# API programática e test runners

Rode um cenário a partir de código e receba de volta as métricas da execução:

```ts
import { run } from "windupjs";
const result = await run("checkout");   // RunMetrics: result, llm_calls, cost, per-action timing
```

Integre ao **vitest** (contrato compatível com jest) — um teste nativo por cenário, compartilhando o motor aquecido:

```ts
// e2e/windup.test.ts — vitest
import { windupSuite } from "windupjs/vitest";
await windupSuite();                    // one native test per scenario
```
