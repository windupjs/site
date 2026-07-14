---
title: LLM providers
description: The planner is provider-agnostic. Configure Google Gemini and OpenAI at once and pick one per run — switching never invalidates the plan cache.
---

# LLM providers

The planner is provider-agnostic. Google Gemini and OpenAI are supported; configure several at once and pick one per run:

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

- `--llm` works on `run`, `bench` (compare providers on the same scenario) and `scan` (LLM-assist layer).
- API keys: `GOOGLE_GENERATIVE_AI_API_KEY` / `OPENAI_API_KEY` by default; override the env-var name with `apiKeyEnv`.
- `baseUrl` (OpenAI only) points at any OpenAI-compatible endpoint — Azure, a proxy, or a local model server.
- Switching providers never invalidates the plan cache: plans are data, replays are LLM-free regardless of who planned them.
- `windup costs` breaks spend down **by provider and by model**, so alternating between LLMs keeps per-vendor spend visible.
