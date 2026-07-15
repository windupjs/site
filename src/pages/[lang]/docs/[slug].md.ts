import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

// Raw markdown per localized doc page at /<lang>/docs/<slug>.md
export async function getStaticPaths() {
  const entries = await getCollection('docs');
  return entries
    .filter((e) => !e.slug.startsWith('en/'))
    .map((e) => {
      const [lang, ...rest] = e.slug.split('/');
      return { params: { lang, slug: rest.join('/') }, props: { entry: e, lang } };
    });
}

export const GET: APIRoute = ({ props }) => {
  const { entry, lang } = props;
  const md = entry.body.replace(/\]\(\/docs\/([a-z0-9-]+)\)/g, `](/${lang}/docs/$1.md)`);
  return new Response(md, {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
  });
};
