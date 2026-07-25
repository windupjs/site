---
title: How it works
description: The LLM plans a scenario once into schema-validated JSON; a deterministic executor replays it with zero LLM calls and cheap DOM verification.
---

# How it works

```
natural-language task ──▶ planner (LLM, 1 call) ──▶ JSON action plan
                                                        │
       trajectory cache ◀── cheap verification ◀── deterministic executor
             │
             └──▶ subsequent runs: zero LLM, ~1s, $0
```

The expensive part — figuring out the browser actions — happens a single time and is turned into cached, verifiable data.

- **Plans are data, not code** — schema-validated JSON; no generated scripts, no conditionals.
- **Cheap verification** — DOM/URL postconditions after every action. A failed verification invalidates the cached plan and triggers an automatic re-plan.
- **Site map** — every execution feeds a graph of pages and transitions; `windup scan` seeds that graph straight from your source code before the first run, so the planner uses your app's *real* selectors instead of guessing.
- **Fragments** — proven action blocks (e.g. login) that the planner composes via `{ "type": "use" }` instead of regenerating.
- **Zero hardcoded site knowledge** — the engine knows frameworks and the web, never *your* site. All site knowledge arrives as input (scenarios, config, manifest) or is discovered at runtime.

## Why Windup

Hand-written scripts are cheap to run but expensive to maintain. Per-run AI agents are easy to write but slow and non-deterministic. Windup takes the good half of each.

|  | Hand-written scripts | AI agent per run | **Windup** |
|---|---|---|---|
| Authoring | code + selectors by hand | plain language | plain language |
| Run cost | $0 | LLM on **every** run | LLM on **first** run only |
| Run speed | fast | slow (model in the loop) | ~1s replay |
| Determinism | high | low — improvises each time | high — same plan every replay |
| App changed | you fix the script | may silently do something else | verification fails → auto re-plan |

**What the cache buys is `$0`, not "instant".** A cache hit skips the LLM *planning* (`plan=0ms`, `llm_calls=0`) — but the plan's Playwright actions still run, and any [`depends_on`](/scenarios/) chain still executes, so wall-clock is real-browser time, not a lookup. Each run reports the breakdown — `total=… (plan=… deps=… exec=… setup=…)` — where `deps` is the dependency chain, `exec` is this scenario's actions and `setup` is the browser context. The biggest lever is **session snapshots**: a dependency's auth state (`storageState`) is captured once and restored on later replays, so the login flow isn't re-run for every dependent (`deps≈0`).

For the deeper mechanics — module boundaries, data formats, cost and security posture — see [Architecture &amp; spec](/docs/architecture).
