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
  // Dynamic values fetched at run time (OTP, magic-links) — referenced by a plan via value_ref/url_ref.
  resolve: {
    otp_code:   { source: { kind: "cmd", command: "psql \"$DATABASE_URL\" -tAc \"select code from otp_codes order by created_at desc limit 1\"" }, extract: { regex: "(\\d{6})" }, poll: { timeout_ms: 30000 } },
    magic_link: { source: { kind: "http", url: "https://inbox.test/latest" }, extract: { json: "body.url" }, url: true },
  },
  // Deterministic binding: any fill on a matching field is filled from the resolver.
  resolveFields: { "[name=otp]": "otp_code" },
  // Request stubbing: deterministic responses for matched requests (a 500, an empty list, a dropped call).
  network: [
    { url: "**/api/orders", json: [] },                 // force an empty list
    { url: "**/api/report", status: 500 },              // simulate a server error
    { url: "**/analytics", abort: true },               // drop the request (network error)
  ],
  // Frozen clock: pin the page's time and/or timezone for date-dependent scenarios.
  clock: { now: "2026-01-15T09:00:00Z", timezone: "America/Sao_Paulo" },
  // Runtime health gates: fail a scenario on a console error / 5xx seen during the run.
  failOn: { consoleErrors: true, http5xx: true, ignore: ["/analytics", "third-party.example"] },
  // Device emulation: a Playwright preset applied to every run (viewport/UA/mobile). Cache is keyed per device.
  device: "iPhone 14",
  // Performance budgets: fail when the final page's metric exceeds the threshold (ms, or unitless for cls).
  budgets: { lcp_ms: 2500, cls: 0.1, load_ms: 4000 },
});
```

- **`context.credentials`** maps account names to ENV references. When a task mentions the account, the plan uses `value_ref` — manifest credentials take precedence even if the page displays values, and the planner is forbidden from inventing ENV names.
- **`readySignals`** maps a route glob to the CSS selector(s) that must be **visible before the executor runs the first action** on a matching page. It's applied deterministically at run time (no LLM, $0, not part of the cached plan) whenever a run enters a matching route — so a hydration/loading wait is defined once per route instead of repeated as a hint in every scenario. It closes the load-time race where an element is present but its handlers aren't attached yet (which Playwright's per-element wait can't see). Best-effort: a signal that never appears within the timeout logs a warning and continues (it never hard-fails the suite).
- **`suite.setup` / `suite.teardown`** are shell command(s) run **once** around a `run --all` — setup before the first scenario, teardown after the last (always, even on failure) — for suite-wide fixtures (seed/reset a shared database, start a stub). Per-scenario `setup`/`teardown` (in the scenario JSON) still handle per-test state. A failing `suite.setup` aborts the suite before any scenario runs; a failing `suite.teardown` is a warning.
- **`forbid`** is a safety denylist — a CI guardrail against irreversible side effects. If any plan action targets a forbidden **selector** (substring match, e.g. `#change-password`) or the run reaches a forbidden **URL** (path glob, e.g. `**/account/password`), the run **aborts** with a `forbidden` failure instead of performing it. You declare the danger list (the engine never infers it), so even if a re-plan wanders toward "Change password", it's stopped before the click. A `forbidden` failure never invalidates the cache or re-plans, so it needs no LLM key.
- **`resolve`** declares dynamic values fetched at run time (an OTP code, a magic-link URL) — the thing that unblocks OTP/magic-link/passwordless login. A plan references one via `value_ref: "<name>"` (a fill) or `url_ref: "<name>"` (a goto); Windup fetches the **`source`** (`cmd` shell stdout, `http` fetch, or `fn` a project module), pulls the value out with **`extract`** (a `regex` capture group or a `json` dot-path), and **`poll`**s until it appears (default 30 s). The **source is author-declared, never LLM-generated** (no code-exec-from-model vector), and the resolved value is **ephemeral** — used for the fill/goto and never written to the cache, report or logs.
- **`network`** stubs HTTP requests deterministically — a list of rules matched against the request URL (a **substring** or a **glob**) plus an optional `method`, **first match wins**. Respond with `status` (default 200) + `body`/`json` (a `json` body sets `content-type` automatically) + optional `headers`/`contentType`, or `abort: true` to drop the request (a simulated network error). It lets a scenario reach a hard-to-seed state — a 500, an empty list, a failing third-party call — without touching the backend. Author-declared, applied on every run and **never part of the cached plan**.
- **`clock`** pins the page's time. `now` (an ISO string or epoch ms) freezes `Date`/`Date.now()` to a fixed instant — injected before any page script, so `new Date()` in the app returns it — for scenarios that would otherwise drift ("orders from today", a countdown). `timezone` (an IANA name) sets the browser's zone natively. Frozen, not moving; applied every run, never cached.
- **`failOn`** turns runtime health signals into failures. `consoleErrors: true` fails a scenario that logged a console error or threw an uncaught exception; `http5xx: true` fails one whose page got a 5xx. `ignore` is a list of URL/text substrings to silence known noise (analytics, a third-party 500 you don't own). Requests answered by `config.network` are always excluded — a deliberate stub is not a real failure. The CLI flags `--fail-on-console` / `--fail-on-5xx` force these on for a single run; either way the signals are recorded and shown in the reports.
- **`device`** emulates a Playwright device preset (a name like `"iPhone 14"`, `"Pixel 7"`, `"iPad Pro 11"`) for every run — viewport, user-agent, device scale, mobile/touch. Also `--device <name>` (wins over config). Cached plans are **keyed per device** so mobile and desktop keep separate trajectories (running the same scenario at two viewports won't thrash one plan); with no device the cache is unchanged. Mobile emulation needs chromium; an unknown preset name fails fast with a hint.
- **`budgets`** sets performance thresholds on the final page — `ttfb_ms`, `fcp_ms`, `lcp_ms`, `dcl_ms`, `load_ms` (milliseconds) and `cls` (unitless). Any breach fails the scenario (kind `budget`). Setting any budget turns on web-vitals capture; `--web-vitals` captures and reports without gating. Perf numbers are noisy, so set budgets with headroom (they catch regressions, not micro-jitter).
- **`resolveFields`** binds a field to a resolver deterministically — recommended for CI. Keyed by a **selector substring** (`{ "[name=otp]": "otp_code" }`), any fill on a matching field is filled from that resolver, **overriding whatever the plan put there**. So the OTP flow no longer depends on the planner remembering to emit `value_ref` — even if it fills a literal or a differently-cased name, Windup still resolves the field (names like `OTP_CODE` / `otp-code` normalize to a declared `otp_code`).
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
