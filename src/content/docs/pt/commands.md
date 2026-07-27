---
title: Comandos
description: A referência completa da CLI do Windup — cada comando, as flags do run e os auxiliares opcionais de resumo por IA (--summary) e sugestão de correção (--suggest).
---

# Comandos

| Comando | Descrição |
|---|---|
| `windup init` | Cria `windup.config.ts`, `.windup/` (no gitignore) e um cenário de exemplo |
| `windup new "<instruction>" [--id x] [--force] [--depends-on ids] [--validate]` | Gera um cenário a partir de uma instrução vaga; `--validate` roda e o refina até passar (≤3 tentativas) |
| `windup record [id] [--url <start>] [--force] [--no-llm]` | Autoria por demonstração: dirige um navegador headful, marca uma verificação com a toolbar, finaliza — escreve o cenário + cacheia o plano gravado (replay $0). Precisa de um TTY |
| `windup run [scenario]` | Roda um cenário (replay quando em cache, planeja em caso de miss) |
| `windup run --all` | Roda todos os cenários — modo CI |
| `windup scan [--update] [--no-assist]` | Indexa estaticamente rotas e elementos interativos no mapa do site; `--update` reindexa apenas arquivos alterados desde o último scan (git diff); `--no-assist` pula a camada de LLM (custo zero) |
| `windup costs [--last n] [--days n] [--json]` | Relatório de uso de IA a partir do livro-razão de execuções: totais, replays gratuitos, detalhamento por provedor, por modelo e por cenário, gasto de scan e de autoria |
| `windup status` | Páginas do mapa do site por origem, obsolescência, cenários em cache, fragmentos |
| `windup coverage [--json]` | Cruza as rotas indexadas (`windup scan`) com os seus cenários — quais rotas têm um cenário e quais não têm nenhum (encontra lacunas de cobertura automaticamente, sem LLM) |
| `windup doctor` | Verificações prévias (preflight) — chave do LLM do provedor, navegador instalado, os cenários parseiam, sem referências a fragmentos órfãs, mapa do site escaneado, `config.network`/`clock` bem formados. Sem navegador/LLM/rede; código de saída diferente de zero diante de um problema grave |
| `windup why <scenario> [--json]` | Diagnostica um cenário: estado do cache (pronto para replay ou vai planejar), churn de re-planejamento, cadeia `depends_on`, histórico de runs e a última falha — tudo do ledger, sem LLM |
| `windup explain <scenario> [--json]` | Imprime o plano cacheado como passos legíveis (ir a / clicar / preencher / verificar). Revise um plano sem abrir o JSON; nunca mostra o valor secreto de um fill |
| `windup diff <scenario> [--json]` | Compara os dois runs mais recentes de um cenário — mudança de resultado, cache e Δ tempo / Δ custo / Δ ações (uma verificação de regressão) |
| `windup badge [--json] [--out <path>]` | Selo de status da suíte a partir do último run de cada cenário — um SVG autocontido (`N/M passing · $0`) ou um JSON de endpoint shields.io |
| `windup suggest-scenarios [--limit n] [--force] [--dry-run] [--llm p] [--json]` | Propõe (escreve) cenários para as rotas indexadas que ainda não têm cenário — uma chamada ao LLM por rota, reusando `windup new`; rascunhos para você revisar. `--dry-run` lista sem chamar o LLM |
| `windup trends [scenario] [--last n] [--json]` | Histórico de pass-rate, custo e duração por cenário a partir do ledger (pior pass-rate primeiro); um id de cenário mostra seus runs ao longo do tempo. Sem LLM |
| `windup fragment extract <scenario> <a1..aN> --id <id> --description <text>` | Promove uma fatia de um plano em cache a um fragmento reutilizável |
| `windup secret set <account> [--user u] [--password p]` | Registra credenciais de teste: valores → `.env.local`, mapeamento → `windup.credentials.json` |
| `windup secret list` | Contas + se cada ENV está definida (nunca imprime valores) |
| `windup secret remove <account>` | Remove uma conta: apaga o mapeamento e os valores no `.env.local` (alias: `rm`) |
| `windup sig <url> [--repeat n]` | Assinatura estrutural da página (diagnóstico) |
| `windup bench <scenario>` | Protocolo completo de validação (geração, determinismo do replay, recuperação de falhas) |
| `windup cache clear` | Descarta o cache de trajetória (as próximas execuções replanejam) |

### Flags do `run`

