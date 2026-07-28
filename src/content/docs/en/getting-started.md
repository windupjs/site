---
title: Getting started
description: Install Windup, initialize a project, and go from a rough instruction to a deterministic replaying test in five commands.
---

# Getting started

**Natural-language E2E tests with deterministic replay — the LLM plans once, replays run without it.**

Describe a test in plain language — *"log in as the test account, add product X to the cart, check out and verify the order confirmation"* — and Windup turns it into a deterministic JSON plan of browser actions. From the second run on, the test replays **with zero LLM calls**: ~1 second, $0, stable results.

```bash
npm i -D windupjs        # Chromium is provisioned automatically (one-time, machine-wide cache)
npx windup init          # 3 questions → windup.config.ts + example scenario
npx windup scan          # index your app's routes & elements from source code
npx windup new "log in as admin and create an invoice"   # LLM-assisted scenario authoring
npx windup run checkout  # 1st run: the LLM plans · every run after: ~1s replay, $0
```

## Requirements

- **Node ≥ 20.**
- An **API key** for your planner LLM in `.env.local` or `.env` (`.env.local` wins — use it when your `.env` is committed): `GOOGLE_GENERATIVE_AI_API_KEY` for Google (default) or `OPENAI_API_KEY` for OpenAI.

Keys are only used for planning; cached replays never call an LLM. To use an existing Chrome instead of the auto-downloaded Chromium, set `CHROME_PATH`; to skip the download entirely, set `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1`.

## A five-minute tour

The full workflow on a fresh project, with what you should expect to see:

```bash
# 1. Install — Chromium is provisioned automatically
npm i -D windupjs

# 2. Initialize — 3 questions (base URL, model, scenarios dir)
npx windup init
#    → windup.config.ts + e2e/scenarios/ + .windup/ (cache & map committed; state/runs/reports gitignored)

# 3. Index your app from source — before anything ever runs
npx windup scan
#    scan complete (full): framework=react-router routes=106 elements=1125
#    The site map now knows your real routes and selectors; the planner
#    will use them instead of guessing. Re-run after big changes
#    (windup scan --update re-indexes only files changed since, via git).

# 4. Register test credentials once — values never touch git
npx windup secret set admin        # hidden prompts → .env.local + mapping

# 5. Author a scenario from a rough instruction
npx windup new "log in with the admin account and create an invoice for ACME"
#    → e2e/scenarios/create-invoice-acme.json — precise task grounded in
#      your real screens, account referenced by name, final verification

# 6. First run — the LLM plans once (~3s, ~$0.002)
npx windup run create-invoice-acme
#    PASS  create-invoice-acme  cache=miss llm_calls=1 ... cost=$0.0024

# 7. Every run after — deterministic replay, zero LLM
npx windup run create-invoice-acme
#    PASS  create-invoice-acme  cache=hit llm_calls=0 total=600ms cost=$0

# 8. Read results like a human, ship reports to CI
npx windup run --all --summary --reporter html
npx windup costs                   # AI spend: totals, per provider/model
```

If a run fails after an app change, the cached plan is invalidated and re-planned automatically on the next run — **you edit scenarios, not selectors.**
