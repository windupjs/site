---
title: Commands
description: The full Windup CLI reference — every command, the run flags, and the opt-in AI debrief (--summary) and fix-suggestion (--suggest) helpers.
---

# Commands

| Command | Description |
|---|---|
| `windup init` | Create `windup.config.ts`, `.windup/` (gitignored) and an example scenario |
| `windup new "<instruction>" [--id x] [--force] [--depends-on ids] [--validate]` | Generate a scenario from a rough instruction; `--validate` runs and refines it until it passes (≤3 attempts) |
| `windup run [scenario]` | Run one scenario (replay when cached, plan on miss) |
| `windup run --all` | Run every scenario — CI mode |
| `windup scan [--update] [--no-assist]` | Statically index routes and interactive elements into the site map; `--update` re-indexes only files changed since the last scan (git diff); `--no-assist` skips the LLM layer (zero cost) |
| `windup costs [--last n] [--days n] [--json]` | AI usage report from the run ledger: totals, free replays, per-provider, per-model and per-scenario breakdown, scan and authoring spend |
| `windup status` | Site-map pages by source, staleness, cached scenarios, fragments |
| `windup coverage [--json]` | Cross-reference indexed routes (`windup scan`) with your scenarios — which routes have a scenario and which have none (finds coverage gaps automatically, no LLM) |
| `windup doctor` | Preflight checks — LLM key for the provider, browser installed, scenarios parse, no orphaned fragment references, site map scanned, `config.network`/`clock` well-formed. No browser/LLM/network; non-zero exit on a hard problem |
| `windup why <scenario> [--json]` | Diagnose one scenario: cache state (replay-ready or will-plan), re-plan churn, `depends_on` chain, run history and the last failure — all from the ledger, no LLM |
| `windup explain <scenario> [--json]` | Print the cached plan as readable steps (go to / click / fill / verify). Review a plan without opening the JSON; a fill's secret value is never shown |
| `windup diff <scenario> [--json]` | Compare a scenario's two most recent runs — result flip, cache, and Δ time / Δ cost / Δ actions (a regression check) |
| `windup badge [--json] [--out <path>]` | Suite-status badge from each scenario's latest run — a self-contained SVG (`N/M passing · $0`) or a shields.io endpoint JSON |
| `windup fragment extract <scenario> <a1..aN> --id <id> --description <text>` | Promote a slice of a cached plan to a reusable fragment |
| `windup secret set <account> [--user u] [--password p]` | Register test credentials: values → `.env.local`, mapping → `windup.credentials.json` |
| `windup secret list` | Accounts + whether each ENV is set (never prints values) |
| `windup secret remove <account>` | Remove an account: drops the mapping and its `.env.local` values (alias: `rm`) |
| `windup sig <url> [--repeat n]` | Structural page signature (diagnostics) |
| `windup bench <scenario>` | Full validation protocol (generation, replay determinism, failure recovery) |
| `windup cache clear` | Drop the trajectory cache (next runs re-plan) |

### `run` flags

