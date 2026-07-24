---
title: Architecture & spec
description: The living specification — thesis, principles, module boundaries, data formats, and cost & security posture behind Windup's deterministic replay.
---

# Architecture &amp; spec

A condensed view of the [living specification](https://github.com/windupjs/windup/blob/main/docs/specs/SPEC.md). It describes the system as shipped.

## Thesis

Browser E2E tests can use an LLM **only for planning** (and re-planning on failure), with deterministic execution and cheap verification — so repeated runs make **zero LLM calls**. Validated end-to-end: first run plans in seconds for fractions of a cent; replays take ~0.5–1s and cost $0.

## Principles

1. **The LLM is the exception, not the rule.** One call per cache miss; replays never call it.
2. **Zero hardcoded site knowledge.** The engine may know *frameworks* (Next.js, react-router, TanStack Router, design-system naming) and the web platform — never a specific site. All site knowledge arrives as input or is discovered at runtime.
3. **Every execution is also collection.** The executor already visits every page of a flow; persisting what it sees costs ~one `evaluate` per action.
4. **Knowledge is cache, not truth.** Anything the site map or static scan asserts can be stale; it degrades to runtime discovery. Precedence: `execution > static > llm`.
5. **Cost never surprises.** Every LLM touchpoint has an explicit cap; every call is recorded in a ledger; repeated static/assist work is memoized.
6. **Plans are data, not programs.** No conditionals, no loops, no free-form code. If a flow needs branching, split the scenario.

## Architecture

```
scenario (natural language, versioned)
    │
    ▼
┌─ runner ─────────────────────────┐
│ cache lookup (path-keyed)         │
│   miss → planner (LLM, 1 call)    │
│   hit  → cached plan (rebased)    │
│   → executor (deterministic)      │
│   → verifier (postconditions)     │─▶ fail → invalidate → re-plan
│   → cache save + run ledger       │
└───────────────────────────────────┘

site map (graph) ◀── windup scan (static + LLM-assist)
                 ◀── passive collection (every run)
```

Module boundaries (all in `packages/windup/src/`):

| Module | Responsibility |
|---|---|
| `browser.ts` | Single engine boundary (Playwright). Fresh `BrowserContext` per session on a lazy Chromium singleton; trusted clicks with native actionability; `ariaSnapshot()` feeds the planner. Targets the first *visible* match, not the first DOM match. |
| `llm.ts` | Multi-provider LLM boundary. One `LlmClient` interface; Google Gemini (SDK) and OpenAI (plain REST) implementations. Several providers configurable at once; selected per run. Switching providers never touches the plan cache. |
| `planner.ts` | Planning logic (provider-agnostic). Prompt = task + page a11y tree + real elements + site-map slice + fragment catalog + manifest + hints. Structured output; two retry levels (semantic + transient); output sanitized then validated (Ajv is the authority). |
| `executor.ts` | Deterministic loop: goto → per action (gate on visibility → act → verify). Emits passive site-map observations. |
| `verifier.ts` | Postconditions, all LLM-free: element visible, URL glob, input value. Polling with frame-safe waits. |
| `cache.ts` | Trajectory cache keyed by `scenario_id` + start-URL **path** (environment-portable). Saved only after full verified execution; a failed replay invalidates and re-plans, keeping the stale entry as evidence. |
| `signature.ts` | Structural page identity: SHA-256 of normalized interactive elements — no text, no data — so environment noise doesn't split identities. |
| `sitemap.ts` | Page/transition graph. Nodes carry `source: execution\|static\|llm` with staleness and provenance. Prompt slice: BFS (depth ≤ 3), term-scored, within a char budget. |
| `scan/` | Project indexing. Layer 1: routes by convention (Next.js, react-router, TanStack Router). Layer 2: interactive elements via brace-aware JSX parsing (raw tags + design-system components). Layer 3: capped LLM-assist, memoized per file hash. |
| `fragments.ts` | Reusable tested sub-trajectories, committed in `e2e/fragments/`. Plans reference them by id; the cache stores the reference (updates propagate). |
| `authoring.ts` | `windup new` — the LLM rewrites a rough instruction into a precise scenario grounded in the site map and manifest; credentials auto-registered and scrubbed; output is a committed file for review. |
| `metrics.ts` / `costs.ts` | Every run writes a ledger record (tokens, calls, model, timing, failure class). Prices are a dated per-model table; `windup costs` recomputes so history stays correct. |
| `summary.ts` / `suggest.ts` | Opt-in post-run AI debrief and post-failure fix suggestion — one extra LLM call each, tracked separately, never affecting the run result. |
| `reporters.ts` | JUnit XML, JSON and self-contained HTML reports; non-zero exit on failure. |
| `secrets.ts` | Credentials without committed secrets: values in `.env.local`, account → ENV-name mapping committed; plans carry `value_ref` only, resolved at run time. |

## Data formats

**Action plan** (`plan_version: "0.1"`): `{ plan_version, scenario_id, task, start_url, generated_by, actions[] }`. An action is `{ id, type: goto|click|fill|wait_for|use, target?, value? | value_ref?, url?, use?, expect?, timeout_ms }`. Semantic rules: click/fill/wait_for require `target.selector`; fill requires exactly one of value/value_ref; `value_ref` must be mentioned by task/hints/manifest (no invented ENV names); the final action must carry `expect` (or be a `use`).

**Cache entry** (`cache_version: "0.2"`): `{ key: {scenario_id, start_url(path), start_sig?}, plan, status: active|stale, stats }`.

**Site map** (`map_version: "0.1"`): `{ last_scan_sha, pages, transitions, assist_seen }`.

## Model &amp; cost posture

Default planner model: **`gemini-3.1-flash-lite`** (measured: 1 clean call/generation, ~3–4s, ≈ $0.0025/generation). Provider-agnostic: Google Gemini and OpenAI ship in-box behind the `llm.ts` boundary. Every ledger record carries provider+model; prices are a flat per-model table. Adding a vendor = one client implementation.

## Security posture

Page content captured from the app under test is fed to the LLM **delimited and marked as untrusted data**, with an explicit instruction to treat it as data, never as instructions. Because plans are schema-validated data executed deterministically, a page cannot make Windup run arbitrary code. Credential values never enter scenarios, plans, the cache or LLM prompts. Full threat model: [SECURITY.md](https://github.com/windupjs/windup/blob/main/SECURITY.md).

## Known limitations

- Nested react-router relative paths are collected best-effort (corrected by execution observations).
- Scan is single-package aware; monorepos are detected and warned, per-app indexes are future work.
- No daemon between CLI invocations (deliberate); the warm pool is per-process.
- Fragment auto-detection is not built; extraction is manual.

## Verification

- `npm test` (packages/windup): ~97 unit/integration tests, LLM-hermetic. CI runs them with real Chromium on Ubuntu.
- `windup bench <scenario>`: the validation protocol — 5 generations (≥ 4/5 valid), 10 replays (10/10 with `llm_calls=0`), replay ≥ 5× faster, $0 replay, break-a-selector recovery.
- Real-project dogfood: a react-router app with 106 routes — plans replay at ~0.5s/$0, cache portable across environments.
