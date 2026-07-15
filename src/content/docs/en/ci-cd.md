---
title: CI / CD
description: Run the whole suite in one warm browser, fail the build on any failing scenario, and emit JUnit, JSON or self-contained HTML reports.
---

# CI / CD

```bash
npx windup run --all --reporter junit --report-file reports/windup.xml
```

- `--all` runs every scenario in the directory (one warm browser for the whole suite).
- Exit code is non-zero when any scenario fails.
- `--concurrency <n>` runs scenarios in parallel over one shared warm browser (~2× faster on a mixed suite); `--browser firefox|webkit` runs the suite cross-browser.
- `--reporter junit` emits JUnit XML (GitHub Actions, GitLab and Jenkins consume it natively); `--reporter json` emits a machine-readable summary; `--reporter html` emits a self-contained human-friendly page (zero JS/deps — upload it as a CI artifact or open locally). Default output: `.windup/reports/`.
- `windup costs --json` reports AI spend for pipeline tracking.

## Example: GitHub Actions

```yaml
- run: npm ci && npx playwright install chromium
- run: npx windup run --all --base-url http://localhost:8080 --reporter junit --report-file reports/windup.xml
  env:
    GOOGLE_GENERATIVE_AI_API_KEY: ${{ secrets.GEMINI_KEY }}
- uses: dorny/test-reporter@v1
  if: always()
  with: { name: windup, path: reports/windup.xml, reporter: java-junit }
```
