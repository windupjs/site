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
- `--reporter junit` gera JUnit XML (GitHub Actions, GitLab e Jenkins consomem nativamente); `--reporter json` gera um resumo legível por máquina; `--reporter html` gera uma página autocontida e amigável para humanos (zero JS/dependências — suba como artefato de CI ou abra localmente). Saída padrão: `.windup/reports/`.
- `windup costs --json` reporta o gasto com IA para rastreamento no pipeline.
- `--stream` emite **NDJSON** no stdout — um evento por marco (`run:start`, `planning`, `plan`, `action`, `replan`, `run:end`) — para CI ou dashboard acompanharem a execução ao vivo. O progresso humano (`--verbose`) vai para o stderr, mantendo o stdout NDJSON puro.

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
