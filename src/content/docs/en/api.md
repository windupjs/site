---
title: Programmatic API
description: Run scenarios from code with the programmatic API, or plug Windup into vitest with the jest-compatible adapter.
---

# Programmatic API & test runners

Run a scenario from code and get back run metrics:

```ts
import { run } from "windupjs";
const result = await run("checkout");   // RunMetrics: result, llm_calls, cost, per-action timing
```

Plug into **vitest** (jest-compatible contract) — one native test per scenario, sharing the warm engine:

```ts
// e2e/windup.test.ts — vitest
import { windupSuite } from "windupjs/vitest";
await windupSuite();                    // one native test per scenario
```
