---
title: 编程式 API
description: 用编程式 API 从代码中运行场景，或通过兼容 jest 的适配器把 Windup 接入 vitest。
---

# 编程式 API 与测试运行器

从代码中运行一个场景，并拿回运行指标：

```ts
import { run } from "windupjs";
const result = await run("checkout");   // RunMetrics: result, llm_calls, cost, per-action timing
```

接入 **vitest**（兼容 jest 的契约）—— 每个场景一个原生测试，共享预热的引擎：

```ts
// e2e/windup.test.ts — vitest
import { windupSuite } from "windupjs/vitest";
await windupSuite();                    // one native test per scenario
```
