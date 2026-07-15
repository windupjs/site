---
title: Comandos
description: A referência completa da CLI do Windup — cada comando, as flags do run e os auxiliares opcionais de resumo por IA (--summary) e sugestão de correção (--suggest).
---

# Comandos

| Comando | Descrição |
|---|---|
| `windup init` | Cria `windup.config.ts`, `.windup/` (no gitignore) e um cenário de exemplo |
| `windup new "<instruction>" [--id x] [--force] [--depends-on ids] [--validate]` | Gera um cenário a partir de uma instrução vaga; `--validate` roda e o refina até passar (≤3 tentativas) |
| `windup run [scenario]` | Roda um cenário (replay quando em cache, planeja em caso de miss) |
| `windup run --all` | Roda todos os cenários — modo CI |
| `windup scan [--update] [--no-assist]` | Indexa estaticamente rotas e elementos interativos no mapa do site; `--update` reindexa apenas arquivos alterados desde o último scan (git diff); `--no-assist` pula a camada de LLM (custo zero) |
| `windup costs [--last n] [--days n] [--json]` | Relatório de uso de IA a partir do livro-razão de execuções: totais, replays gratuitos, detalhamento por provedor, por modelo e por cenário, gasto de scan e de autoria |
| `windup status` | Páginas do mapa do site por origem, obsolescência, cenários em cache, fragmentos |
| `windup fragment extract <scenario> <a1..aN> --id <id> --description <text>` | Promove uma fatia de um plano em cache a um fragmento reutilizável |
| `windup secret set <account> [--user u] [--password p]` | Registra credenciais de teste: valores → `.env.local`, mapeamento → `windup.credentials.json` |
| `windup secret list` | Contas + se cada ENV está definida (nunca imprime valores) |
| `windup sig <url> [--repeat n]` | Assinatura estrutural da página (diagnóstico) |
| `windup bench <scenario>` | Protocolo completo de validação (geração, determinismo do replay, recuperação de falhas) |
| `windup cache clear` | Descarta o cache de trajetória (as próximas execuções replanejam) |

### Flags do `run`

| Flag | O que faz |
|---|---|
| `--all` | Roda todos os cenários do diretório — modo CI, um navegador aquecido para a suíte inteira. Código de saída diferente de zero se qualquer cenário falhar. |
| `--concurrency <n>` | Roda até `n` cenários em paralelo em um único navegador aquecido compartilhado com contextos isolados — ~2× mais rápido em uma suíte mista. Sequencial por padrão. |
| `--no-cache` | Ignora o plano em cache e replaneja do zero (força uma chamada ao LLM), mesmo quando existe uma trajetória válida. Use para regenerar um plano de propósito. |
| `--no-map` | Planeja sem o grafo do mapa do site — pula as rotas e seletores indexados. Útil para depurar o planejador ou um ambiente novinho. |
| `--repeat <n>` | Roda o cenário `n` vezes seguidas no mesmo navegador aquecido — checagens de estabilidade e instabilidade. |
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
