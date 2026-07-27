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

1. **The scenario file** (`e2e/scenarios/<id>.json`) — with a task synthesized from the **visible labels** of what you clicked (`click "Ver ingressos" → fill "Quantidade" → click "Continuar", verifying "Continuar"`), not an opaque "14 interaction(s)". That readable task is what makes a recording survive a cache invalidation: the self-heal re-plans from a real description of the flow, not a blind count. (With an LLM key, Windup writes a one-sentence summary instead; `--no-llm` skips that call.)
2. **The cached plan** — your recorded actions, stored as the trajectory. So `windup run <id>` replays it **immediately, at $0, with no LLM**.

If a real UI change later invalidates the cache, the scenario **self-heals** — it re-plans from the task like any other, so a recording isn't a dead end.

## What gets captured

Each click and field entry becomes an action with an accessible **description** and a selector that is **unique-checked at capture time** — each candidate along the anchor ladder is accepted only if it identifies the element **uniquely on the page** at that moment:

```
#id  →  [data-testid]  →  [name]  →  [aria-label]  →  [placeholder]  →  clean unique text
```

Text is used only when it's short, unique, and **carries no dynamic value** — a count or price is skipped (so a cart link never records `"1…R$ 35,00…"`) — and it's read from the element's own direct text, not its descendants'. When nothing stable is unique, Windup falls back to a short structural path and **flags the interaction unstable**, printing those after the recording (`⚠ N interaction(s) have no stable anchor …`) — the same spots a screen reader struggles with. Add a `data-testid` there, or edit the selector, before the scenario enters a suite.

## Secrets never enter the plan

Type a password during a recording and Windup does the safe thing automatically: the value is registered to `.env.local` (gitignored) and the fill action stores a `value_ref` (`ENV:…`), **never the literal**. The recorded plan is safe to commit — see [Test credentials](/docs/credentials).

## When to use it

`windup record` is a **local dev tool**: it's interactive and headful, so it needs a **TTY** (not CI). Under an agent/wrapper with no TTY, allocate a PTY: `script -q /dev/null npx windup record`. Reach for it when a flow is easier to click than to describe, or to bootstrap a scenario you'll then refine.

## Flags

| Flag | What it does |
|---|---|
| `--url <start>` | Start URL (defaults to `config.baseUrl`) |
| `--id <id>` | Scenario id (default: derived from the flow) |
| `--force` | Overwrite an existing scenario with the same id |
| `--no-llm` | Don't call an LLM to summarize the task — a readable task is synthesized from the flow's visible labels instead |
