---
title: Test credentials
description: How Windup handles test credentials — create, list and remove accounts, use them in scenarios, and where the values are stored. No secret ever touches scenarios, plans, the cache or git.
---

# Test credentials

Windup keeps test credentials out of everything that gets committed or cached. A scenario says *"log in as the admin account"* — never the password. The real values live in one gitignored place; everything else refers to them **by name**.

## Where things are stored

| What | Where | Committed? |
|---|---|---|
| The real values (users, passwords) | `.env.local` (created with `600` permissions) | **No** — gitignored automatically. In CI, the same variable names are pipeline secrets. |
| The account → variable-name mapping | `windup.credentials.json` | **Yes** — it contains **no values**, only `ENV:` references. |
| The live wiring | merged into the project manifest (`context.credentials`) at startup | — |

A value is read **only by the executor, at the moment it fills a field**. It never enters the planning prompt, the action plan, the trajectory cache, or git.

## Create an account

```bash
npx windup secret set admin
```

Prompts (hidden) for the user and password, writes them to `.env.local`, adds the mapping to `windup.credentials.json`, and makes sure `.env.local` is gitignored. Variable names follow `WINDUP_<ACCOUNT>_<FIELD>` — so the `admin` account's password becomes `WINDUP_ADMIN_PASSWORD`.

Register as many accounts as you need (`admin`, `qa`, `readonly`, …); each gets its own variables.

Non-interactive (CI or scripting) — flags land in shell history, so prefer the prompt for real secrets:

```bash
npx windup secret set admin --user admin@acme.test --password 's3cr3t'
```

## List accounts

```bash
npx windup secret list
```

Lists every account, its fields, and whether each value is present — `[set]` or `[MISSING in .env.local / CI]`. It **never prints the values**. Run it before a suite to catch a missing secret early.

## Remove an account

```bash
npx windup secret remove admin        # alias: windup secret rm admin
```

Drops the account from the mapping and its values from `.env.local` (other variables are left untouched), and clears it from the manifest.

## Use credentials in a scenario

Reference the account **by name** in the task — never the literal values:

```json
{
  "scenario_id": "create-invoice",
  "task": "Log in as the admin account, open the Invoices menu, create an invoice for ACME and verify it appears in the list."
}
```

When planning, Windup tells the LLM that the `admin` account exists with `ENV:WINDUP_ADMIN_USER` / `ENV:WINDUP_ADMIN_PASSWORD`, so the plan fills those fields with `value_ref: "ENV:WINDUP_ADMIN_PASSWORD"` — a reference, resolved to the real value only at execution time.

`windup new` does this for you: if you type real credentials in the instruction, it detects them, registers the account, and scrubs the values — the generated scenario mentions the account, never the secret.

## Declaring credentials in config (alternative)

You don't have to use the CLI. The mapping can also be declared directly in `windup.config.ts` — this is exactly what `windup.credentials.json` feeds into:

```ts
context: {
  credentials: {
    admin: { user: "ENV:WINDUP_ADMIN_USER", password: "ENV:WINDUP_ADMIN_PASSWORD" },
  },
}
```

Either way, the values still come from `.env.local` (locally) or CI secrets, under those variable names.

## In CI

Commit `windup.credentials.json`, then define the same variable names (`WINDUP_ADMIN_USER`, `WINDUP_ADMIN_PASSWORD`, …) as pipeline secrets. No secret ever touches the repo, and `windup secret list` tells you if any are missing before a run.
