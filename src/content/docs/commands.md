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
| `windup fragment extract <scenario> <a1..aN> --id <id> --description <text>` | Promote a slice of a cached plan to a reusable fragment |
| `windup secret set <account> [--user u] [--password p]` | Register test credentials: values → `.env.local`, mapping → `windup.credentials.json` |
| `windup secret list` | Accounts + whether each ENV is set (never prints values) |
| `windup sig <url> [--repeat n]` | Structural page signature (diagnostics) |
| `windup bench <scenario>` | Full validation protocol (generation, replay determinism, failure recovery) |
| `windup cache clear` | Drop the trajectory cache (next runs re-plan) |

**`run` flags:** `--all` · `--concurrency <n>` (parallel) · `--no-cache` · `--no-map` · `--repeat <n>` · `--headed` (show the browser) · `--slowmo <ms>` (demo pace) · `--base-url <url>` · `--browser chromium|firefox|webkit` · `--llm <provider[:model]>` · `--summary` (AI debrief) · `--suggest` (fix hint on failure) · `--reporter junit|json|html` · `--report-file <path>`

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
