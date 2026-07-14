import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { docsOrder } from '../data/docsNav';

// /llms.txt — the curated map an AI reads first (llmstxt.org spec):
// H1 name, a blockquote summary, orientation prose, then link lists.
export const GET: APIRoute = async ({ site }) => {
  const base = (site ?? new URL('https://windup.run')).origin;
  const entries = await getCollection('docs');
  const bySlug = Object.fromEntries(entries.map((e) => [e.slug, e]));

  const docLinks = docsOrder
    .map((d) => {
      const desc = bySlug[d.slug]?.data.description;
      return `- [${d.label}](${base}/docs/${d.slug}.md)${desc ? ': ' + desc : ''}`;
    })
    .join('\n');

  const text = `# Windup

> Natural-language E2E tests with deterministic replay. Describe a browser test in plain language; an LLM plans the actions once, then every later run replays deterministically with zero LLM calls — ~1 second, $0, stable results. Open-source (MIT), Node >= 20, Playwright engine, npm package \`windupjs\` (bin \`windup\`).

Windup turns a plain-language task into a schema-validated JSON action plan, executes it deterministically with cheap DOM/URL verification after every step, and caches the trajectory. The second run replays the cached plan with no model calls. When the app changes and a verification fails, the plan is invalidated and re-planned automatically — you edit scenarios, not selectors.

Fast facts for driving the tool:
- Install: \`npm i -D windupjs\` (Chromium auto-provisioned). Requires Node >= 20 and one API key in \`.env.local\`: \`GOOGLE_GENERATIVE_AI_API_KEY\` (Google, default) or \`OPENAI_API_KEY\` (OpenAI). Keys are used only for planning; cached replays never call an LLM.
- Initialize a project: \`npx windup init\`. Index the app's routes/elements from source: \`npx windup scan\`.
- Author a test: \`npx windup new "<plain-language instruction>"\` → writes a scenario JSON in \`e2e/scenarios/\`. Add \`--validate\` to run and refine it until it passes.
- Run: \`npx windup run <scenario_id>\` (first run plans, later runs replay at $0). Whole suite for CI: \`npx windup run --all --reporter junit\` (non-zero exit on failure).
- A scenario is JSON: \`{ "scenario_id", "start_url"?, "task", "hints"?, "depends_on"? }\`. End the \`task\` with what to verify — it becomes the final postcondition. Never put secrets in tasks; reference named accounts (\`windup secret set <account>\`), plans use \`value_ref: "ENV:VAR"\` resolved at runtime.

## Documentation

${docLinks}

## Optional

- [Full documentation as one file](${base}/llms-full.txt): every page above concatenated as markdown for single-fetch ingestion
- [GitHub repository](https://github.com/windupjs/windup): source, issues, MIT license
- [npm package](https://www.npmjs.com/package/windupjs)
- [Technical specification (SPEC.md)](https://github.com/windupjs/windup/blob/main/docs/specs/SPEC.md)
`;

  return new Response(text, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
