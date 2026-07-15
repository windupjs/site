---
title: Proveedores de LLM
description: El planificador es agnóstico al proveedor. Configura Google Gemini y OpenAI a la vez y elige uno por ejecución — cambiar nunca invalida la caché de planes.
---

# Proveedores de LLM

El planificador es agnóstico al proveedor. Se admiten Google Gemini y OpenAI; configura varios a la vez y elige uno por ejecución:

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

- `--llm` funciona en `run`, `bench` (compara proveedores en el mismo escenario) y `scan` (capa de asistencia LLM).
- Claves de API: `GOOGLE_GENERATIVE_AI_API_KEY` / `OPENAI_API_KEY` por defecto; sobrescribe el nombre de la variable de entorno con `apiKeyEnv`.
- `baseUrl` (solo OpenAI) apunta a cualquier endpoint compatible con OpenAI — Azure, un proxy o un servidor de modelo local.
- Cambiar de proveedor nunca invalida la caché de planes: los planes son datos, los replays no usan LLM sin importar quién planificó.
- `windup costs` desglosa el gasto **por proveedor y por modelo**, de modo que alternar entre LLMs mantiene visible el gasto por proveedor.
