---
title: windup record
description: Author a scenario by demonstration — drive a headful browser, mark what to verify, finish. Windup writes the scenario and caches the recorded plan for a $0 replay.
---

# Author by demonstration — `windup record`

The inverse of [`windup new`](/docs/authoring): instead of *describing* the flow, **show it**. Drive your real app in a browser, mark what the test should verify, and Windup turns your clicks into a scenario that replays deterministically at **$0**.

```bash
npx windup record --url http://localhost:3000
```

## How it works

Windup opens a **headful** browser at your start URL. Use the app normally — log in, navigate, fill forms. A small floating toolbar sits at the bottom of the page:

- **◉ mark verification** — click it, then click the element the test should check. Windup records it as the final assertion (its **visibility**, or its **text** if it has any). Mark nothing and the run is verified by the **final page's URL**.
- **■ finish** — stop recording (Ctrl-C also saves).

On finish, Windup writes **two** things:

1. **The scenario file** (`e2e/scenarios/<id>.json`) — with a task summarizing the flow, for humans and for a future re-plan.
2. **The cached plan** — your recorded actions, stored as the trajectory. So `windup run <id>` replays it **immediately, at $0, with no LLM**.

If a real UI change later invalidates the cache, the scenario **self-heals** — it re-plans from the task like any other, so a recording isn't a dead end.

## What gets captured

Each click and field entry becomes an action with a **stable selector** and an accessible **description**. The selector follows the engine's own priority — the same order the planner and signature trust:

```
#id  →  [data-testid]  →  [name]  →  tag[type]  →  role / text
```

Recorded selectors are a **starting point you can edit** — open the scenario and tighten one if you like.

## Secrets never enter the plan

Type a password during a recording and Windup does the safe thing automatically: the value is registered to `.env.local` (gitignored) and the fill action stores a `value_ref` (`ENV:…`), **never the literal**. The recorded plan is safe to commit — see [Test credentials](/docs/credentials).

## When to use it

`windup record` is a **local dev tool**: it's interactive and headful, so it needs a TTY (not CI). Reach for it when a flow is easier to click than to describe, or to bootstrap a scenario you'll then refine.

## Flags

| Flag | What it does |
|---|---|
| `--url <start>` | Start URL (defaults to `config.baseUrl`) |
| `--id <id>` | Scenario id (default: derived from the flow) |
| `--force` | Overwrite an existing scenario with the same id |
| `--no-llm` | Don't call an LLM to summarize the task (a task is synthesized from the flow) |
