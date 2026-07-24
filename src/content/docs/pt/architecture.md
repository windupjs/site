---
title: Arquitetura e especificação
description: A especificação viva — tese, princípios, fronteiras entre módulos, formatos de dados e a postura de custo e segurança por trás do replay determinístico do Windup.
---

# Arquitetura e especificação

Uma visão condensada da [especificação viva](https://github.com/windupjs/windup/blob/main/docs/specs/SPEC.md). Ela descreve o sistema tal como entregue.

## Tese

Testes E2E de navegador podem usar um LLM **apenas para planejar** (e replanejar em caso de falha), com execução determinística e verificação barata — de modo que execuções repetidas façam **zero chamadas ao LLM**. Validado de ponta a ponta: a primeira execução planeja em segundos por frações de centavo; os replays levam ~0,5–1s e custam $0.

## Princípios

1. **O LLM é a exceção, não a regra.** Uma chamada por cache miss; replays nunca o chamam.
2. **Zero conhecimento do site embutido.** O motor pode conhecer *frameworks* (Next.js, react-router, nomenclatura de design-system) e a plataforma web — nunca um site específico. Todo conhecimento do site chega como entrada ou é descoberto em tempo de execução.
3. **Toda execução também é coleta.** O executor já visita cada página de um fluxo; persistir o que ele vê custa ~um `evaluate` por ação.
4. **Conhecimento é cache, não verdade.** Qualquer coisa que o mapa do site ou o scan estático afirme pode estar obsoleta; ela degrada para descoberta em tempo de execução. Precedência: `execution > static > llm`.
5. **Custo nunca surpreende.** Cada ponto de contato com o LLM tem um limite explícito; cada chamada é registrada em um livro-razão; trabalho estático/assist repetido é memoizado.
6. **Planos são dados, não programas.** Sem condicionais, sem loops, sem código livre. Se um fluxo precisa de ramificação, divida o cenário.

## Arquitetura

```
scenario (natural language, versioned)
    │
    ▼
┌─ runner ─────────────────────────┐
│ cache lookup (path-keyed)         │
│   miss → planner (LLM, 1 call)    │
│   hit  → cached plan (rebased)    │
│   → executor (deterministic)      │
│   → verifier (postconditions)     │─▶ fail → invalidate → re-plan
│   → cache save + run ledger       │
└───────────────────────────────────┘

site map (graph) ◀── windup scan (static + LLM-assist)
                 ◀── passive collection (every run)
```

Fronteiras entre módulos (todas em `packages/windup/src/`):

| Módulo | Responsabilidade |
|---|---|
| `browser.ts` | Fronteira única do motor (Playwright). `BrowserContext` novo por sessão sobre um singleton preguiçoso do Chromium; cliques confiáveis com actionability nativa; `ariaSnapshot()` alimenta o planejador. Mira no primeiro match *visível*, não no primeiro match do DOM. |
| `llm.ts` | Fronteira multi-provedor do LLM. Uma interface `LlmClient`; implementações de Google Gemini (SDK) e OpenAI (REST puro). Vários provedores configuráveis ao mesmo tempo; selecionados por execução. Trocar de provedor nunca toca no cache de planos. |
| `planner.ts` | Lógica de planejamento (agnóstica de provedor). Prompt = tarefa + árvore de a11y da página + elementos reais + fatia do mapa do site + catálogo de fragmentos + manifesto + dicas. Saída estruturada; dois níveis de retry (semântico + transitório); saída sanitizada e depois validada (o Ajv é a autoridade). |
| `executor.ts` | Loop determinístico: goto → por ação (gate na visibilidade → agir → verificar). Emite observações passivas para o mapa do site. |
| `verifier.ts` | Pós-condições, todas sem LLM: elemento visível, glob de URL, valor de input. Polling com esperas seguras entre frames. |
| `cache.ts` | Cache de trajetória indexado por `scenario_id` + *caminho* da URL inicial (portável entre ambientes). Salvo apenas após execução completa e verificada; um replay que falha invalida e replaneja, mantendo a entrada obsoleta como evidência. |
| `signature.ts` | Identidade estrutural da página: SHA-256 dos elementos interativos normalizados — sem texto, sem dados — para que ruído de ambiente não divida identidades. |
| `sitemap.ts` | Grafo de páginas/transições. Nós carregam `source: execution\|static\|llm` com obsolescência e proveniência. Fatia do prompt: BFS (profundidade ≤ 3), pontuada por termos, dentro de um orçamento de caracteres. |
| `scan/` | Indexação do projeto. Camada 1: rotas por convenção (Next.js, react-router, TanStack Router). Camada 2: elementos interativos via parsing de JSX ciente de chaves (tags cruas + componentes de design-system). Camada 3: LLM-assist limitado, memoizado por hash de arquivo. |
| `fragments.ts` | Subtrajetórias reutilizáveis e testadas, versionadas em `e2e/fragments/`. Planos as referenciam por id; o cache armazena a referência (atualizações se propagam). |
| `authoring.ts` | `windup new` — o LLM reescreve uma instrução vaga em um cenário preciso ancorado no mapa do site e no manifesto; credenciais auto-registradas e removidas; a saída é um arquivo versionado para revisão. |
| `metrics.ts` / `costs.ts` | Cada execução grava um registro no livro-razão (tokens, chamadas, modelo, tempo, classe de falha). Os preços são uma tabela por modelo datada; `windup costs` recalcula para que o histórico permaneça correto. |
| `summary.ts` / `suggest.ts` | Resumo pós-execução por IA e sugestão de correção pós-falha, opcionais — uma chamada extra ao LLM cada, rastreadas separadamente, sem nunca afetar o resultado da execução. |
| `reporters.ts` | Relatórios JUnit XML, JSON e HTML autocontido; saída diferente de zero em falha. |
| `secrets.ts` | Credenciais sem segredos versionados: valores em `.env.local`, mapeamento conta → nome de ENV versionado; planos carregam apenas `value_ref`, resolvido em tempo de execução. |

## Formatos de dados

**Plano de ações** (`plan_version: "0.1"`): `{ plan_version, scenario_id, task, start_url, generated_by, actions[] }`. Uma ação é `{ id, type: goto|click|fill|wait_for|use, target?, value? | value_ref?, url?, use?, expect?, timeout_ms }`. Regras semânticas: click/fill/wait_for exigem `target.selector`; fill exige exatamente um entre value/value_ref; `value_ref` precisa ser mencionado por task/hints/manifest (sem nomes de ENV inventados); a ação final precisa carregar `expect` (ou ser um `use`).

**Entrada de cache** (`cache_version: "0.2"`): `{ key: {scenario_id, start_url(path), start_sig?}, plan, status: active|stale, stats }`.

**Mapa do site** (`map_version: "0.1"`): `{ last_scan_sha, pages, transitions, assist_seen }`.

## Postura de modelo e custo

Modelo planejador padrão: **`gemini-3.1-flash-lite`** (medido: 1 chamada limpa/geração, ~3–4s, ≈ $0.0025/geração). Agnóstico de provedor: Google Gemini e OpenAI vêm de fábrica por trás da fronteira `llm.ts`. Cada registro do livro-razão carrega provedor+modelo; os preços são uma tabela plana por modelo. Adicionar um fornecedor = uma implementação de cliente.

## Postura de segurança

O conteúdo da página capturado do app sob teste é fornecido ao LLM **delimitado e marcado como dado não confiável**, com uma instrução explícita para tratá-lo como dado, nunca como instruções. Como os planos são dados validados por schema executados de forma determinística, uma página não pode fazer o Windup rodar código arbitrário. Valores de credenciais nunca entram em cenários, planos, no cache ou em prompts do LLM. Modelo de ameaças completo: [SECURITY.md](https://github.com/windupjs/windup/blob/main/SECURITY.md).

## Limitações conhecidas

- Caminhos relativos aninhados do react-router são coletados em modo best-effort (corrigidos por observações de execução).
- O scan é ciente de pacote único; monorepos são detectados e alertados, índices por app são trabalho futuro.
- Sem daemon entre invocações da CLI (deliberado); o pool aquecido é por processo.
- A auto-detecção de fragmentos não foi construída; a extração é manual.

## Verificação

- `npm test` (packages/windup): ~97 testes de unidade/integração, herméticos ao LLM. O CI os roda com Chromium real no Ubuntu.
- `windup bench <scenario>`: o protocolo de validação — 5 gerações (≥ 4/5 válidas), 10 replays (10/10 com `llm_calls=0`), replay ≥ 5× mais rápido, replay a $0, recuperação de seletor quebrado.
- Dogfood em projeto real: um app react-router com 106 rotas — planos fazem replay a ~0,5s/$0, cache portável entre ambientes.
