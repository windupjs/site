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

## Planejar com sua assinatura do Claude (`--llm claude-code`)

Se você já paga um plano Claude (Pro/Max), pode planejar com ele em vez de comprar tokens de API — o Windup dirige o **`claude` CLI que você já tem**, sem chave de API, sem servidor extra.

> **Opt-in, nunca default.** Usar uma assinatura para planejar programaticamente é uma zona cinzenta não endossada pela Anthropic, e o Windup não a opera. Para trabalho sensível a confiabilidade (CI, suítes compartilhadas), prefira `--llm google` ou `--llm openai`. Replays em cache nunca chamam nenhum LLM, então um plano feito assim continua replayando a $0 sem nada rodando.

### Configuração — conecte o CLI uma vez

O único pré-requisito é o Claude Code CLI, logado com o seu plano. O **app desktop e o CLI logam separado**; ter o app desktop não basta.

```bash
# Instale o CLI se não tiver:
npm install -g @anthropic-ai/claude-code
# Faça login com seu plano Claude Pro/Max (abre o navegador; escolha "assinatura", não uma chave de API):
claude
#   → rode /login dentro do CLI e siga o fluxo no navegador
# Já está logado? Se `claude` inicia uma sessão sem pedir login, você está conectado.
```

É só isso — sem wrapper, sem Python, sem servidor local. O Windup faz `spawn` do `claude` em modo não-interativo a cada plano (a partir de um diretório temporário isolado, então nunca pega o `CLAUDE.md` de um projeto).

```bash
npx windup run checkout --llm claude-code                 # modelo padrão: claude-sonnet-4-6
npx windup run checkout --llm claude-code:claude-opus-4-6
WINDUP_LLM=claude-code npx windup run --all               # via variável de ambiente
```

Opcionalmente fixe no config para que `windup run` puro já use:

```ts
// windup.config.ts
llm: { provider: "claude-code", model: "claude-sonnet-4-6" },
```

- **O custo aparece como $0** no `windup costs` — os tokens são reais e ficam no ledger, mas são cobertos pela sua assinatura, então o Windup não inventa um preço por token para eles.
- **Se o `claude` não estiver instalado ou logado**, a execução falha na hora com uma mensagem acionável (instalar / `/login`), não um stack trace.
- **Mais lento para planejar** que uma API hospedada (cada plano sobe o agente do CLI — ~8–12s vs ~2–4s), mas o planejamento acontece uma vez e é cacheado; replays são $0 e instantâneos de qualquer forma.
- **Por baixo dos panos**: não há JSON mode, então o Windup carrega o schema do plano no prompt e desembrulha a resposta mecanicamente (o Ajv ainda valida todo plano); `temperature`/`seed` não têm equivalente no CLI e não são enviados.

### Alternativa: rotear pelo claude-code-openai-wrapper (HTTP)

Em vez do CLI, você pode apontar o Windup para o [claude-code-openai-wrapper](https://github.com/RichardAtCT/claude-code-openai-wrapper) — um proxy local **de terceiros**, mantido pela comunidade, que expõe um endpoint compatível com OpenAI sobre a sua sessão do Claude Code. Útil se você já o roda, quer uma fronteira HTTP, ou alcança o Claude via Bedrock/Vertex por trás dele. O Windup usa o wrapper (em vez de fazer `spawn` do CLI) **sempre que uma URL estiver configurada**:

```bash
# suba o wrapper (precisa de Python 3.11+ e Poetry), depois:
WINDUP_CLAUDE_CODE_URL=http://localhost:8000/v1 npx windup run checkout --llm claude-code
```

```ts
// windup.config.ts — mesmo efeito, persistido
llm: { provider: "claude-code", providers: { "claude-code": { baseUrl: "http://localhost:8000/v1" } } },
```

A auth de cliente dele vem desligada; defina `CLAUDE_CODE_API_KEY` só se você a habilitou. Mesmo custo $0, mesmo un-fence. Um wrapper fora do ar falha na hora com uma mensagem nomeando a URL.
