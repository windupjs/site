---
title: Cenários
description: Um cenário é um arquivo JSON que descreve um teste em linguagem simples. Aprenda o formato, as dependências entre cenários e a autoria assistida por LLM com windup new.
---

# Cenários

Um cenário é um arquivo JSON no seu diretório de cenários (padrão `e2e/scenarios/`):

```json
{
  "scenario_id": "checkout",
  "start_url": "/",
  "task": "Log in as the qa account, add 'Backpack' to the cart, check out and verify the order confirmation message appears.",
  "hints": ["Optional site-specific tips for the planner. Delete if not needed."]
}
```

- `start_url` é **opcional** (padrão `/`) e deve permanecer livre de ambiente: um caminho, resolvido contra a base URL efetiva.
- Termine a tarefa com **o que verificar** — isso vira a pós-condição final do plano.
- Nunca coloque segredos nas tarefas. Referencie contas a partir do manifesto do projeto (veja [Credenciais de teste](/pt/docs/credentials)); o plano usará `value_ref: "ENV:VAR"` e o valor real é resolvido apenas em tempo de execução, nunca em cache.
- **Organize por pasta.** Os cenários são descobertos recursivamente, então você pode agrupá-los em subpastas (`e2e/scenarios/contacts/list.json`, `e2e/scenarios/auth/login.json`). O **`scenario_id` é a identidade** — `run --all`, a suíte do vitest e `depends_on` resolvem todos por ele, independentemente do caminho do arquivo (ids duplicados são reportados).

## Dependências entre cenários (`depends_on`)

Os fluxos raramente começam do zero — criar uma conta bancária exige estar logado. Declare os pré-requisitos e cada cenário permanece pequeno, focado e individualmente cacheável:

```json
{
  "scenario_id": "create-bank-account",
  "depends_on": ["login"],
  "task": "Already on the dashboard, open Settings > Bank accounts, create an account named 'Inter' and verify it appears in the list."
}
```

- As dependências rodam **na mesma sessão do navegador**, em ordem, cada uma com seu próprio cache — uma suíte aquecida faz replay da cadeia inteira com zero chamadas ao LLM.
- Sem um `start_url`, o cenário dependente **continua de onde a última dependência terminou** — e no primeiro planejamento o LLM vê essa página real (o dashboard pós-login), em vez de planejar às cegas.
- Cadeias funcionam (`login` → `select-company` → `create-account`), ciclos são rejeitados, e uma dependência que falha faz a execução falhar com o tipo `dependency` antes mesmo de o cenário em si começar.
- Cada dependência mantém sua própria autorreparação: se o plano em cache dela quebrar, ela replaneja e recacheia — os dependentes se beneficiam automaticamente.
- Editar a `task` de um cenário invalida seu plano em cache (um teste reescrito é um teste diferente).

`windup new` lida com dependências das duas formas: `--depends-on login` as declara explicitamente, e **o LLM autor também as sugere por conta própria** — ele vê todos os cenários existentes (id + task) e, quando a instrução pressupõe um estado que um deles produz ("já logado…"), emite `depends_on` automaticamente (filtrado mecanicamente contra ids reais de cenários — nunca inventado).

## Autoria com `windup new`

Você não precisa escrever tarefas detalhadas à mão. Dê a `windup new` uma instrução vaga e o LLM age como autor de testes — ele a reescreve em um cenário preciso e verificável usando o **mapa do site** (telas, menus e elementos reais de `windup scan` e execuções passadas) e o **manifesto do projeto** (contas referenciadas por nome, nunca credenciais literais):

```bash
npx windup new "log in with the qa user, add the backpack to the cart and check out"
# → e2e/scenarios/purchase-backpack-qa.json — real screen names, concrete fake
#   form data, account referenced as "the qa account", explicit final verification
```

Ele gera o `scenario_id`, escolhe o `start_url` a partir das rotas conhecidas (recorrendo a `/` — ele nunca inventa caminhos) e adiciona dicas de seletor do mapa quando ajudam. Adicione **`--validate`** para que ele rode o cenário gerado e, se falhar, o refine a partir da falha e tente de novo (até 3 tentativas) — você recebe de volta um cenário que *já passou uma vez*, com um cache aquecido:

```bash
npx windup new "log in and create a cost center named Marketing" --validate
#   attempt 1: FAIL — element button:has-text('Save') not visible
#   attempt 2: PASSED
#   ✓ validated in 2 attempts — the plan is cached
```

**Credenciais na instrução nunca vão parar no arquivo do cenário**: elas são auto-registradas como uma conta nomeada (valores em `.env.local`, mapeamento em `windup.credentials.json`) e a tarefa referencia a conta — veja [Credenciais de teste](/pt/docs/credentials).

Flags: `--id <id>`, `--force` (sobrescrever), `--depends-on <ids>`, `--llm <provider[:model]>`. A saída é um arquivo para **você revisar, editar e versionar** — a autoria é assistida, o teste continua sendo seu. Uma chamada ao LLM (~$0.001), registrada no livro-razão do `windup costs` sob `authoring`.
