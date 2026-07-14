import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

// Exposes each doc page as raw markdown at /docs/<slug>.md — the clean,
// HTML-free version that llms.txt links to and that AI agents can ingest.
export async function getStaticPaths() {
  const entries = await getCollection('docs');
  return entries.map((e) => ({ params: { slug: e.slug }, props: { entry: e } }));
}

export const GET: APIRoute = ({ props }) => {
  const entry = props.entry;
  // point intra-doc links at the markdown versions too
  const md = entry.body.replace(/\]\(\/docs\/([a-z0-9-]+)\)/g, '](/docs/$1.md)');
  return new Response(md, {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
  });
};
