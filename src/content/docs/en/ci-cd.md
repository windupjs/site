---
title: CI / CD
description: Run the whole suite in one warm browser, fail the build on any failing scenario, and emit JUnit, JSON or self-contained HTML reports.
---

# CI / CD

```bash
npx windup run --all --reporter junit --report-file reports/windup.xml
```

- `--all` runs every scenario in the directory (one warm browser for the whole suite).
- **Suite summary & module grouping.** `--all` prints a suite line — pass rate, cache-hit rate, re-plans, LLM calls, cost, and **wall-clock time** (real elapsed; the inflated sum-of-totals is shown alongside with the concurrency, e.g. `wall 130s (sum 512s · concurrency 4)`) — plus a per-**module** (folder) breakdown. The HTML report groups scenarios by module (with cache-hit / re-plan tiles), leads with the wall-clock, and gives each scenario a duration breakdown bar that reconciles to its total; JUnit emits one `<testsuite>` per module; JSON carries the full summary (`wall_ms`, `concurrency`, `by_module`, `flaky`) and a per-case `duration_breakdown`.
- **Flake score + root-cause hint.** `--repeat <n>` is aggregated per scenario — one that passes some-but-not-all of its runs is listed flaky (`passed X/N`), with a **hint** at the likely cause read from its runs (start-page signature drift → hydration race; a network failure; always-same-action → an unstable selector; cache churn → non-deterministic replay), so data-dependent flakiness surfaces and points somewhere before you commit a green.
- **Sharding — `--all --shard i/n`.** Run shard *i* of *n* (round-robin split) to spread a big suite across parallel CI runners (`--shard 1/4`, `--shard 2/4`, …), each a separate job.
- **Accessibility — `--a11y`.** After each scenario, run an [axe-core](https://github.com/dequelabs/axe-core) audit on the final page and report violations — a free a11y check on infra Windup already has. Informational (never fails the run); opt-in optional dependency (`npm i -D axe-core`).
- **`windup doctor`** is a preflight — LLM key, browser, scenarios parse, no orphaned fragments, site map scanned — to catch the common "it'll break in CI" problems before the pipeline runs.
- Exit code is non-zero when any scenario fails.
- `--concurrency <n>` runs scenarios in parallel over one shared warm browser (~2× faster on a mixed suite); `--browser firefox|webkit` runs the suite cross-browser.
- **Incremental runs (`--changed` / `--since <ref>`).** With `--all`, run only the scenarios a change affects: `--changed` diffs the working tree against `HEAD`, `--since main` (or any git ref) against that ref. A scenario is selected when its own file changed, when it has no cached plan, or when its plan visits a route whose **indexed source** changed (the site map's file→route attribution). It's sound-but-coarse and **never a silent false green**: if the diff touches files the map can't attribute to a route (shared code, config), or there's no git/site map, Windup runs the whole suite and prints why. Keep the attribution current with `windup scan`; use plain `--all` for a full pre-merge/nightly gate.
- `--reporter junit` emits JUnit XML (GitHub Actions, GitLab and Jenkins consume it natively); `--reporter json` emits a machine-readable summary; `--reporter html` emits a self-contained human-friendly page (zero JS/deps — upload it as a CI artifact or open locally). Default output: `.windup/reports/`.
- `windup costs --json` reports AI spend for pipeline tracking.
- `--stream` emits **NDJSON** to stdout — one event per milestone (`run:start`, `planning`, `plan`, `action`, `replan`, `run:end`) — so CI or a dashboard can follow a run live. Human progress (`--verbose`) goes to stderr, keeping stdout pure NDJSON.

## Non-destructive testing — stay at the side-effect boundary

A suite that runs on **every push** must never charge a card, send an email/OTP, create an account, or mutate persistent state. The reliable rule: **test up to the boundary of a side effect, and stop there.** Almost every screen is coverable this way — the valuable checks fire *before* the network call:

- **Client-side validation** — invalid email/CPF/card, required fields, out-of-range values. The message appears *before* any request, so asserting it is safe.
- **Navigation & read screens** — lists, filters, tabs, detail views, empty states.
- **Client-side state via [`seed`](/scenarios/)** — cart quantities/removal/limits (localStorage), a POS device (sessionStorage) — reached without a server round-trip.
- **Error states from bogus tokens/slugs** — `/order/BOGUS` → "not found", an invalid link → "expired". Fully deterministic, no seed data needed.
- **Confirmation dialogs — open and *cancel*.** Assert the "Delete?" dialog appears, then dismiss it (a native `confirm` via `"dialog": "dismiss"`; a modal by clicking Cancel). You verify the guard UI without performing the destructive action.

Keep out of CI: real payment, OTP/email/WhatsApp sends, account/company creation, saving config that persists (**watch single-click toggles that save with no confirm step**), a check-in that consumes a voucher, and — most dangerous of all — **changing the test account's password**. Windup won't stop you from authoring such a step, so the discipline lives in the scenarios: every one stops before the irreversible action. `setup`/`teardown` exist for the writes you genuinely must exercise — do them against a disposable fixture, never production data.

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
