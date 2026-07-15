---
title: CI / CD
description: Rode a suíte inteira em um navegador aquecido, faça o build falhar em qualquer cenário que falhar e gere relatórios JUnit, JSON ou HTML autocontido.
---

# CI / CD

```bash
npx windup run --all --reporter junit --report-file reports/windup.xml
```

- `--all` roda todos os cenários do diretório (um navegador aquecido para a suíte inteira).
- O código de saída é diferente de zero quando qualquer cenário falha.
- `--concurrency <n>` roda cenários em paralelo em um único navegador aquecido compartilhado (~2× mais rápido em uma suíte mista); `--browser firefox|webkit` roda a suíte em multi-navegador.
- `--reporter junit` gera JUnit XML (GitHub Actions, GitLab e Jenkins consomem nativamente); `--reporter json` gera um resumo legível por máquina; `--reporter html` gera uma página autocontida e amigável para humanos (zero JS/dependências — suba como artefato de CI ou abra localmente). Saída padrão: `.windup/reports/`.
- `windup costs --json` reporta o gasto com IA para rastreamento no pipeline.

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
