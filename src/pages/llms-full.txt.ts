import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { docsOrder } from '../data/docsNav';
import en from '../i18n/ui/en';
import { llmsFullHeader } from '../i18n/llmsText';

// /llms-full.txt — the entire documentation as one clean markdown file.
export const GET: APIRoute = async ({ site }) => {
  const base = (site ?? new URL('https://windup.run')).origin;
  const entries = await getCollection('docs');
  const bySlug = Object.fromEntries(
    entries.filter((e) => e.slug.startsWith('en/')).map((e) => [e.slug.replace('en/', ''), e])
  );
  const sections = docsOrder
    .map((slug) => bySlug[slug]?.body?.trim())
    .filter(Boolean)
    .join('\n\n---\n\n')
    .replace(/\]\(\/docs\/([a-z0-9-]+)\)/g, `](${base}/docs/$1.md)`);

  const text = `${llmsFullHeader('en', base, en.meta.description)}\n---\n\n${sections}\n`;
  return new Response(text, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
