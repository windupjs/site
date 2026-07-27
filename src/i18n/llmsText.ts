import type { Lang } from './index';

// Shared builders for /llms.txt and /llms-full.txt across locales.
// The "fast facts" are CLI-oriented and stay in English (commands are English);
// the summary line and the documentation link labels/descriptions are localized.

export function llmsTxt(lang: Lang, base: string, summary: string, docLinks: string): string {
  const p = lang === 'en' ? '' : `/${lang}`;
  return `# Windup

> ${summary}

Windup turns a plain-language task into a schema-validated JSON action plan, executes it deterministically with cheap DOM/URL verification after every step, and caches the trajectory. The second run replays the cached plan with no model calls. When the app changes and a verification fails, the plan is invalidated and re-planned automatically — you edit scenarios, not selectors.

Fast facts for driving the tool:
- Install: \`npm i -D windupjs\` (Chromium auto-provisioned). Requires Node >= 20 and one API key in \`.env.local\`: \`GOOGLE_GENERATIVE_AI_API_KEY\` (Google, default) or \`OPENAI_API_KEY\` (OpenAI). Keys are used only for planning; cached replays never call an LLM.
- Initialize a project: \`npx windup init\`. Index the app's routes/elements from source: \`npx windup scan\`. Find coverage gaps (indexed routes with no scenario): \`npx windup coverage\`. Preflight before CI: \`npx windup doctor\`. Read-only diagnostics (no LLM): \`windup why <scenario>\` (cache state, re-plan churn, deps, history, last failure), \`windup explain <scenario>\` (the cached plan as readable steps; never shows a fill's value), \`windup diff <scenario>\` (deltas between the last two runs), \`windup badge\` (suite-status SVG or shields.io JSON). \`windup suggest-scenarios\` authors draft scenarios for uncovered routes (site map + LLM, one call per route; \`--dry-run\`/\`--limit\`). \`windup trends [scenario]\` shows per-scenario pass-rate/cost/duration history from the ledger (worst first; a scenario id → its runs over time).
- Author a test: \`npx windup new "<plain-language instruction>"\` → writes a scenario JSON in \`e2e/scenarios/\`. Add \`--validate\` to run and refine it until it passes. Or author BY DEMONSTRATION: \`npx windup record --url <start>\` opens a headful browser, you click the flow + mark a verification with the toolbar, and Windup writes the scenario AND caches the recorded plan ($0 replay, no LLM; a typed password becomes a value_ref, never a literal). Needs a TTY.
- Run: \`npx windup run <scenario_id>\` (first run plans, later runs replay at $0). Whole suite for CI: \`npx windup run --all --reporter junit\` (non-zero exit on failure). Incremental CI: \`--changed\` (vs HEAD) or \`--since <ref>\` runs only scenarios a change affects, with a safe full-suite fallback. Resilient CI: \`--retries N\` re-runs a transient flake (network/verification/setup/dependency, never a forbidden block) and flags it \`flaky\` if it only passes on a retry; \`--max-wall <seconds>\` caps suite wall-clock and exits non-zero if exceeded; \`--bail\` stops on the first failure. Runtime health gates: \`--fail-on-console\` (JS errors: exceptions/console.error/CSP) / \`--fail-on-resource\` (sub-resource 4xx loads — separate so broken images don't drown JS errors) / \`--fail-on-5xx\` (or \`config.failOn\`) fail a scenario on that signal during the run (recorded either way as \`diagnostics.console_errors\` with each error's url + js/resource kind; config.network stubs excluded; \`failOn.ignore\` matches by message OR url). Determinism (applied every run, never cached): \`config.network\` stubs requests by URL+method (status/body/json or abort — a 500, an empty list, a dropped call) and \`config.clock\` pins \`now\` (frozen Date) and/or \`timezone\`. Both are also settable PER SCENARIO (a scenario's \`network\`/\`clock\` merges over the global config, scenario winning) — so an error-state test scopes its stub to one run without affecting other scenarios. Runtime realism: \`--device "<preset>"\` / \`config.device\` emulates a Playwright device (viewport/UA/mobile; cache keyed per device); \`--web-vitals\` / \`config.budgets\` captures TTFB/FCP/LCP/CLS and fails on a budget breach (kind budget). Runtime values (OTP/magic-link) come from author-declared \`config.resolve\` sources (cmd/http/fn), referenced via \`value_ref\`/\`url_ref\` — the value is fetched with polling and never cached.
- A scenario is JSON: \`{ "scenario_id", "start_url"?, "task", "hints"?, "depends_on"?, "setup"?, "teardown"?, "like"?, "seed"?, "requires"?, "tags"?, "on_dialog"?, "atomic_steps"?, "quarantine"?, "network"?, "clock"? }\`. \`requires\` is a list of human-readable DATA preconditions (e.g. "1 active attraction"), shown in the report; \`tags\` selects a subset with \`run --all --tag\`. \`on_dialog: "accept"|"dismiss"\` installs a persistent handler that answers every native confirm/alert for the whole run; \`atomic_steps: true\` forces the planner to emit one interaction per action (no merged reveal-then-act). \`quarantine: true\` lets a known-flaky scenario run and report without failing the suite (non-zero exit) — surfaced, not skipped. When a plan selector misses at replay, Windup retries the target by its accessible name (label/placeholder/role, exactly-one-visible-match) and reports an a11y gap when nothing matches. \`seed: { localStorage?, sessionStorage?, origin? }\` injects browser storage before the plan runs (a cart, a POS device) — deterministic, no server call, great for CI-safe client-side tests. End the \`task\` with what to verify — it becomes the final postcondition; the plan's \`expect\` supports selector/url plus richer kinds: text_contains, count (equals/min/max), not_visible and attribute. Never put secrets in tasks; reference named accounts (\`windup secret set <account>\`), plans use \`value_ref: "ENV:VAR"\` resolved at runtime. Prefer idempotent scenarios; for a non-idempotent write (e.g. a CREATE with a unique key), use \`setup\`/\`teardown\` shell hooks that run outside the cached plan (fixtures / cleanup). \`like: { scenario, set? }\` reuses another scenario's proven plan (same flow, different route/values) with no LLM call — still executed and verified, falling back to LLM planning on any mismatch.

## Documentation

${docLinks}

## Optional

- [Full documentation as one file](${base}${p}/llms-full.txt): every page above concatenated as markdown for single-fetch ingestion
- [GitHub repository](https://github.com/windupjs/windup): source, issues, MIT license
- [npm package](https://www.npmjs.com/package/windupjs)
- [Technical specification (SPEC.md)](https://github.com/windupjs/windup/blob/main/docs/specs/SPEC.md)
`;
}

export function llmsFullHeader(lang: Lang, base: string, summary: string): string {
  const p = lang === 'en' ? '' : `/${lang}`;
  return `# Windup — full documentation

> ${summary}

This file concatenates the entire Windup documentation as clean markdown for LLM consumption. Individual pages are also available at ${base}${p}/docs/<page>.md and mapped in ${base}${p}/llms.txt.
`;
}
