---
title: CI / CD
description: Rode a suíte inteira em um navegador aquecido, faça o build falhar em qualquer cenário que falhar e gere relatórios JUnit, JSON ou HTML autocontido.
---

# CI / CD

```bash
npx windup run --all --reporter junit --report-file reports/windup.xml
```

- `--all` roda todos os cenários do diretório (um navegador aquecido para a suíte inteira).
- **Resumo da suíte e agrupamento por módulo.** `--all` imprime uma linha de suíte — taxa de aprovação, taxa de acerto de cache, re-planejamentos, chamadas de LLM, custo, tempo total — mais um detalhamento por **módulo** (pasta). O relatório HTML agrupa os cenários por módulo (com blocos de acerto de cache / re-planejamento); o JUnit emite um `<testsuite>` por módulo; o JSON carrega o resumo completo (`by_module`, `flaky`) e um `module` por caso.
- **Pontuação de flakiness.** `--repeat <n>` é agregado por cenário — um cenário que passa em algumas mas não em todas as execuções é listado como flaky (`passed X/N`), então flakiness dependente de dados aparece antes de você commitar um verde.
- O código de saída é diferente de zero quando qualquer cenário falha.
- `--concurrency <n>` roda cenários em paralelo em um único navegador aquecido compartilhado (~2× mais rápido em uma suíte mista); `--browser firefox|webkit` roda a suíte em multi-navegador.
- **Execuções incrementais (`--changed` / `--since <ref>`).** Com `--all`, roda apenas os cenários que uma mudança afeta: `--changed` compara a árvore de trabalho com `HEAD`, `--since main` (ou qualquer ref do git) com essa ref. Um cenário é selecionado quando seu próprio arquivo mudou, quando não tem um plano em cache, ou quando seu plano visita uma rota cuja **fonte indexada** mudou (a atribuição arquivo→rota do mapa do site). É sólido, porém grosseiro, e **nunca um falso verde silencioso**: se o diff toca arquivos que o mapa não consegue atribuir a uma rota (código compartilhado, configuração), ou não há git/mapa do site, o Windup roda a suíte inteira e imprime o porquê. Mantenha a atribuição em dia com `windup scan`; use `--all` puro para um portão completo pré-merge/noturno.
- `--reporter junit` gera JUnit XML (GitHub Actions, GitLab e Jenkins consomem nativamente); `--reporter json` gera um resumo legível por máquina; `--reporter html` gera uma página autocontida e amigável para humanos (zero JS/dependências — suba como artefato de CI ou abra localmente). Saída padrão: `.windup/reports/`.
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
