---
title: Authoring with windup new
description: Give windup new a rough instruction and the LLM acts as a test author — it writes a precise, verifiable scenario from your app's real screens and project manifest.
---

# Authoring with `windup new`

You don't have to write detailed tasks by hand. There are two ways to create a scenario without hand-writing JSON: describe it with `windup new` (below), or **[record it by demonstration](/docs/record)**.

> **The task and its final verification are the LLM's best guess** from your instruction and the site map — an LLM can pick a plausible-but-wrong destination. `windup new` steers the verification toward the instruction's actual goal (a visible element/text over a guessed route) and recommends confirming with `--validate` (generate → run → self-refine until green) or a first `windup run`.

Give `windup new` a rough instruction and the LLM acts as a test author — it rewrites it into a precise, verifiable scenario using the **site map** (real screens, menus and elements from `windup scan` and past runs) and the **project manifest** (accounts referenced by name, never literal credentials):

```bash
npx windup new "log in with the qa user, add the backpack to the cart and check out"
# → e2e/scenarios/purchase-backpack-qa.json — real screen names, concrete fake
#   form data, account referenced as "the qa account", explicit final verification
```

It generates the `scenario_id`, picks the `start_url` from known routes (falling back to `/` — it never invents paths), and adds selector hints from the map when they help.

## Validate as you author

Add **`--validate`** to have it run the generated scenario and, if it fails, refine it from the failure and retry (up to 3 attempts) — you get back a scenario that *already passed once*, with a warm cache:

```bash
npx windup new "log in and create a cost center named Marketing" --validate
#   attempt 1: FAIL — element button:has-text('Save') not visible
#   attempt 2: PASSED
#   ✓ validated in 2 attempts — the plan is cached
```

## Credentials & output

**Credentials in the instruction never land in the scenario file**: they are auto-registered as a named account (values in `.env.local`, mapping in `windup.credentials.json`) and the task references the account — see [Test credentials](/docs/credentials).

Flags: `--id <id>`, `--force` (overwrite), `--depends-on <ids>`, `--llm <provider[:model]>`. The output is a file for **you to review, edit and commit** — authoring is assisted, the test remains yours. One LLM call (~$0.001), recorded in the `windup costs` ledger under `authoring`.