| Flag | What it does |
|---|---|
| `--all` | Run every scenario in the directory — CI mode, one warm browser for the whole suite. Non-zero exit code if any scenario fails. |
| `--concurrency <n>` | Run up to `n` scenarios in parallel over one shared warm browser with isolated contexts — ~2× faster on a mixed suite. Sequential by default. |
| `--shard <i/n>` | With `--all`: run shard *i* of *n* (round-robin split of the scenario list) — spread a big suite across parallel CI runners (`--shard 1/4`, `--shard 2/4`, …), each a separate job. |
| `--retries <n>` | Re-run a scenario that failed a **transient** way (network reset, hydration-race verification miss, wobbly `setup`/`dependency`) up to `n` extra times — first pass wins. A `config.forbid` block is never retried. A scenario that passes only on a retry is flagged `flaky` (console `↻`, `FLAKY n×` badge in the HTML report, `flaky`/`attempts` in JSON and the `run:end` stream) — surfaced, not swallowed. |
| `--max-wall <seconds>` | With `--all`: a suite **time budget**. Once the wall-clock crosses the cap, stop starting new scenarios (in-flight ones finish) and exit non-zero — a runaway suite fails the build instead of hanging the runner. Works sequentially and under `--concurrency`. |
| `--bail` | With `--all`: stop starting new scenarios after the **first failure** — fast PR-check feedback. Completes the guard-rail trio with `--retries`/`--max-wall`; works sequentially and under `--concurrency`. |
| `--a11y` | After each scenario, run an [axe-core](https://github.com/dequelabs/axe-core) accessibility audit on the final page and report violations. Informational — never fails the run. Opt-in optional dependency: `npm i -D axe-core`. |
| `--tag <names>` | With `--all`: run only scenarios carrying any of these tags (comma-separated, e.g. `smoke,checkout`). Composes with `--shard` and `--changed`. |
| `--trace` | On a **failed** scenario, save a Playwright trace (`.windup/reports/traces/<id>.zip`, openable in the trace viewer) + a full-page screenshot; the HTML report links both. Captured only on failure. |
| `--github` | Emit GitHub Actions `::error::` annotations for failures + a Markdown job summary to `$GITHUB_STEP_SUMMARY`. Auto-on when `GITHUB_ACTIONS=true`. |
| `--watch` | Re-run a single scenario whenever its file changes — a fast authoring loop. |
| `--changed` / `--since <ref>` | With `--all`: run only the scenarios a change affects — `--changed` diffs the working tree against `HEAD`, `--since main` (or any git ref) against that ref. A scenario runs when its file changed, when it has no cached plan, or when its plan visits a route whose indexed source changed. Falls back to the full suite when impact can't be proven (unattributed files, no git/site map) — never a silent false green; an empty affected set exits 0. |
| `--no-cache` | Ignore the cached plan and re-plan from scratch (forces one LLM call), even when a valid trajectory exists. Use to regenerate a plan on purpose. |
| `--no-map` | Plan without the site-map graph — skip the indexed routes and selectors. Useful for debugging the planner or a brand-new environment. |
| `--repeat <n>` | Run the scenario `n` times back-to-back over the same warm browser — stability and flake checks. |
| `--verbose` | Print planning/execution milestones to stderr — a heartbeat for slow providers (e.g. `--llm claude-code`, where planning can take minutes with no output). |
| `--stream` | Emit machine-readable NDJSON events (one per milestone: `run:start`, `planning`, `plan`, `action`, `replan`, `run:end`) to stdout for CI/dashboards; `--verbose` stays on stderr so stdout is pure NDJSON. |
| `--headed` | Show the browser window instead of running headless. |
| `--slowmo <ms>` | Add a delay between actions so you can watch each step — demo and debugging pace. |
| `--base-url <url>` | Override the start-URL origin for this run (dev / staging / CI). Rebases even absolute scenario URLs, preserving path and query. |
| `--browser chromium\|firefox\|webkit` | Run on the chosen engine (default Chromium). The same plan replays across all three — author once, run everywhere. |
| `--llm <provider[:model]>` | Pick the planner LLM for this run (e.g. `openai:gpt-5-mini`). Only affects planning; cached replays never call an LLM. |
| `--summary` | After the run, one extra LLM call writes a human-readable debrief quoting real values observed on the final page. Off by default so replays stay $0. |
| `--suggest` | On a **failed** run, one extra LLM call proposes a concrete fix to the scenario. Fires only on failure. |
| `--reporter junit\|json\|html` | Emit a CI report — JUnit XML, a machine-readable JSON summary, or a self-contained HTML page. |
| `--report-file <path>` | Write the report to a specific path (default `.windup/reports/`). |

## AI debrief (`--summary`)

For humans reading results (not CI), `--summary` adds one LLM call after each run that writes a short debrief: what the test did, the outcome, **concrete values observed on the final page** (prices, messages, product names — quoted literally from the page), and any difficulties (slow steps, re-planning, failures). It prints in the terminal, lands in the run ledger, and shows as a highlighted block in the HTML/JSON reports.

```bash
npx windup run checkout --summary --reporter html
# summary: "The test logged in and completed checkout for 3 items; the
#  confirmation page showed 'Thank you for your order'. Prices observed: ..."
```

Off by default on purpose — cached replays stay at zero LLM calls and $0. The debrief cost (~$0.0005 on the default model) is tracked separately in the run metrics and included in `estimated_cost_usd`.

## Fix suggestions on failure (`--suggest`)

When a run **fails**, `--suggest` adds one LLM call that acts as a senior QA engineer debugging it: it compares the executed plan and the failing step against the **real final page** and the site map's known selectors, then proposes a concrete fix to the scenario — the wrong selector and the real one, a targeted screen that doesn't hold what the task expects, a missing step, or a timeout too short for a slow page.

```bash
npx windup run create-invoice --suggest
# FAIL  create-invoice  ... element button:has-text('Save') not visible
#   suggested fix: The 'Save' button does not exist; the dialog's real button
#   is labeled 'Create'. Change the hint to button:has-text('Create').
```

It turns a red run into a specific edit — instead of reverse-engineering the app by hand. Only fires on failure (green runs cost nothing), never edits the scenario itself, and shows as a highlighted block in the HTML/JSON reports. Pairs naturally with `--summary`.
