---
title: CI / CD
description: Rode a suíte inteira em um navegador aquecido, faça o build falhar em qualquer cenário que falhar e gere relatórios JUnit, JSON ou HTML autocontido.
---

# CI / CD

```bash
npx windup run --all --reporter junit --report-file reports/windup.xml
```

- `--all` roda todos os cenários do diretório (um navegador aquecido para a suíte inteira).
- **Resumo da suíte e agrupamento por módulo.** `--all` imprime uma linha de suíte — taxa de aprovação, taxa de acerto de cache, re-planejamentos, chamadas de LLM, custo e **tempo de parede** (wall-clock, tempo real decorrido; a soma inflada dos totais é exibida ao lado junto com a concorrência, p. ex. `wall 130s (sum 512s · concurrency 4)`) — mais um detalhamento por **módulo** (pasta). O relatório HTML agrupa os cenários por módulo (com blocos de acerto de cache / re-planejamento), lidera com o tempo de parede, e dá a cada cenário uma barra de detalhamento de duração que reconcilia com seu total; o JUnit emite um `<testsuite>` por módulo; o JSON carrega o resumo completo (`wall_ms`, `concurrency`, `by_module`, `flaky`) e um `duration_breakdown` por caso.
- **Pontuação de flakiness + dica de causa raiz.** `--repeat <n>` é agregado por cenário — um cenário que passa em algumas mas não em todas as execuções é listado como flaky (`passed X/N`), com uma **dica** da causa provável lida de suas execuções (deriva da assinatura da página inicial → corrida de hidratação; uma falha de rede; sempre-a-mesma-ação → um seletor instável; rotação de cache → replay não determinista), então flakiness dependente de dados aparece e aponta para algum lugar antes de você commitar um verde.
- **Repetir um flake — `--retries N`.** Roda de novo um cenário que falhou de forma **transitória** (um reset de rede, uma falha de verificação por corrida de hidratação, um `setup`/`dependency` instável) até N vezes a mais — o primeiro passe vence. Um bloqueio de `config.forbid` **nunca** é repetido (uma guarda deliberada, não um flake). O flake é **exposto, não escondido**: um cenário que só fica verde numa repetição é marcado `flaky` (`↻ N passed only on retry` no console, um selo `FLAKY N×` no relatório HTML, `flaky`/`attempts` no JSON e no stream `run:end`) — para você corrigir a causa raiz em vez de maquiar um build vermelho de verde.
- **Orçamento de tempo — `--all --max-wall <seconds>`.** Uma barreira: quando o relógio de parede da suíte ultrapassa o teto, o Windup **para de iniciar novos cenários** (os em andamento terminam — nada é cancelado no meio) e **sai com código diferente de zero**, então uma suíte descontrolada faz o build falhar em vez de travar o runner. Funciona no sequencial e com `--concurrency`. Imprime `⏱ --max-wall Ns exceeded — X/Y ran, Z not started`.
- **Falhar rápido — `--all --bail`.** Para de iniciar novos cenários após a **primeira falha** — feedback rápido num check de PR em vez de esperar a suíte inteira. Completa o trio de barreiras com `--retries`/`--max-wall`; funciona no sequencial e com `--concurrency`.
- **Sharding — `--all --shard i/n`.** Roda o shard *i* de *n* (divisão round-robin) para distribuir uma suíte grande entre runners de CI em paralelo (`--shard 1/4`, `--shard 2/4`, …), cada um um job separado.
- **Tags — `--all --tag <names>`.** Marque cenários com tags (`"tags": ["smoke", "checkout"]`) e rode um subconjunto: `--tag smoke,checkout` roda qualquer cenário que carregue uma dessas tags. Rode smoke a cada push e a suíte completa toda noite — compõe com `--shard` e `--changed`.
- **Trace + captura de tela na falha — `--trace`.** Quando um cenário falha, o Windup salva um **trace do Playwright** (`.windup/reports/traces/<id>.zip` — abra-o no visualizador de trace do Playwright: snapshots do DOM, rede e console por passo) mais uma **captura de tela** de página inteira, e o relatório HTML enlaça ambos a partir da linha que falhou. Veja exatamente o que aconteceu no CI em vez de adivinhar pelos tempos. (Capturado apenas na falha — uma execução que passa não guarda nada.)
- **Saída para GitHub Actions — `--github`** (ativado automaticamente quando `GITHUB_ACTIONS=true`). Emite uma anotação `::error::` por cenário que falha (exibida inline no PR) e escreve um resumo da suíte em Markdown + uma tabela por cenário na página do job (`$GITHUB_STEP_SUMMARY`) — os resultados aparecem sem abrir um artefato.
- **Acessibilidade — `--a11y`.** Após cada cenário, roda uma auditoria com [axe-core](https://github.com/dequelabs/axe-core) na página final e reporta as violações — uma checagem de acessibilidade gratuita sobre infraestrutura que o Windup já tem. Informativa (nunca faz a execução falhar); dependência opcional opt-in (`npm i -D axe-core`).
- **`windup doctor`** é uma verificação prévia (preflight) — chave do LLM, navegador, os cenários parseiam, sem fragmentos órfãos, mapa do site escaneado — para pegar os típicos problemas de «vai quebrar no CI» antes de o pipeline rodar.
- O código de saída é diferente de zero quando qualquer cenário falha.
- `--concurrency <n>` roda cenários em paralelo em um único navegador aquecido compartilhado (~2× mais rápido em uma suíte mista); `--browser firefox|webkit` roda a suíte em multi-navegador.
- **Execuções incrementais (`--changed` / `--since <ref>`).** Com `--all`, roda apenas os cenários que uma mudança afeta: `--changed` compara a árvore de trabalho com `HEAD`, `--since main` (ou qualquer ref do git) com essa ref. Um cenário é selecionado quando seu próprio arquivo mudou, quando não tem um plano em cache, ou quando seu plano visita uma rota cuja **fonte indexada** mudou (a atribuição arquivo→rota do mapa do site). É sólido, porém grosseiro, e **nunca um falso verde silencioso**: se o diff toca arquivos que o mapa não consegue atribuir a uma rota (código compartilhado, configuração), ou não há git/mapa do site, o Windup roda a suíte inteira e imprime o porquê. Mantenha a atribuição em dia com `windup scan`; use `--all` puro para um portão completo pré-merge/noturno.
- `--reporter junit` gera JUnit XML (GitHub Actions, GitLab e Jenkins consomem nativamente); `--reporter json` gera um resumo legível por máquina; `--reporter html` gera uma página autocontida e amigável para humanos (zero JS/dependências — suba como artefato de CI ou abra localmente). Saída padrão: `.windup/reports/`. A lista de ações por cenário do relatório HTML mostra o **tipo e o alvo** de cada passo (`a4 · fill · otp`, `a2 · click · Add to cart`, `a1 · goto · →/checkout`) — o valor de um fill nunca é exibido (segredos/OTP ficam de fora).
- `windup costs --json` reporta o gasto com IA para rastreamento no pipeline.
- `--stream` emite **NDJSON** no stdout — um evento por marco (`run:start`, `planning`, `plan`, `action`, `replan`, `run:end`) — para CI ou dashboard acompanharem a execução ao vivo. O progresso humano (`--verbose`) vai para o stderr, mantendo o stdout NDJSON puro.

## Testes não destrutivos — fique no limite do efeito colateral

Uma suíte que roda a **cada push** nunca deve cobrar um cartão, enviar um email/OTP, criar uma conta ou mutar estado persistente. A regra confiável: **teste até o limite de um efeito colateral, e pare ali.** Quase toda tela é coberta assim — as verificações valiosas disparam *antes* da chamada de rede:

- **Validação do lado do cliente** — email/CPF/cartão inválido, campos obrigatórios, valores fora do intervalo. A mensagem aparece *antes* de qualquer requisição, então afirmá-la é seguro.
- **Telas de navegação e de leitura** — listas, filtros, abas, telas de detalhe, estados vazios.
- **Estado do lado do cliente via [`seed`](/scenarios/)** — quantidades/remoção/limites do carrinho (localStorage), um dispositivo POS (sessionStorage) — alcançado sem uma ida e volta ao servidor.
- **Estados de erro por tokens/slugs falsos** — `/order/BOGUS` → "não encontrado", um link inválido → "expirado". Totalmente determinista, sem necessidade de dados de seed.
- **Diálogos de confirmação — abra e *cancele*.** Afirme que o diálogo "Excluir?" aparece, então descarte-o (um `confirm` nativo via `"dialog": "dismiss"`; um modal clicando em Cancelar). Você verifica a UI de guarda sem realizar a ação destrutiva.

Mantenha fora do CI: pagamento real, envios de OTP/email/WhatsApp, criação de conta/empresa, salvar configuração que persiste (**cuidado com os toggles de clique único que salvam sem etapa de confirmação**), um check-in que consome um voucher, e — o mais perigoso de todos — **mudar a senha da conta de teste**. O Windup não vai impedir você de escrever tal passo, então a disciplina vive nos cenários: cada um para antes da ação irreversível. `setup`/`teardown` existem para as escritas que você genuinamente precisa exercitar — faça-as contra um fixture descartável, nunca dados de produção.

## Exemplo: GitHub Actions

```yaml
- run: npm ci && npx playwright install chromium
- run: npx windup run --all --base-url http://localhost:8080 --reporter junit --report-file reports/windup.xml
  env:
    GOOGLE_GENERATIVE_AI_API_KEY: ${{ secrets.GEMINI_KEY }}
- uses: dorny/test-reporter@v1
  if: always()
  with: { name: windup, path: reports/windup.xml, reporter: java-junit }
```
