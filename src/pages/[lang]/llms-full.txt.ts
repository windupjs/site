import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { docsOrder } from '../../data/docsNav';
import { getUi } from '../../i18n';
import type { Lang } from '../../i18n';
import { llmsFullHeader } from '../../i18n/llmsText';

export function getStaticPaths() {
  return [{ params: { lang: 'pt' } }, { params: { lang: 'es' } }, { params: { lang: 'zh' } }];
}

export const GET: APIRoute = async ({ site, params }) => {
  const lang = params.lang as Lang;
  const base = (site ?? new URL('https://windup.run')).origin;
  const c = getUi(lang);
  const entries = await getCollection('docs');
  const bySlug = Object.fromEntries(
    entries.filter((e) => e.slug.startsWith(`${lang}/`)).map((e) => [e.slug.replace(`${lang}/`, ''), e])
  );
  const sections = docsOrder
    .map((slug) => bySlug[slug]?.body?.trim())
    .filter(Boolean)
    .join('\n\n---\n\n')
    .replace(/\]\(\/docs\/([a-z0-9-]+)\)/g, `](${base}/${lang}/docs/$1.md)`);

  const text = `${llmsFullHeader(lang, base, c.meta.description)}\n---\n\n${sections}\n`;
  return new Response(text, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
