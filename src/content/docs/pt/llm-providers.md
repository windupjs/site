---
title: Provedores de LLM
description: O planejador é agnóstico de provedor. Configure Google Gemini e OpenAI ao mesmo tempo e escolha um por execução — trocar nunca invalida o cache de planos.
---

# Provedores de LLM

O planejador é agnóstico de provedor. Google Gemini e OpenAI são suportados; configure vários ao mesmo tempo e escolha um por execução:

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

- `--llm` funciona em `run`, `bench` (compara provedores no mesmo cenário) e `scan` (camada de LLM-assist).
- Chaves de API: `GOOGLE_GENERATIVE_AI_API_KEY` / `OPENAI_API_KEY` por padrão; sobrescreva o nome da variável de ambiente com `apiKeyEnv`.
- `baseUrl` (apenas OpenAI) aponta para qualquer endpoint compatível com OpenAI — Azure, um proxy ou um servidor de modelo local.
- Trocar de provedor nunca invalida o cache de planos: planos são dados, replays são livres de LLM independentemente de quem planejou.
- `windup costs` detalha o gasto **por provedor e por modelo**, então alternar entre LLMs mantém o gasto por fornecedor visível.
