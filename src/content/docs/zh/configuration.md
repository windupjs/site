---
title: 配置
description: windup.config.ts 参考 —— base URL、LLM 提供商、扫描设置，以及把团队知识注入规划器的项目清单。
---

# 配置（`windup.config.ts`）

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
});
```

- **`context.credentials`** 把账户名映射到 ENV 引用。当任务提到该账户时，计划使用 `value_ref` —— 即便页面显示了值，清单中的凭据也优先，并且禁止规划器凭空捏造 ENV 名称。
- **LLM 辅助**（扫描的第 3 层）会读取静态层无法解析的文件（动态构建的路由、间接组件），并受 `maxCalls` 限额约束。结果按文件哈希记忆 —— 未变更的文件不会再次产生费用。费用记录在账本中，并由 `windup costs` 展示。

## 各文件归属

| 路径 | 内容 | 提交？ |
|---|---|---|
| `windup.config.ts` | 配置 | ✅ |
| `e2e/scenarios/*.json` | 你的测试，以自然语言编写 | ✅ |
| `e2e/fragments/*.json` | 精选的可复用块 | ✅ |
| `windup.credentials.json` | 账户 → ENV 名称映射（无值） | ✅ |
| `.env.local` | 凭据值 | ❌（自动加入 gitignore；CI 用同名密钥） |
| `.windup/` | 派生状态：计划缓存、运行账本、站点地图、报告 | ❌（init 会把它加入 `.gitignore`） |
