---
title: Ambientes
description: Rode os mesmos cenários em dev, staging e CI. O cache de planos é portável entre ambientes — indexado pelo caminho da URL, não pelo host.
---

# Ambientes (dev / staging / CI)

A origem da URL inicial vem de, em ordem de precedência:

1. flag `--base-url`
2. env `WINDUP_BASE_URL`
3. `baseUrl` em `windup.config.ts`
4. um `start_url` absoluto no cenário

Um override explícito rebaseia até URLs de cenário absolutas (caminho e query são preservados).

O cache de planos é **portável entre ambientes**: a identidade do cache usa o *caminho* da URL inicial, não host/porta. Um plano gerado contra `localhost:8080` faz replay em staging ou CI com zero chamadas ao LLM.

```bash
npx windup run checkout --base-url https://staging.example.com
WINDUP_BASE_URL=http://localhost:8080 npx windup run --all
```
