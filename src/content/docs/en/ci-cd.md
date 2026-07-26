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
- **Retry a flake — `--retries N`.** Re-run a scenario that failed a **transient** way (a network reset, a hydration-race verification miss, a wobbly `setup`/`dependency`) up to N extra times — the first pass wins. A `config.forbid` block is **never** retried (a deliberate guard, not a flake). The flake is **surfaced, not swallowed**: a scenario that only goes green on a retry is flagged `flaky` (`↻ N passed only on retry` on the console, a `FLAKY N×` badge in the HTML report, `flaky`/`attempts` in JSON and the `run:end` stream) — so you fix the root cause instead of laundering a red build green.
- **Time budget — `--all --max-wall <seconds>`.** A guard-rail: once the suite's wall-clock crosses the cap, Windup **stops starting new scenarios** (in-flight ones finish — nothing is cancelled mid-run) and **exits non-zero**, so a runaway suite fails the build instead of hanging the runner. Works sequentially and under `--concurrency`. Prints `⏱ --max-wall Ns exceeded — X/Y ran, Z not started`.
- **Fail fast — `--all --bail`.** Stop starting new scenarios after the **first failure** — quick feedback in a PR check instead of waiting out the whole suite. Completes the guard-rail trio with `--retries`/`--max-wall`; works sequentially and under `--concurrency`.
- **Sharding — `--all --shard i/n`.** Run shard *i* of *n* (round-robin split) to spread a big suite across parallel CI runners (`--shard 1/4`, `--shard 2/4`, …), each a separate job.
- **Tags — `--all --tag <names>`.** Tag scenarios (`"tags": ["smoke", "checkout"]`) and run a subset: `--tag smoke,checkout` runs any scenario carrying one of those tags. Run smoke on every push, the full suite nightly — composes with `--shard` and `--changed`.
- **Trace + screenshot on failure — `--trace`.** When a scenario fails, Windup saves a **Playwright trace** (`.windup/reports/traces/<id>.zip` — open it in the Playwright trace viewer: DOM snapshots, network and console per step) plus a full-page **screenshot**, and the HTML report links both from the failed row. See exactly what happened in CI instead of guessing from timings. (Captured only on failure — a passing run keeps nothing.)
- **GitHub Actions output — `--github`** (auto-on when `GITHUB_ACTIONS=true`). Emits a `::error::` annotation per failed scenario (shown inline on the PR) and writes a Markdown suite summary + per-scenario table to the job page (`$GITHUB_STEP_SUMMARY`) — results surface without opening an artifact.
- **Accessibility — `--a11y`.** After each scenario, run an [axe-core](https://github.com/dequelabs/axe-core) audit on the final page and report violations — a free a11y check on infra Windup already has. Informational (never fails the run); opt-in optional dependency (`npm i -D axe-core`).
- **`windup doctor`** is a preflight — LLM key, browser, scenarios parse, no orphaned fragments, site map scanned — to catch the common "it'll break in CI" problems before the pipeline runs.
- Exit code is non-zero when any scenario fails.
- `--concurrency <n>` runs scenarios in parallel over one shared warm browser (~2× faster on a mixed suite); `--browser firefox|webkit` runs the suite cross-browser.
- **Incremental runs (`--changed` / `--since <ref>`).** With `--all`, run only the scenarios a change affects: `--changed` diffs the working tree against `HEAD`, `--since main` (or any git ref) against that ref. A scenario is selected when its own file changed, when it has no cached plan, or when its plan visits a route whose **indexed source** changed (the site map's file→route attribution). It's sound-but-coarse and **never a silent false green**: if the diff touches files the map can't attribute to a route (shared code, config), or there's no git/site map, Windup runs the whole suite and prints why. Keep the attribution current with `windup scan`; use plain `--all` for a full pre-merge/nightly gate.
- `--reporter junit` emits JUnit XML (GitHub Actions, GitLab and Jenkins consume it natively); `--reporter json` emits a machine-readable summary; `--reporter html` emits a self-contained human-friendly page (zero JS/deps — upload it as a CI artifact or open locally). Default output: `.windup/reports/`. The HTML report's per-scenario action list shows each step's **type and target** (`a4 · fill · otp`, `a2 · click · Add to cart`, `a1 · goto · →/checkout`) — a fill's value is never shown (secrets/OTP stay out).
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
