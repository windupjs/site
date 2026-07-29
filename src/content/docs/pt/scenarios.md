---
title: Cenários
description: Um cenário é um arquivo JSON que descreve um teste em linguagem simples. Aprenda o formato e os campos — dependências, reúso isomórfico, fixtures do lado do cliente, diálogos e mais.
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
- Termine a tarefa com **o que verificar** — isso vira a pós-condição final do plano. Além de "um elemento está visível" ou "a URL é X", o plano pode asserir **condições mais ricas**: o texto contém uma string, uma **contagem** de elementos (`equals`/`min`/`max`), um seletor **sumiu** (não visível), ou um **atributo** igual a um valor — assim "verifique que aparecem 3 pedidos", "verifique que o banner de erro some" ou "verifique que o campo fica marcado como válido" viram checagens precisas. Escreva a tarefa assim e o planejador emite o `expect` correspondente.
- **Coloque entre aspas o texto que você quer verificar — o Windup o asserta por você.** Quando a tarefa nomeia um literal entre aspas ("…e verifique que o texto **'Popular parking'** aparece") e a checagem final do plano acaba saindo fraca, o Windup a reescreve como um `text_contains` sobre exatamente esse texto — **de forma determinística, sem nenhuma chamada extra ao LLM**, e só depois de confirmar que a página ao vivo realmente o contém. Essa é a maneira confiável de obter uma asserção forte: ela não depende de o modelo escolher bem.
- **Uma verificação que não pode falhar é rejeitada.** Uma checagem final não vale nada quando passa independentemente da funcionalidade: um *landmark* puro (`body`, `html`, `main`, `div`, `#root`) ou **qualquer seletor puro que case com mais de um elemento na página ao vivo** (`h2` numa página com cinco títulos — apagar a seção inteira ainda deixa quatro). O Windup checa os dois — a lista de landmarks offline, a contagem de correspondências contra a página real no momento do planejamento — e **rejeita** um plano assim, re-planejando com um erro que diz quantos elementos casaram e o que asserir no lugar. Asserções de conteúdo valem em qualquer seletor: `text_contains: { selector: "main", text: "Popular parking" }` passa, porque o que ela afirma é o texto. Planos já em cache seguem sendo reproduzidos sem alteração; rode `windup explain <id>` para identificar uma verificação fraca que você já tem (ele imprime `⚠ weak verification: …`).
- Nunca coloque segredos nas tarefas. Referencie contas a partir do manifesto do projeto (veja [Credenciais de teste](/pt/docs/credentials)); o plano usará `value_ref: "ENV:VAR"` e o valor real é resolvido apenas em tempo de execução, nunca em cache.
- **Diálogos nativos & verificação não-toast.** O Windup lida com diálogos nativos do navegador (`window.confirm`/`alert`/`prompt`) que protegem ações destrutivas (arquivar, excluir, cancelar): o planejador adiciona `"dialog": "accept"` (ou `"dismiss"` para cancelar) à ação que abre o diálogo — caso contrário o diálogo é auto-dispensado e a ação silenciosamente não faz nada. Ele também direciona a verificação final para um sinal **persistente** (uma linha que desaparece, um rótulo alterado, uma URL) em vez de um toast/snackbar efêmero que some em segundos.
- **Diálogo padrão para o cenário inteiro (`on_dialog`).** Se um fluxo dispara a *mesma* confirmação em vários passos (exclusão em massa, guardas de "sair da página?"), defina `"on_dialog": "accept"` (ou `"dismiss"`) uma única vez no cenário e um handler **persistente** responde a cada diálogo nativo durante toda a execução — sem precisar de um `dialog` por ação. O `dialog` por ação ainda funciona para casos pontuais; quando `on_dialog` está presente, ele assume.
- **Forçar uma interação por passo (`atomic_steps`).** Por padrão o planejador pode comprimir um revelar-e-agir numa única ação. Defina `"atomic_steps": true` e ele deverá emitir **uma interação por ação** — nunca mesclando um clique de expandir/abrir com o controle que ele revela — para que o replay fique granular e o relatório legível quando a UI esconde controles atrás de um disclosure.
- **Colocar um cenário flaky em quarentena (`quarantine`).** Defina `"quarantine": true` e o cenário ainda **roda e reporta**, mas uma falha **não faz a suíte falhar** (código de saída diferente de zero) — assim um flake teimoso deixa de bloquear o CI enquanto você o conserta, sem apagar o teste nem deixá-lo vermelho a cada build. É exibido de forma chamativa (uma linha `🔶` no console, um selo `QUARANTINED` no relatório, `quarantined: true` no JSON), nunca pulado em silêncio. Combine com `windup trends <id>` para ver se estabilizou.
- **Fallback por rótulo de acessibilidade (automático).** Quando o seletor CSS de um plano erra no replay, o Windup tenta o alvo de novo pelo seu **nome acessível** (a descrição da ação cruzada com label/placeholder/role) e age apenas quando **exatamente um** campo visível casa — recuperando-se de um seletor chutado e frágil sem re-planejar. O passo recuperado é sinalizado no relatório (`≈ found "<label>" by label …`). Se nem o seletor nem o rótulo resolvem, a falha diz que o controle provavelmente **não tem rótulo acessível (lacuna de a11y)** e que você o ancore com um hint — assim uma execução quebrada vira também um achado de acessibilidade.
- **Determinismo por cenário (`network` / `clock`).** Os stubs de requisição `network` e o relógio congelado `clock` que o `windup.config.ts` expõe globalmente também podem viver em **um único cenário** — restritos àquela execução e **mesclados sobre a config global, com o cenário vencendo**. É assim que você testa um estado de erro sem colateral: `{ "scenario_id": "erro-lista-500", "network": [{ "url": "v1/passports", "status": 500 }] }` força um 500 nesse endpoint **só aqui** (os stubs globais continuam valendo; o cenário de listagem normal fica intacto). O `clock` mescla campo a campo (o `now`/`timezone` do cenário sobrescreve o global). Aplicado na criação do contexto, nunca cacheado — o plano é planejado contra a página com stub, então uma asserção sobre a UI de erro é estável. (Um cenário com seu próprio `network`/`clock` pula o prewarming do navegador — o contexto pré-aquecido só carrega a config global.) O erro que um stub produz deliberadamente fica **fora da barreira do `failOn`** — um `500` de stub não dispara `--fail-on-resource`/`--fail-on-5xx`.
- **`failOn` por cenário.** Abra uma exceção de saúde em runtime para **um** cenário em vez de cegar a suíte inteira: `{ "scenario_id": "…", "failOn": { "resourceErrors": false } }`, ou um `"ignore"` restrito ao cenário. Ele é mesclado sobre o `config.failOn` global — as barreiras booleanas assumem o valor do cenário quando definidas, e as listas `ignore` **se concatenam** (o ruído global + o deste cenário). Assim uma URL que você só precisa silenciar em uma listagem deixa de ser uma entrada de `ignore` que todos os outros cenários também carregam.
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
- **Os snapshots de sessão evitam repetir a cadeia (a grande alavanca de velocidade).** Reexecutar um fluxo de login pela UI para cada cenário que depende dele é o custo dominante de tempo real de uma suíte em cache. O Windup captura o **estado de saída** de cada dependência — o `storageState` do Playwright (cookies + localStorage) mais sua URL final — depois que ela roda, e em um replay em cache posterior **restaura esse estado em um contexto novo e pula a reexecução da cadeia `depends_on`** (`deps≈0ms`, reportado como `reused_session_from`). A execução restaurada **ainda é verificada**: se a sessão estiver obsoleta ou não tiver sido totalmente capturada, o Windup descarta o snapshot e **volta a reexecutar a cadeia completa** — sem falso positivo, sem chamada de LLM desperdiçada. Os snapshots ficam em `.windup/state/` (**ignorados pelo git — eles contêm cookies/tokens de autenticação; nunca faça commit deles**).
- **Autorreparação guiada.** Um replanejamento informa ao planejador o seletor exato que falhou ("não o reutilize"), reenfatiza suas dicas e — com `--suggest` — realimenta o replanejamento com o mesmo diagnóstico especializado que você leria, para que ele corrija em vez de repropor um seletor já refutado. Se um cenário continua replanejando sem estabilizar, o Windup avisa que o app provavelmente não tem um seletor estável (uma lacuna de acessibilidade) ou tem uma condição de corrida, em vez de repetir silenciosamente.
- Editar a `task` de um cenário invalida seu plano em cache (um teste reescrito é um teste diferente).

