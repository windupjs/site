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
- Initialize a project: \`npx windup init\`. Index the app's routes/elements from source: \`npx windup scan\`.
- Author a test: \`npx windup new "<plain-language instruction>"\` → writes a scenario JSON in \`e2e/scenarios/\`. Add \`--validate\` to run and refine it until it passes.
- Run: \`npx windup run <scenario_id>\` (first run plans, later runs replay at $0). Whole suite for CI: \`npx windup run --all --reporter junit\` (non-zero exit on failure). Incremental CI: \`--changed\` (vs HEAD) or \`--since <ref>\` runs only scenarios a change affects, with a safe full-suite fallback.
- A scenario is JSON: \`{ "scenario_id", "start_url"?, "task", "hints"?, "depends_on"?, "setup"?, "teardown"?, "like"? }\`. End the \`task\` with what to verify — it becomes the final postcondition. Never put secrets in tasks; reference named accounts (\`windup secret set <account>\`), plans use \`value_ref: "ENV:VAR"\` resolved at runtime. Prefer idempotent scenarios; for a non-idempotent write (e.g. a CREATE with a unique key), use \`setup\`/\`teardown\` shell hooks that run outside the cached plan (fixtures / cleanup). \`like: { scenario, set? }\` reuses another scenario's proven plan (same flow, different route/values) with no LLM call — still executed and verified, falling back to LLM planning on any mismatch.

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
