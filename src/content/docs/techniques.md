---
title: Engineering notes
description: The techniques that make natural-language tests deterministic and cheap — plan-once replay, self-healing cache, structural signatures, and more.
---

# Engineering notes — the techniques behind Windup

A summary of the approaches that make natural-language tests deterministic and cheap:

- **Plan once, replay free.** The LLM is used exactly once per scenario (plus automatic re-planning when the app changes). Its output is a schema-validated **JSON action plan — data, not code**: no generated scripts, no conditionals, no runtime improvisation. Replays execute the cached plan with zero model calls.
- **Deterministic execution.** Plans run on Playwright with native actionability checks and trusted input events. Every action carries an explicit postcondition (`expect`: element visible / URL glob / input value) verified **LLM-free** — verification costs a DOM query, not tokens.
- **Self-healing cache.** Trajectories are cached keyed by scenario + start-URL *path* (portable across dev/staging/CI hosts). A failed verification invalidates the plan, preserves the stale entry as evidence, and triggers a re-plan with the failure as context.
- **Structural page signatures.** Pages are identified by a SHA-256 of their normalized interactive elements — no text, no data — so environment noise doesn't split identities, and start-page drift is detected (leniently) on replay.
- **Layered site knowledge.** A site-map graph feeds the planner real routes and selectors, built from three sources with strict precedence — runtime observation > static source scan > capped LLM-assist. Knowledge is cache, not truth: anything stale degrades to runtime discovery.
- **Prompt budget discipline.** The planning prompt stays ≈ constant size (~32k chars): page tree, map slice, fragments catalog, and manifest each have hard char budgets. Long prompts measurably degrade small models — budgets are a correctness feature, not an optimization.
- **Mechanical normalization over prompt hope.** Model output is sanitized deterministically: empty fields dropped, ids renumbered, `wait_for`⇄`expect` normalized, fragment-echo actions deduped, credentials scrubbed from authored scenarios. Cross-provider A/B testing showed prompt instructions alone don't hold across models — code has the final word.
- **Two-tier retry.** Semantic failures (invalid plan) get one short retry carrying the validation errors; transient API pathologies (token-loop degeneration, network) get re-calls with varied seeds. Full-prompt retries are avoided — they reliably re-trigger degeneration.
- **Composable building blocks.** Fragments are curated, committed sub-trajectories (e.g. login) that plans reference by id — updated once, propagated everywhere, expanded at run time. The project manifest injects team knowledge (conventions, accounts, vocabulary) into every plan.
- **Secrets by reference.** Credential values live in `.env.local`/CI secrets; committed files carry only account → ENV-name mappings. Plans use `value_ref`, resolved at execution time — secrets never reach the LLM, the cache, or git.
- **Provider-agnostic LLM boundary.** One interface, Google and OpenAI implementations (the OpenAI client is plain REST — no SDK weight), selectable per run. Swapping the browser engine and adding a provider were each a one-file change — the boundaries are the architecture.
- **Cost you can audit.** Every LLM touchpoint has an explicit cap and lands in a per-run ledger with tokens, model and provider; `windup costs` recomputes from a dated price table, so history stays accurate as prices move.