`windup new` lida com dependências das duas formas: `--depends-on login` as declara explicitamente, e **o LLM autor também as sugere por conta própria** — ele vê todos os cenários existentes (id + task) e, quando a instrução pressupõe um estado que um deles produz ("já logado…"), emite `depends_on` automaticamente (filtrado mecanicamente contra ids reais de cenários — nunca inventado).

**Pré-condições de dados (`requires`).** `depends_on` captura uma dependência de *cenário*; `requires` documenta uma de *dados* — os dados de seed (semente) que um cenário assume: `"requires": ["1 active attraction", "a paid order"]`. É declarativo (o Windup o mostra no relatório para que uma falha causada por dados ausentes seja legível, e mapeia o ciclo criar→usar→arquivar) — para de fato semear os dados, use `setup` / `suite.setup`.

**Tags (`tags`).** Marque um cenário com `"tags": ["smoke", "checkout"]` e rode um subconjunto no CI com `run --all --tag smoke` — smoke a cada push, a suíte completa toda noite.

## Reutilização isomórfica de planos (`like`)

Em escala, muitos cenários são o **mesmo fluxo em uma rota/entidade diferente** — criar um contato, criar um negócio, criar uma empresa acionam todos o mesmo formulário. Em vez de pagar uma chamada de planejamento ao LLM para cada um, um cenário pode reutilizar o plano **já comprovado** de outro:

```json
{
  "scenario_id": "deals-create",
  "start_url": "/deals/new",
  "task": "Type 'Big Deal' into the Name field and click Save; verify a new row appears.",
  "like": { "scenario": "contacts-create", "set": { "Alice": "Big Deal" } }
}
```