| Flag | O que faz |
|---|---|
| `--all` | Roda todos os cenários do diretório — modo CI, um navegador aquecido para a suíte inteira. Código de saída diferente de zero se qualquer cenário falhar. |
| `--concurrency <n>` | Roda até `n` cenários em paralelo em um único navegador aquecido compartilhado com contextos isolados — ~2× mais rápido em uma suíte mista. Sequencial por padrão. |
| `--shard <i/n>` | Com `--all`: roda o shard *i* de *n* (divisão round-robin da lista de cenários) — distribui uma suíte grande entre runners de CI em paralelo (`--shard 1/4`, `--shard 2/4`, …), cada um um job separado. |
| `--retries <n>` | Roda de novo um cenário que falhou de forma **transitória** (reset de rede, falha de verificação por corrida de hidratação, `setup`/`dependency` instável) até `n` vezes a mais — o primeiro passe vence. Um bloqueio de `config.forbid` nunca é repetido. Um cenário que passa só numa repetição é marcado `flaky` (console `↻`, selo `FLAKY n×` no relatório HTML, `flaky`/`attempts` no JSON e no stream `run:end`) — exposto, não escondido. |
| `--max-wall <seconds>` | Com `--all`: um **orçamento de tempo** da suíte. Quando o relógio de parede ultrapassa o teto, para de iniciar novos cenários (os em andamento terminam) e sai com código diferente de zero — uma suíte descontrolada faz o build falhar em vez de travar o runner. Funciona no sequencial e com `--concurrency`. |
| `--bail` | Com `--all`: para de iniciar novos cenários após a **primeira falha** — feedback rápido num check de PR. Completa o trio de barreiras com `--retries`/`--max-wall`; funciona no sequencial e com `--concurrency`. |
| `--no-prewarm` | Desativa o **pré-aquecimento do navegador**. Por padrão, um `run --all` sequencial pré-cria o contexto+página frescos do próximo cenário fora do caminho crítico (~200 ms/cenário economizados, isolation sem mudança); esta flag desliga isso. Só runs sequenciais pré-aquecem. |
| `--fail-on-console` | Falha um cenário se a página logou um erro de console ou lançou uma exceção não capturada durante o run (é registrado de qualquer forma; stubs do `config.network` são excluídos). |
| `--fail-on-5xx` | Falha um cenário se alguma requisição recebeu uma resposta 5xx durante o run. Stubs 5xx deliberados do `config.network` e URLs em `config.failOn.ignore` são excluídos. |
| `--device <name>` | Emula um preset de dispositivo do Playwright (ex.: `"iPhone 14"`, `"Pixel 7"`, `"iPad Pro 11"`) — viewport, user-agent, escala, mobile/touch. Planos cacheados são keyados por dispositivo (mobile e desktop são trajetórias separadas). Emulação mobile precisa do chromium. |
| `--web-vitals` | Captura o TTFB / FCP / LCP / DCL / load / CLS da página final e os reporta (informativo). Coloque um gate com `config.budgets`. |
| `--a11y` | Após cada cenário, roda uma auditoria de acessibilidade com [axe-core](https://github.com/dequelabs/axe-core) na página final e reporta as violações. Informativa — nunca faz a execução falhar. Dependência opcional opt-in: `npm i -D axe-core`. |
| `--tag <names>` | Com `--all`: roda apenas os cenários que carregam alguma dessas tags (separadas por vírgula, p. ex. `smoke,checkout`). Compõe com `--shard` e `--changed`. |
| `--trace` | Em um cenário **que falha**, salva um trace do Playwright (`.windup/reports/traces/<id>.zip`, abrível no visualizador de trace) + uma captura de tela de página inteira; o relatório HTML enlaça ambos. Capturado apenas na falha. |
| `--github` | Emite anotações `::error::` do GitHub Actions para as falhas + um resumo do job em Markdown para `$GITHUB_STEP_SUMMARY`. Ativado automaticamente quando `GITHUB_ACTIONS=true`. |
| `--watch` | Re-roda um único cenário sempre que seu arquivo muda — um ciclo de autoria rápido. |
| `--changed` / `--since <ref>` | Com `--all`: roda apenas os cenários que uma mudança afeta — `--changed` compara a árvore de trabalho com `HEAD`, `--since main` (ou qualquer ref do git) com essa ref. Um cenário roda quando seu arquivo mudou, quando não tem um plano em cache, ou quando seu plano visita uma rota cuja fonte indexada mudou. Recorre à suíte inteira quando o impacto não pode ser provado (arquivos não atribuídos, sem git/mapa do site) — nunca um falso verde silencioso; um conjunto de afetados vazio sai com 0. |
| `--no-cache` | Ignora o plano em cache e replaneja do zero (força uma chamada ao LLM), mesmo quando existe uma trajetória válida. Use para regenerar um plano de propósito. |
| `--no-map` | Planeja sem o grafo do mapa do site — pula as rotas e seletores indexados. Útil para depurar o planejador ou um ambiente novinho. |
| `--repeat <n>` | Roda o cenário `n` vezes seguidas no mesmo navegador aquecido — checagens de estabilidade e instabilidade. |
| `--verbose` | Imprime marcos de planejamento/execução no stderr — um heartbeat para provedores lentos (ex.: `--llm claude-code`, cujo planejamento pode levar minutos sem saída). |
| `--stream` | Emite eventos NDJSON legíveis por máquina (um por marco: `run:start`, `planning`, `plan`, `action`, `replan`, `run:end`) no stdout para CI/dashboards; `--verbose` fica no stderr, então o stdout é NDJSON puro. |
| `--headed` | Mostra a janela do navegador em vez de rodar headless. |
| `--slowmo <ms>` | Adiciona um atraso entre ações para você acompanhar cada passo — ritmo de demo e depuração. |
| `--base-url <url>` | Sobrescreve a origem da URL inicial nesta execução (dev / staging / CI). Rebaseia até URLs de cenário absolutas, preservando caminho e query. |
| `--browser chromium\|firefox\|webkit` | Roda no motor escolhido (Chromium por padrão). O mesmo plano faz replay nos três — escreva uma vez, rode em todos. |
| `--llm <provider[:model]>` | Escolhe o LLM planejador nesta execução (ex.: `openai:gpt-5-mini`). Afeta apenas o planejamento; replays do cache nunca chamam um LLM. |
| `--summary` | Após a execução, uma chamada extra ao LLM escreve um resumo legível por humanos citando valores reais observados na página final. Desligado por padrão para que os replays fiquem em $0. |
| `--suggest` | Em uma execução que **falhou**, uma chamada extra ao LLM propõe uma correção concreta para o cenário. Dispara apenas em caso de falha. |
| `--reporter junit\|json\|html` | Gera um relatório de CI — JUnit XML, um resumo JSON legível por máquina ou uma página HTML autocontida. |
| `--report-file <path>` | Escreve o relatório em um caminho específico (padrão `.windup/reports/`). |

## Resumo por IA (`--summary`)

Para humanos lendo resultados (não CI), `--summary` adiciona uma chamada ao LLM após cada execução que escreve um breve resumo: o que o teste fez, o resultado, **valores concretos observados na página final** (preços, mensagens, nomes de produtos — citados literalmente da página) e quaisquer dificuldades (passos lentos, replanejamento, falhas). Ele imprime no terminal, entra no livro-razão de execuções e aparece como um bloco destacado nos relatórios HTML/JSON.

```bash
npx windup run checkout --summary --reporter html
# summary: "The test logged in and completed checkout for 3 items; the
#  confirmation page showed 'Thank you for your order'. Prices observed: ..."
```

Desligado por padrão de propósito — replays do cache ficam em zero chamadas ao LLM e $0. O custo do resumo (~$0.0005 no modelo padrão) é rastreado separadamente nas métricas da execução e incluído em `estimated_cost_usd`.

## Sugestões de correção em falhas (`--suggest`)

Quando uma execução **falha**, `--suggest` adiciona uma chamada ao LLM que age como um engenheiro de QA sênior depurando-a: ele compara o plano executado e o passo que falhou contra a **página final real** e os seletores conhecidos do mapa do site, e então propõe uma correção concreta para o cenário — o seletor errado e o real, uma tela alvo que não contém o que a tarefa espera, um passo faltando ou um timeout curto demais para uma página lenta.

```bash
npx windup run create-invoice --suggest
# FAIL  create-invoice  ... element button:has-text('Save') not visible
#   suggested fix: The 'Save' button does not exist; the dialog's real button
#   is labeled 'Create'. Change the hint to button:has-text('Create').
```

Ele transforma uma execução vermelha em uma edição específica — em vez de fazer engenharia reversa do app à mão. Dispara apenas em falha (execuções verdes não custam nada), nunca edita o cenário em si, e aparece como um bloco destacado nos relatórios HTML/JSON. Combina naturalmente com `--summary`.
