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
- Editing a scenario's `task` invalidates its cached plan (a rewritten test is a different test).

`windup new` handles dependencies both ways: `--depends-on login` declares them explicitly, and **the author LLM also suggests them on its own** — it sees every existing scenario (id + task) and, when the instruction presupposes a state one of them produces ("already logged in…"), emits `depends_on` automatically (mechanically filtered against real scenario ids — never invented).

## Authoring with `windup new`

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
