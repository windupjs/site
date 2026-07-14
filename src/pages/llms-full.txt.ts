import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { docsOrder } from '../data/docsNav';

// /llms-full.txt — the entire documentation as one clean markdown file,
// so an AI can ingest everything in a single fetch.
export const GET: APIRoute = async ({ site }) => {
  const base = (site ?? new URL('https://windup.run')).origin;
  const entries = await getCollection('docs');
  const bySlug = Object.fromEntries(entries.map((e) => [e.slug, e]));

  const header = `# Windup — full documentation

> Natural-language E2E tests with deterministic replay — the LLM plans once, replays run without it (~1 second, $0, stable). Open-source (MIT), npm package \`windupjs\`. Site: ${base}

This file concatenates the entire Windup documentation as clean markdown for LLM consumption. Individual pages are also available at ${base}/docs/<page>.md and mapped in ${base}/llms.txt.
`;

  const sections = docsOrder
    .map((d) => bySlug[d.slug]?.body?.trim())
    .filter(Boolean)
    .join('\n\n---\n\n')
    .replace(/\]\(\/docs\/([a-z0-9-]+)\)/g, `](${base}/docs/$1.md)`);

  return new Response(`${header}\n---\n\n${sections}\n`, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
