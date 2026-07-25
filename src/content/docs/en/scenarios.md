---
title: Scenarios
description: A scenario is a JSON file describing a test in plain language. Learn the format, scenario dependencies, and LLM-assisted authoring with windup new.
---

# Scenarios

A scenario is a JSON file in your scenarios directory (default `e2e/scenarios/`):

```json
{
  "scenario_id": "checkout",
  "start_url": "/",
  "task": "Log in as the qa account, add 'Backpack' to the cart, check out and verify the order confirmation message appears.",
  "hints": ["Optional site-specific tips for the planner. Delete if not needed."]
}
```

- `start_url` is **optional** (defaults to `/`) and should stay environment-free: a path, resolved against the effective base URL.
- End the task with **what to verify** — that becomes the plan's final postcondition.
- Never put secrets in tasks. Reference accounts from the project manifest (see [Test credentials](/docs/credentials)); the plan will use `value_ref: "ENV:VAR"` and the real value is resolved only at runtime, never cached.
- **Native dialogs & non-toast verification.** Windup handles native browser dialogs (`window.confirm`/`alert`/`prompt`) that guard destructive actions (archive, delete, cancel): the planner adds `"dialog": "accept"` (or `"dismiss"` to cancel) to the action that opens the dialog — otherwise the dialog is auto-dismissed and the action silently does nothing. It also steers the final verification toward a **persistent** signal (a row that disappears, a changed label, a URL) over an ephemeral toast/snackbar that vanishes in seconds.
- **Organize by folder.** Scenarios are discovered recursively, so you can group them in subfolders (`e2e/scenarios/contacts/list.json`, `e2e/scenarios/auth/login.json`). The **`scenario_id` is the identity** — `run --all`, the vitest suite and `depends_on` all resolve by it, independent of the file path (duplicate ids are reported).

## Scenario dependencies (`depends_on`)

Flows rarely start from zero — creating a bank account requires being logged in. Declare prerequisites and each scenario stays small, focused and individually cacheable:

```json
{
  "scenario_id": "create-bank-account",
  "depends_on": ["login"],
  "task": "Already on the dashboard, open Settings > Bank accounts, create an account named 'Inter' and verify it appears in the list."
}
```

- Dependencies run **in the same browser session**, in order, each with its own cache — a warm suite replays the whole chain with zero LLM calls.
- Without a `start_url`, the dependent scenario **continues from where the last dependency ended** — and on first planning the LLM sees that real page (the post-login dashboard), instead of planning blind.
- Chains work (`login` → `select-company` → `create-account`), cycles are rejected, and a failing dependency fails the run with kind `dependency` before the scenario itself starts.
- Each dependency keeps its own self-healing: if its cached plan breaks, it re-plans and re-caches — dependents benefit automatically.
- **Session snapshots skip the chain replay (the big speed lever).** Re-running a login flow through the UI for every scenario that depends on it is the dominant wall-clock cost of a cached suite. Windup captures each dependency's **exit state** — Playwright `storageState` (cookies + localStorage) plus its final URL — after it runs, and on a later cached replay it **restores that state into a fresh context and skips re-running the `depends_on` chain** (`deps≈0ms`, reported as `reused_session_from`). The restored run is **still verified**: if the session is stale or wasn't fully captured, Windup drops the snapshot and **falls back to re-running the full chain** — no false pass, no wasted LLM call. Snapshots live in `.windup/state/` (**gitignored — they hold auth cookies/tokens; never commit them**).
- **Guided self-heal.** A re-plan tells the planner the exact selector that failed ("don't reuse it"), re-emphasizes your hints, and — with `--suggest` — feeds the same expert diagnosis you'd read back into the re-plan, so it corrects instead of re-proposing a refuted selector. If a scenario keeps re-planning without stabilizing, Windup warns that the app likely lacks a stable selector (an accessibility gap) or has a race, instead of churning silently.
- Editing a scenario's `task` invalidates its cached plan (a rewritten test is a different test).

`windup new` handles dependencies both ways: `--depends-on login` declares them explicitly, and **the author LLM also suggests them on its own** — it sees every existing scenario (id + task) and, when the instruction presupposes a state one of them produces ("already logged in…"), emits `depends_on` automatically (mechanically filtered against real scenario ids — never invented).

## Isomorphic plan reuse (`like`)

At scale, many scenarios are the **same flow on a different route/entity** — create a contact, create a deal, create a company all drive the same form. Instead of paying an LLM planning call for each, a scenario can reuse another's **already-proven** plan:

```json
{
  "scenario_id": "deals-create",
  "start_url": "/deals/new",
  "task": "Type 'Big Deal' into the Name field and click Save; verify a new row appears.",
  "like": { "scenario": "contacts-create", "set": { "Alice": "Big Deal" } }
}
```

