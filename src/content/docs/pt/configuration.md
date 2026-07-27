---
title: Configuração
description: A referência do windup.config.ts — base URL, provedores de LLM, configurações de scan e o manifesto do projeto que injeta conhecimento da equipe no planejador.
---

# Configuração (`windup.config.ts`)

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
  // Sinais de prontidão reutilizáveis por glob de rota (anti-flaky) — veja abaixo.
  readySignals: {
    "**/workspace/**": "#app-ready",              // espere por isto antes de agir em qualquer página /workspace/*
    "**/reports/**": ["#grid", "[data-loaded]"],  // um ou mais seletores
  },
  // Fixtures de nível de suíte (bloco `suite`): rodam uma vez ao redor de `run --all` (beforeAll / afterAll).
  suite: {
    setup:    "npm run db:seed",
    teardown: "npm run db:reset",
  },
  // Lista de bloqueio de segurança: aborta se um plano chegar a tocar nisto (guardrail de CI).
  forbid: {
    selectors: ["#change-password", "[data-danger]"],  // correspondência de substring no seletor de um plano
    urls: ["**/account/password", "**/admin/**"],       // globs de caminho que a execução nunca deve alcançar
  },
  // Valores dinâmicos obtidos em tempo de execução (OTP, magic-links) — referenciados por um plano via value_ref/url_ref.
  resolve: {
    otp_code:   { source: { kind: "cmd", command: "psql \"$DATABASE_URL\" -tAc \"select code from otp_codes order by created_at desc limit 1\"" }, extract: { regex: "(\\d{6})" }, poll: { timeout_ms: 30000 } },
    magic_link: { source: { kind: "http", url: "https://inbox.test/latest" }, extract: { json: "body.url" }, url: true },
  },
  // Vínculo determinístico: qualquer fill em um campo correspondente é preenchido a partir do resolver.
  resolveFields: { "[name=otp]": "otp_code" },
  // Stub de requests: respostas determinísticas para requisições que casarem (um 500, uma lista vazia, uma chamada caída).
  network: [
    { url: "**/api/orders", json: [] },                 // força uma lista vazia
    { url: "**/api/report", status: 500 },              // simula um erro do servidor
    { url: "**/analytics", abort: true },               // descarta a requisição (erro de rede)
  ],
  // Relógio congelado: fixa a hora e/ou o timezone da página para cenários dependentes de data.
  clock: { now: "2026-01-15T09:00:00Z", timezone: "America/Sao_Paulo" },
  // Barreiras de saúde em runtime: falha um cenário diante de um erro de JS / 4xx de recurso / 5xx visto durante o run.
  failOn: { consoleErrors: true, resourceErrors: true, http5xx: true, ignore: ["/analytics", "gravatar.com"] },
  // Emulação de dispositivo: um preset do Playwright aplicado a cada run (viewport/UA/mobile). O cache é keyado por dispositivo.
  device: "iPhone 14",
  // Orçamentos de performance: falha quando a métrica da página final ultrapassa o limite (ms, ou sem unidade para cls).
  budgets: { lcp_ms: 2500, cls: 0.1, load_ms: 4000 },
});
```

- **`context.credentials`** mapeia nomes de conta para referências ENV. Quando uma tarefa menciona a conta, o plano usa `value_ref` — credenciais do manifesto têm precedência mesmo que a página exiba valores, e o planejador é proibido de inventar nomes de ENV.
- **`readySignals`** mapeia um glob de rota para o(s) seletor(es) CSS que devem estar **visíveis antes de o executor rodar a primeira ação** em uma página correspondente. É aplicado de forma determinística em tempo de execução (sem LLM, $0, não faz parte do plano em cache) sempre que uma execução entra em uma rota correspondente — assim uma espera de hidratação/carregamento é definida uma vez por rota em vez de repetida como uma dica em cada cenário. Ele fecha a corrida em tempo de carregamento onde um elemento está presente mas seus manipuladores ainda não foram anexados (algo que a espera por elemento do Playwright não consegue ver). Best-effort: um sinal que nunca aparece dentro do timeout registra um aviso e continua (nunca faz a suíte falhar de forma dura).
- **`suite.setup` / `suite.teardown`** são comando(s) de shell que rodam **uma vez** ao redor de um `run --all` — o setup antes do primeiro cenário, o teardown depois do último (sempre, mesmo em caso de falha) — para fixtures de toda a suíte (semear/resetar um banco de dados compartilhado, iniciar um stub). O `setup`/`teardown` por cenário (no JSON do cenário) continuam cuidando do estado por teste. Um `suite.setup` que falha aborta a suíte antes de qualquer cenário rodar; um `suite.teardown` que falha é um aviso.
- **`forbid`** é uma lista de bloqueio de segurança — um guardrail de CI contra efeitos colaterais irreversíveis. Se qualquer ação do plano mirar um **seletor** proibido (correspondência de substring, ex. `#change-password`) ou a execução alcançar uma **URL** proibida (glob de caminho, ex. `**/account/password`), a execução **aborta** com uma falha `forbidden` em vez de realizá-la. Você declara a lista de perigos (o motor nunca a infere), então mesmo que um replanejamento derive rumo a "Trocar senha", ele é interrompido antes do clique. Uma falha `forbidden` nunca invalida o cache nem replaneja, portanto não precisa de chave de LLM.
- **`resolve`** declara valores dinâmicos obtidos em tempo de execução (um código OTP, uma URL de magic-link) — o que desbloqueia o login com OTP/magic-link/sem senha. Um plano referencia um via `value_ref: "<name>"` (um fill) ou `url_ref: "<name>"` (um goto); o Windup obtém o **`source`** (`cmd` stdout de shell, `http` fetch, ou `fn` um módulo do projeto), extrai o valor com **`extract`** (um grupo de captura `regex` ou um caminho de pontos `json`) e faz **`poll`** até ele aparecer (30 s por padrão). O **source é declarado pelo autor, nunca gerado pelo LLM** (sem vetor de execução de código a partir do modelo), e o valor resolvido é **efêmero** — usado para o fill/goto e nunca escrito no cache, relatório ou logs.
- **`network`** faz stub de requisições HTTP de forma determinística — uma lista de regras cotejadas contra a URL da requisição (uma **substring** ou um **glob**) mais um `method` opcional, **a primeira correspondência vence**. Responde com `status` (padrão 200) + `body`/`json` (um corpo `json` define o `content-type` automaticamente) + `headers`/`contentType` opcionais, ou `abort: true` para descartar a requisição (um erro de rede simulado). Permite que um cenário alcance um estado difícil de semear — um 500, uma lista vazia, uma chamada de terceiros que falha — sem tocar o backend. Declarado pelo autor, aplicado em cada run e **nunca parte do plano cacheado**.
- **`clock`** fixa a hora da página. `now` (uma string ISO ou epoch ms) congela `Date`/`Date.now()` num instante fixo — injetado antes de qualquer script da página, então `new Date()` na app o retorna — para cenários que de outra forma derivariam ("pedidos de hoje", uma contagem regressiva). `timezone` (um nome IANA) define a zona do navegador nativamente. Congelado, não avança; aplicado em cada run, nunca cacheado.
- **`failOn`** transforma sinais de saúde em runtime em falhas. `consoleErrors: true` falha diante de um erro de **JS** — uma exceção não capturada, um `console.error`, uma violação de CSP; `resourceErrors: true` falha diante de um **sub-recurso** que falhou ao carregar (um 4xx de img/font/script/xhr — o tipo barulhento, mantido como barreira separada para que a saúde do JS não seja afogada por imagens quebradas); `http5xx: true` falha diante de um 5xx. `ignore` é uma lista de substrings que silenciam ruído conhecido (analytics, um `d=404` de Gravatar, um 500 de terceiros que você não controla) — cotejadas contra **tanto a mensagem quanto a URL de origem**, então um erro de recurso cujo texto de console não traz URL ainda pode ser silenciado pelo seu host. Requisições respondidas pelo `config.network` são sempre excluídas — um stub deliberado não é uma falha real. As flags de CLI `--fail-on-console` / `--fail-on-resource` / `--fail-on-5xx` as forçam para um único run; de qualquer forma os sinais são registrados (cada erro de console com sua `url` e `kind` `js`/`resource`) e mostrados nos relatórios.
- **`device`** emula um preset de dispositivo do Playwright (um nome como `"iPhone 14"`, `"Pixel 7"`, `"iPad Pro 11"`) em cada run — viewport, user-agent, escala, mobile/touch. Também `--device <name>` (vence sobre a config). Planos cacheados são **keyados por dispositivo**, então mobile e desktop mantêm trajetórias separadas (rodar o mesmo cenário em dois viewports não atropela um plano); sem dispositivo, o cache não muda. Emulação mobile precisa do chromium; um preset desconhecido falha rápido com uma dica.
- **`budgets`** define limites de performance na página final — `ttfb_ms`, `fcp_ms`, `lcp_ms`, `dcl_ms`, `load_ms` (milissegundos) e `cls` (sem unidade). Qualquer estouro falha o cenário (kind `budget`). Definir qualquer budget liga a captura de web-vitals; `--web-vitals` captura e reporta sem gate. Números de performance são ruidosos, então defina budgets com folga (pegam regressões, não micro-jitter).
- **`resolveFields`** vincula um campo a um resolver de forma determinística — recomendado para CI. Indexado por uma **substring de seletor** (`{ "[name=otp]": "otp_code" }`), qualquer fill em um campo correspondente é preenchido a partir daquele resolver, **sobrepondo o que quer que o plano tenha colocado ali**. Assim o fluxo de OTP não depende mais de o planejador lembrar de emitir `value_ref` — mesmo que ele preencha um literal ou um nome com capitalização diferente, o Windup ainda resolve o campo (nomes como `OTP_CODE` / `otp-code` normalizam para um `otp_code` declarado).
- **LLM-assist** (camada 3 do scan) lê arquivos que as camadas estáticas não conseguiram resolver (rotas construídas dinamicamente, componentes indiretos), limitado por `maxCalls`. Os resultados são lembrados por hash de arquivo — arquivos inalterados nunca custam de novo. Os custos são registrados no livro-razão e mostrados por `windup costs`.

## O que fica onde

| Caminho | Conteúdo | Versionar? |
|---|---|---|
| `windup.config.ts` | Configuração | ✅ |
| `e2e/scenarios/*.json` | Seus testes, em linguagem natural | ✅ |
| `e2e/fragments/*.json` | Blocos reutilizáveis selecionados | ✅ |
| `windup.credentials.json` | Mapeamento conta → nome de ENV (sem valores) | ✅ |
| `.env.local` | Valores das credenciais | ❌ (auto-gitignore; o CI usa secrets com os mesmos nomes) |
| `.windup/` | Estado derivado: cache de planos, livro-razão de execuções, mapa do site, relatórios | ❌ (o init o adiciona ao `.gitignore`) |
