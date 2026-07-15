import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { docsOrder } from '../data/docsNav';
import en from '../i18n/ui/en';
import { llmsTxt } from '../i18n/llmsText';

// /llms.txt — the curated map an AI reads first (llmstxt.org spec).
export const GET: APIRoute = async ({ site }) => {
  const base = (site ?? new URL('https://windup.run')).origin;
  const entries = await getCollection('docs');
  const bySlug = Object.fromEntries(
    entries.filter((e) => e.slug.startsWith('en/')).map((e) => [e.slug.replace('en/', ''), e])
  );
  const docLinks = docsOrder
    .map((slug) => {
      const desc = bySlug[slug]?.data.description;
      const label = en.docs.labels[slug as keyof typeof en.docs.labels] ?? slug;
      return `- [${label}](${base}/docs/${slug}.md)${desc ? ': ' + desc : ''}`;
    })
    .join('\n');

  return new Response(llmsTxt('en', base, en.meta.description, docLinks), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
