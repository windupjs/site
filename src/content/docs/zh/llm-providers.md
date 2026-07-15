---
title: LLM 提供商
description: 规划器与提供商无关。同时配置 Google Gemini 和 OpenAI，按次运行选择其一 —— 切换从不使计划缓存失效。
---

# LLM 提供商

规划器与提供商无关。支持 Google Gemini 和 OpenAI；可同时配置多个，并按次运行选择其一：

```ts
// windup.config.ts
llm: {
  provider: "google",                       // default for runs without --llm
  model: "gemini-3.1-flash-lite",
  providers: {
    openai: { model: "gpt-5-mini" },        // default model when --llm openai is used
    // openai: { apiKeyEnv: "MY_OPENAI_KEY", baseUrl: "https://my-proxy/v1" },
  },
},
```

```bash
npx windup run checkout                         # config default (google)
npx windup run checkout --llm openai            # provider default model (gpt-5-mini)
npx windup run checkout --llm openai:gpt-5-nano # explicit provider:model
WINDUP_LLM=openai:gpt-5-mini npx windup run --all   # same thing via env (CI)
```

- `--llm` 适用于 `run`、`bench`（在同一场景上对比多个提供商）和 `scan`（LLM 辅助层）。
- API 密钥：默认为 `GOOGLE_GENERATIVE_AI_API_KEY` / `OPENAI_API_KEY`；用 `apiKeyEnv` 覆盖环境变量名。
- `baseUrl`（仅 OpenAI）指向任何兼容 OpenAI 的端点 —— Azure、代理，或本地模型服务器。
- 切换提供商从不使计划缓存失效：计划是数据，无论由谁规划，回放都无需 LLM。
- `windup costs` **按提供商和按模型**拆分花费，因此在多个 LLM 之间轮换时，各厂商的花费始终一目了然。
