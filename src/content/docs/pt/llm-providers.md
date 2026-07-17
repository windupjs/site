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

Se você já paga um plano Claude (Pro/Max), pode planejar com ele em vez de comprar tokens de API. O Windup fala com o [claude-code-openai-wrapper](https://github.com/RichardAtCT/claude-code-openai-wrapper) — um servidor **de terceiros** que você roda localmente e que dá uma fachada compatível com OpenAI à sua própria sessão do Claude Code.

> **Opt-in e mantido pela comunidade.** O wrapper não é feito nem suportado pelo Windup nem pela Anthropic; ele dirige o Claude Code CLI e pode quebrar quando qualquer uma das pontas muda. Para trabalho sensível a confiabilidade (CI, suítes compartilhadas), prefira `--llm google` ou `--llm openai`. Replays em cache nunca chamam nenhum LLM, então um plano gerado assim continua replayando a $0 sem nada rodando.

### Primeira configuração

**1. Conecte o Claude Code CLI à sua assinatura** (uma vez). O wrapper autentica *como você*, através do Claude Code CLI — então o CLI precisa estar logado com o seu plano Claude. O **app desktop e o CLI logam separado**; ter o app desktop não basta.

```bash
# Instale o CLI se não tiver:
npm install -g @anthropic-ai/claude-code
# Faça login com seu plano Claude Pro/Max (escolha "assinatura", não uma chave de API):
claude
#   → rode /login dentro do CLI e siga o fluxo no navegador
# Já está logado? Se `claude` inicia uma sessão sem pedir login, você está conectado.
```

**2. Instale e suba o wrapper** (um projeto Python separado — precisa de Python 3.11+ e [Poetry](https://python-poetry.org)):

```bash
git clone https://github.com/RichardAtCT/claude-code-openai-wrapper
cd claude-code-openai-wrapper
poetry install
cp .env.example .env          # os padrões servem; não precisa de ANTHROPIC_API_KEY com auth por assinatura
poetry run uvicorn src.main:app --port 8000
```

**3. Verifique se está no ar** (outro terminal):

```bash
curl http://localhost:8000/health     # → {"status":"healthy",...}
curl http://localhost:8000/v1/models  # → claude-sonnet-4-6, claude-opus-4-6, ...
```

**4. Aponte o Windup para ele** e planeje:

```bash
npx windup run checkout --llm claude-code                 # modelo padrão: claude-sonnet-4-6
npx windup run checkout --llm claude-code:claude-opus-4-6
WINDUP_LLM=claude-code npx windup run --all               # via variável de ambiente
```

Opcionalmente fixe no config para que `windup run` puro já use:

```ts
// windup.config.ts
llm: {
  provider: "claude-code",
  model: "claude-sonnet-4-6",
  providers: {
    "claude-code": { baseUrl: "http://localhost:8000/v1" },  // mude só se o wrapper não estiver na :8000
  },
},
```

### Observações e trade-offs

- **Não precisa de chave de API.** A auth de cliente do próprio wrapper vem desligada; defina `CLAUDE_CODE_API_KEY` só se você a habilitou. Mova o endpoint com `baseUrl` (config) ou `WINDUP_CLAUDE_CODE_URL` (env).
- **O custo aparece como $0** no `windup costs` — os tokens são reais e ficam no ledger, mas são cobertos pela sua assinatura, então o Windup não inventa um preço por token para eles.
- **Se o wrapper não estiver rodando**, `windup run --llm claude-code` falha na hora com uma mensagem nomeando a URL (não trava em retries). Suba o wrapper e rode de novo.
- **Por baixo dos panos**: o wrapper implementa só `model`/`messages`/`stream`, então o Windup carrega o schema do plano no prompt e desembrulha a resposta mecanicamente (o Ajv ainda valida todo plano), e `temperature`/`seed` não são enviados. Sem um `ANTHROPIC_API_KEY` no lado do wrapper, a lista de modelos dele é estática, indo até `claude-sonnet-4-6` / `claude-opus-4-6`.
