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
  // apiKeyEnv: "GEMINI_API_KEY",           // já tem a chave com outro nome? aponte para ela
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
- Chaves de API: `GOOGLE_GENERATIVE_AI_API_KEY` / `OPENAI_API_KEY` por padrão. Para reaproveitar uma chave que seu projeto já guarda com outro nome, aponte para ela com **`apiKeyEnv`** — seja no nível `llm` (`llm.apiKeyEnv: "GEMINI_API_KEY"`, que vale para o provedor que não tiver sobrescrita) ou por provedor (`llm.providers.openai.apiKeyEnv`, que tem prioridade). Não precisa duplicar o segredo. O `windup doctor` informa exatamente qual variável ele espera.
- Um **nome de modelo errado** é tratado como erro de configuração, não como falha de teste: o 404 do provedor vira uma mensagem acionável listando os modelos conhecidos, a execução falha com `kind: config` (nunca repetida por `--retries`) e o `windup doctor` avisa de antemão quando o modelo configurado não está na tabela de modelos conhecidos.
- `baseUrl` (apenas OpenAI) aponta para qualquer endpoint compatível com OpenAI — Azure, um proxy ou um servidor de modelo local.
- Trocar de provedor nunca invalida o cache de planos: planos são dados, replays são livres de LLM independentemente de quem planejou.
- `windup costs` detalha o gasto **por provedor e por modelo**, então alternar entre LLMs mantém o gasto por fornecedor visível.

## Planejar com sua assinatura do Claude (`--llm claude-code`)

Se você já paga um plano Claude (Pro/Max), pode planejar com ele em vez de comprar tokens de API — o Windup dirige o **`claude` CLI que você já tem**, sem chave de API, sem servidor extra.

> **Opt-in, nunca default.** Usar uma assinatura para planejar programaticamente é uma zona cinzenta não endossada pela Anthropic, e o Windup não a opera. Para trabalho sensível a confiabilidade (CI, suítes compartilhadas), prefira `--llm google` ou `--llm openai`. Replays em cache nunca chamam nenhum LLM, então um plano feito assim continua replayando a $0 sem nada rodando.

### Configuração — um comando

```bash
npx windup claude login    # instala o claude CLI se faltar, depois loga na sua assinatura
npx windup claude status   # a qualquer momento: "claude CLI: ready — voce@exemplo.com (max plan)"
```

O `windup claude login` instala o Claude Code CLI (com a sua confirmação — nunca um install global calado, nunca em CI) e abre o próprio login de navegador da Anthropic; você clica *autorizar* na sua conta. O **app desktop e o CLI logam separado**, então ter o app desktop não basta. Na mão, se preferir: `npm install -g @anthropic-ai/claude-code`, depois `claude` → `/login` (escolha "assinatura", não uma chave de API).

É só isso — sem wrapper, sem Python, sem servidor local. O Windup faz `spawn` do `claude` em modo não-interativo a cada plano (a partir de um diretório temporário isolado, então nunca pega o `CLAUDE.md` de um projeto).

### Várias contas — uma por projeto (`--profile`)

O login do CLI é **global**: um token, num único diretório de config, então todo projeto planeja na conta que logou por último. Se você tem um plano pessoal mais um por cliente, isso significa que o trabalho do cliente consome silenciosamente o *seu* plano. Amarre cada projeto à sua própria conta, uma vez:

```bash
cd ~/work/acme
npx windup claude login --profile acme     # config dir próprio + amarra este projeto + faz login
npx windup claude status                   # → confirma qual conta este projeto consome
```

O `--profile acme` dá àquela conta o **seu próprio diretório de config** (`~/.claude-acme` — uma sessão independente), **amarra o projeto** a ele exportando `CLAUDE_CONFIG_DIR` no `.envrc`, roda `direnv allow`, e só então abre o login. A partir daí, dar `cd` no projeto faz daquela conta a que planeja — incluindo o processo `claude` que o Windup faz `spawn`, que herda o ambiente. Repita por projeto com outro nome; seu `~/.claude` padrão fica intocado como o perfil sem nome.

Seu `.envrc` nunca é sobrescrito: um arquivo existente recebe um **append** (os outros exports intactos), rodar de novo não faz nada, e uma amarração a um perfil *diferente* interrompe e te mostra a linha para editar. Sem direnv? O comando imprime o `export` para você pôr no shell.

```bash
npx windup claude status                 # qual conta está ativa aqui (email + plano) — não gasta tokens
npx windup claude status --profile acme  # checa um perfil nomeado sem trocar para ele
npx windup claude login --force          # troca a conta ativa (desloga primeiro, dizendo de quem)
```

Duas coisas que vale saber: o `.claude/settings.json` de um projeto **não** consegue trocar a conta (o diretório de config é resolvido antes daquelas settings carregarem) — é por isso que a amarração vive no `.envrc`; e **replays cacheados não chamam LLM nenhum**, então com o `.windup/cache/` commitado a suíte roda a `$0` sem tocar em conta alguma.

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