- `like.scenario` nomeia o cenário cujo plano em cache ativo é o modelo. O Windup o instancia para **este** cenário — este `start_url`, e `like.set` troca quaisquer valores de preenchimento que difiram (`"source literal" → "value to use here"`, aplicado apenas aos campos `value`; os seletores e os segredos `value_ref` ficam intactos).
- O plano reutilizado **ainda é executado e verificado** antes de ser confiado e colocado em cache — exatamente a mesma barreira que todo plano passa. Se as páginas não forem de fato isomórficas (um seletor não corresponde, a verificação falha), o Windup **recorre ao planejamento normal com o LLM**. Ele nunca pula a verificação, então não pode produzir um falso verde silencioso.
- Quando verifica, a execução custou **zero chamadas ao LLM** e o cenário agora tem seu próprio plano em cache; as execuções seguintes são replays `$0` comuns.
- A origem precisa ter sido planejada uma vez primeiro (seu plano é o modelo). Em uma suíte onde a origem roda depois, o cenário `like` simplesmente planeja com o LLM naquela rodada e reutiliza na próxima — sem erro, apenas uma otimização perdida.

Reutilize planos inteiros com `like`; reutilize um **bloco de ações** entre fluxos de resto diferentes com um fragmento (`windup fragment extract`). Ambos mantêm a garantia determinista e verificada.

## Fixtures do lado do cliente (`seed`)

Parte do estado vive inteiramente no navegador — um carrinho em `localStorage`, um dispositivo POS selecionado em `sessionStorage`. Construí-lo pela UI toda vez é lento e acopla o teste a esse fluxo. `seed` injeta esse estado **antes de o plano rodar**, de forma determinista e sem nenhuma chamada ao servidor:

```json
{
  "scenario_id": "cart-updates-quantity",
  "start_url": "/checkout/cart",
  "task": "Increase the first item's quantity to 3 and verify the total updates.",
  "seed": {
    "localStorage": { "cart": "[{\"id\":\"tkt-1\",\"qty\":2,\"price\":50}]" },
    "sessionStorage": { "pos_device": "reader-7" }
  }
}
```

- Semeado por **origem** (padrão: a origem de `start_url`; sobrescreva com `seed.origin`) via um script de inicialização do Playwright que roda antes dos scripts da app, de modo que a página já carrega nesse estado.
- **Cada chave é definida apenas se estiver ausente** — as mutações da própria app (um carrinho que o teste depois edita) nunca são sobrescritas em navegações posteriores.
- **Não** faz parte do plano em cache: roda em toda execução (incluindo replays `$0`), de modo que cenários semeados permanecem deterministas.
- Seguro para CI por construção: você alcança um estado do lado do cliente diretamente em vez de conduzir um fluxo que poderia chegar ao servidor. Ótimo para cenários de carrinho/checkout e POS.

## Idempotência, setup e teardown

Um replay reexecuta o **mesmo plano em cache com os mesmos valores** — ideal para fluxos **idempotentes** (editar um registro fixo para um valor fixo, alternar e checar, ler/listar/filtrar). Ele **não** serve para um **CREATE** puro cujo recurso tem uma chave única não reutilizável: a primeira execução o cria, todo replay viola a restrição. Duas formas de cobrir escritas:

1. **Prefira cenários idempotentes** — edite um registro de teste conhecido em vez de criar um novo; o replay é `$0` e não deixa resíduo.
2. **Hooks `setup` / `teardown`** — comandos de shell que rodam **fora** do plano em cache (ou seja, em todo replay), para fixtures ou limpeza (apagar de vez o que o teste criou, resetar via SQL/HTTP):

```json
{
  "scenario_id": "create-contact",
  "task": "Open Contacts, create a contact with CPF 111.111.111-11 and verify it appears in the list.",
  "setup":    "psql \"$DATABASE_URL\" -c \"delete from contacts where national_id = '11111111111'\"",
  "teardown": "psql \"$DATABASE_URL\" -c \"delete from contacts where national_id = '11111111111'\""
}
```

`setup` roda antes do cenário e de suas dependências (uma falha faz a execução falhar); `teardown` roda depois, **sempre** — passando ou falhando (uma falha é um aviso). São seus próprios comandos confiáveis (como o `beforeEach`/`afterEach` de um teste), rodam na raiz do projeto com o env do processo, e nunca entram no plano ou no cache.

Para o estado compartilhado por toda a suíte (semear um banco de dados de fixtures uma vez, iniciar um stub), use `suite.setup` / `suite.teardown` na [configuração](/configuration/) — eles rodam **uma vez** ao redor de `run --all` (o análogo de `beforeAll`/`afterAll`), enquanto os hooks por cenário cuidam do estado por teste.
## Não escreva cenários à mão

Dois jeitos de criar um cenário sem escrever JSON:

- **[Autoria com `windup new`](/pt/docs/authoring)** — dê uma instrução vaga e o LLM escreve um cenário preciso e verificável a partir das telas reais do seu app.
- **[`windup record`](/pt/docs/record)** — autoria por demonstração: dirija um navegador headful, marque o que verificar, finalize. O Windup escreve o cenário e cacheia o plano gravado para um replay $0.
