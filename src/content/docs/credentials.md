---
title: Test credentials
description: Credentials never live in scenarios, plans, the cache or git — only references. Values stay in .env.local or CI secrets, resolved at runtime.
---

# Test credentials

Credentials never live in scenario files, plans, the cache or git — only **references**. Values stay in `.env.local` (gitignored) or CI secrets; the account → ENV-name mapping lives in `windup.credentials.json` (committed — it contains no values) and is merged into the project manifest automatically.

```bash
npx windup secret set admin        # hidden interactive prompts → .env.local + mapping
npx windup secret list             # accounts + whether each ENV is set (never prints values)
```

Tasks then reference the account by name — *"log in with the admin account"* — and plans use `value_ref: "ENV:WINDUP_ADMIN_PASSWORD"`, resolved only at execution time.

`windup new` does this automatically: credentials typed in the instruction are detected, registered, and scrubbed — the generated scenario mentions the account, never the values. In CI, define the same variable names as pipeline secrets.
