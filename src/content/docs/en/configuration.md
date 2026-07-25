---
title: Configuration
description: The windup.config.ts reference — base URL, LLM providers, scan settings, and the project manifest that injects team knowledge into the planner.
---

# Configuration (`windup.config.ts`)

```ts
import { defineConfig } from "windupjs";

export default defineConfig({
  baseUrl: "http://localhost:3000",
  llm: {
    provider: "google",
    model: "gemini-3.1-flash-lite",
    // Several providers at once — pick per run with --llm (see "LLM providers"):
    providers: { openai: { model: "gpt-5-mini" } },
  },
  scenarios: "e2e/scenarios",
  framework: "react-router",          // detected by init; used by scan
  // browser: "chromium",             // or "firefox" / "webkit" (need: npx playwright install <name>)
  scan: {
    llmAssist: { enabled: true, maxCalls: 20 },   // hard cost cap per scan
  },
  // Project manifest: team-provided knowledge injected into the planner prompt.
  context: {
    conventions: ["every interactive element has a data-testid"],
    credentials: {
      qa: { user: "ENV:QA_USER", password: "ENV:QA_PASSWORD" },
    },
    vocabulary: { "order": "the Order entity, screen /orders" },
  },
  // Reusable readiness signals per route glob (anti-flake) — see below.
  readySignals: {
    "**/workspace/**": "#app-ready",              // wait for this before acting on any /workspace/* page
    "**/reports/**": ["#grid", "[data-loaded]"],  // one or more selectors
  },
  // Suite-level fixtures: run once around `run --all` (beforeAll / afterAll).
  suite: {
    setup:    "npm run db:seed",
    teardown: "npm run db:reset",
  },
  // Safety denylist: abort if a plan ever touches these (CI guardrail).
  forbid: {
    selectors: ["#change-password", "[data-danger]"],  // substring match on a plan's selector
    urls: ["**/account/password", "**/admin/**"],       // path globs the run must never reach
  },
});
```

- **`context.credentials`** maps account names to ENV references. When a task mentions the account, the plan uses `value_ref` — manifest credentials take precedence even if the page displays values, and the planner is forbidden from inventing ENV names.
- **`readySignals`** maps a route glob to the CSS selector(s) that must be **visible before the executor runs the first action** on a matching page. It's applied deterministically at run time (no LLM, $0, not part of the cached plan) whenever a run enters a matching route — so a hydration/loading wait is defined once per route instead of repeated as a hint in every scenario. It closes the load-time race where an element is present but its handlers aren't attached yet (which Playwright's per-element wait can't see). Best-effort: a signal that never appears within the timeout logs a warning and continues (it never hard-fails the suite).
- **`suite.setup` / `suite.teardown`** are shell command(s) run **once** around a `run --all` — setup before the first scenario, teardown after the last (always, even on failure) — for suite-wide fixtures (seed/reset a shared database, start a stub). Per-scenario `setup`/`teardown` (in the scenario JSON) still handle per-test state. A failing `suite.setup` aborts the suite before any scenario runs; a failing `suite.teardown` is a warning.
- **`forbid`** is a safety denylist — a CI guardrail against irreversible side effects. If any plan action targets a forbidden **selector** (substring match, e.g. `#change-password`) or the run reaches a forbidden **URL** (path glob, e.g. `**/account/password`), the run **aborts** with a `forbidden` failure instead of performing it. You declare the danger list (the engine never infers it), so even if a re-plan wanders toward "Change password", it's stopped before the click. A `forbidden` failure never invalidates the cache or re-plans, so it needs no LLM key.
- **LLM-assist** (scan layer 3) reads files the static layers couldn't resolve (dynamically built routes, indirect components), capped by `maxCalls`. Results are remembered per file hash — unchanged files never cost again. Costs are recorded in the ledger and shown by `windup costs`.

## What lives where

| Path | Contents | Commit? |
|---|---|---|
| `windup.config.ts` | Configuration | ✅ |
| `e2e/scenarios/*.json` | Your tests, in natural language | ✅ |
| `e2e/fragments/*.json` | Curated reusable blocks | ✅ |
| `windup.credentials.json` | Account → ENV-name mapping (no values) | ✅ |
| `.env.local` | Credential values | ❌ (auto-gitignored; CI uses secrets with the same names) |
| `.windup/` | Derived state: plan cache, run ledger, site map, reports | ❌ (init adds it to `.gitignore`) |