- `like.scenario` names the scenario whose active cached plan is the template. Windup instantiates it for **this** scenario — this `start_url`, and `like.set` swaps any differing fill values (`"source literal" → "value to use here"`, applied to `value` fields only; selectors and `value_ref` secrets are untouched).
- The reused plan is **still executed and verified** before it's trusted and cached — exactly the gate every plan passes. If the pages aren't actually isomorphic (a selector doesn't match, verification fails), Windup **falls back to normal LLM planning**. It never bypasses verification, so it can't produce a silent false green.
- When it verifies, the run cost **zero LLM calls** and the scenario now has its own cached plan; subsequent runs are ordinary `$0` replays.
- The source must have been planned once first (its plan is the template). In a suite where the source runs later, the `like` scenario simply plans with the LLM that round and reuses on the next — no error, just a missed optimization.

Reuse whole plans with `like`; reuse an **action block** across otherwise-different flows with a fragment (`windup fragment extract`). Both keep the deterministic, verified guarantee.

## Client-side fixtures (`seed`)

Some state lives entirely in the browser — a shopping cart in `localStorage`, a selected POS device in `sessionStorage`. Building it through the UI every time is slow and couples the test to that flow. `seed` injects that state **before the plan runs**, deterministically and with no server call:

```json
{
  "scenario_id": "cart-updates-quantity",
  "start_url": "/checkout/cart",
  "task": "Increase the first item's quantity to 3 and verify the total updates.",
  "seed": {
    "localStorage": { "cart": "[{\"id\":\"tkt-1\",\"qty\":2,\"price\":50}]" },
    "sessionStorage": { "pos_device": "reader-7" }
  }
}
```

- Seeded per **origin** (default: the `start_url` origin; override with `seed.origin`) via a Playwright init script that runs before the app's scripts, so the page loads already in that state.
- **Each key is set only if absent** — the app's own mutations (a cart the test then edits) are never clobbered on later navigations.
- It's **not** part of the cached plan: it runs on every run (including `$0` replays), so seeded scenarios stay deterministic.
- CI-safe by construction: you reach a client-side state directly instead of driving a flow that might hit the server. Great for cart/checkout and POS scenarios.

## Idempotency, setup & teardown

A replay re-runs the **same cached plan with the same values** — ideal for **idempotent** flows (edit a fixed record to a fixed value, toggle and check, read/list/filter). It does **not** fit a pure **CREATE** whose resource has a non-reusable unique key: the first run creates it, every replay violates the constraint. Two ways to cover writes:

1. **Prefer idempotent scenarios** — edit a known test record instead of creating a new one; the replay is `$0` and leaves no residue.
2. **`setup` / `teardown` hooks** — shell commands that run **outside** the cached plan (so on every replay), for fixtures or cleanup (hard-delete what the test created, reset via SQL/HTTP):

```json
{
  "scenario_id": "create-contact",
  "task": "Open Contacts, create a contact with CPF 111.111.111-11 and verify it appears in the list.",
  "setup":    "psql \"$DATABASE_URL\" -c \"delete from contacts where national_id = '11111111111'\"",
  "teardown": "psql \"$DATABASE_URL\" -c \"delete from contacts where national_id = '11111111111'\""
}
```

`setup` runs before the scenario and its dependencies (a failure fails the run); `teardown` runs after, **always** — pass or fail (a failure is a warning). They are your own trusted commands (like a test's `beforeEach`/`afterEach`), run in the project root with the process env, and never enter the plan or cache.

For state shared by the whole suite (seed a fixture database once, start a stub), use `suite.setup` / `suite.teardown` in the [configuration](/configuration/) — they run **once** around `run --all` (the `beforeAll`/`afterAll` analogue), while per-scenario hooks handle per-test state.

## Authoring with `windup new`

> **The task and its final verification are the LLM's best guess** from your instruction and the site map — an LLM can pick a plausible-but-wrong destination. `windup new` steers the verification toward the instruction's actual goal (a visible element/text over a guessed route) and recommends confirming with `--validate` (generate → run → self-refine until green) or a first `windup run`.

You don't have to write detailed tasks by hand. Give `windup new` a rough instruction and the LLM acts as a test author — it rewrites it into a precise, verifiable scenario using the **site map** (real screens, menus and elements from `windup scan` and past runs) and the **project manifest** (accounts referenced by name, never literal credentials):

```bash
npx windup new "log in with the qa user, add the backpack to the cart and check out"
# → e2e/scenarios/purchase-backpack-qa.json — real screen names, concrete fake
#   form data, account referenced as "the qa account", explicit final verification
```

It generates the `scenario_id`, picks the `start_url` from known routes (falling back to `/` — it never invents paths), and adds selector hints from the map when they help. Add **`--validate`** to have it run the generated scenario and, if it fails, refine it from the failure and retry (up to 3 attempts) — you get back a scenario that *already passed once*, with a warm cache:

```bash
npx windup new "log in and create a cost center named Marketing" --validate
#   attempt 1: FAIL — element button:has-text('Save') not visible
#   attempt 2: PASSED
#   ✓ validated in 2 attempts — the plan is cached
```

**Credentials in the instruction never land in the scenario file**: they are auto-registered as a named account (values in `.env.local`, mapping in `windup.credentials.json`) and the task references the account — see [Test credentials](/docs/credentials).

Flags: `--id <id>`, `--force` (overwrite), `--depends-on <ids>`, `--llm <provider[:model]>`. The output is a file for **you to review, edit and commit** — authoring is assisted, the test remains yours. One LLM call (~$0.001), recorded in the `windup costs` ledger under `authoring`.
