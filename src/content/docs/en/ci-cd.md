---
title: CI / CD
description: Run the whole suite in one warm browser, fail the build on any failing scenario, and emit JUnit, JSON or self-contained HTML reports.
---

# CI / CD

```bash
npx windup run --all --reporter junit --report-file reports/windup.xml
```

- `--all` runs every scenario in the directory (one warm browser for the whole suite).
- **Suite summary & module grouping.** `--all` prints a suite line — pass rate, cache-hit rate, re-plans, LLM calls, cost, total time — plus a per-**module** (folder) breakdown. The HTML report groups scenarios by module (with cache-hit / re-plan tiles); JUnit emits one `<testsuite>` per module; JSON carries the full summary (`by_module`, `flaky`) and a `module` per case.
- **Flake score.** `--repeat <n>` is aggregated per scenario — one that passes some-but-not-all of its runs is listed flaky (`passed X/N`), so data-dependent flakiness surfaces before you commit a green.
- Exit code is non-zero when any scenario fails.
- `--concurrency <n>` runs scenarios in parallel over one shared warm browser (~2× faster on a mixed suite); `--browser firefox|webkit` runs the suite cross-browser.
- `--reporter junit` emits JUnit XML (GitHub Actions, GitLab and Jenkins consume it natively); `--reporter json` emits a machine-readable summary; `--reporter html` emits a self-contained human-friendly page (zero JS/deps — upload it as a CI artifact or open locally). Default output: `.windup/reports/`.
- `windup costs --json` reports AI spend for pipeline tracking.
- `--stream` emits **NDJSON** to stdout — one event per milestone (`run:start`, `planning`, `plan`, `action`, `replan`, `run:end`) — so CI or a dashboard can follow a run live. Human progress (`--verbose`) goes to stderr, keeping stdout pure NDJSON.

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
