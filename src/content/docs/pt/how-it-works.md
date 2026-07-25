---
title: Como funciona
description: O LLM planeja um cenário uma vez em JSON validado por schema; um executor determinístico faz replay com zero chamadas ao LLM e verificação barata de DOM.
---

# Como funciona

```
natural-language task ──▶ planner (LLM, 1 call) ──▶ JSON action plan
                                                        │
       trajectory cache ◀── cheap verification ◀── deterministic executor
             │
             └──▶ subsequent runs: zero LLM, ~1s, $0
```

A parte cara — descobrir as ações do navegador — acontece uma única vez e é transformada em dados verificáveis em cache.

- **Planos são dados, não código** — JSON validado por schema; sem scripts gerados, sem condicionais.
- **Verificação barata** — pós-condições de DOM/URL após cada ação. Uma verificação que falha invalida o plano em cache e dispara um replanejamento automático.
- **Mapa do site** — cada execução alimenta um grafo de páginas e transições; `windup scan` popula esse grafo direto do seu código-fonte antes da primeira execução, para que o planejador use os seletores *reais* do seu app em vez de adivinhar.
- **Fragmentos** — blocos de ações comprovados (ex.: login) que o planejador compõe via `{ "type": "use" }` em vez de regerar.
- **Zero conhecimento do site embutido** — o motor conhece frameworks e a web, nunca o *seu* site. Todo conhecimento do site chega como entrada (cenários, config, manifesto) ou é descoberto em tempo de execução.

## Por que Windup

Scripts escritos à mão são baratos de rodar, mas caros de manter. Agentes de IA por execução são fáceis de escrever, mas lentos e não determinísticos. O Windup pega a metade boa de cada um.

|  | Scripts à mão | Agente de IA por execução | **Windup** |
|---|---|---|---|
| Autoria | código + seletores à mão | linguagem simples | linguagem simples |
| Custo por execução | $0 | LLM em **cada** execução | LLM apenas na **primeira** execução |
| Velocidade | rápido | lento (modelo no loop) | ~1s replay |
| Determinismo | alto | baixo — improvisa toda vez | alto — mesmo plano em cada replay |
| App mudou | você conserta o script | pode fazer outra coisa em silêncio | verificação falha → replanejamento automático |

**O que o cache compra é `$0`, não "instantâneo".** Um acerto de cache pula o *planejamento* do LLM (`plan=0ms`, `llm_calls=0`) — mas as ações de Playwright do plano ainda rodam, e qualquer cadeia [`depends_on`](/scenarios/) ainda executa, então o tempo real é tempo de navegador real, não uma consulta. Cada execução reporta o detalhamento — `total=… (plan=… deps=… exec=… setup=…)` — onde `deps` é a cadeia de dependências, `exec` são as ações deste cenário e `setup` é o contexto do navegador. O relatório HTML divide a duração de cada cenário em uma barra que reconcilia (`setup · deps · plan · nav · actions`), onde **`nav`** é o goto + o carregamento/hidratação da página *antes* da primeira ação — normalmente o verdadeiro sorvedouro de tempo em uma SPA (então uma ação de 113 ms que aparece como "3.6 s" na verdade é setup + nav). O cabeçalho da suíte mostra o **tempo de parede** (wall-clock, tempo real decorrido), não a soma dos totais por cenário, que infla ~N× sob `--concurrency N`. A maior alavanca são os **snapshots de sessão**: o estado de autenticação de uma dependência (`storageState`) é capturado uma vez e restaurado em replays posteriores, de modo que o fluxo de login não é reexecutado para cada dependente (`deps≈0`).

Para os mecanismos mais profundos — fronteiras entre módulos, formatos de dados, postura de custo e segurança — veja [Arquitetura e especificação](/pt/docs/architecture).
