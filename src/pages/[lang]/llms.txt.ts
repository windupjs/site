import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { docsOrder } from '../../data/docsNav';
import { getUi } from '../../i18n';
import type { Lang } from '../../i18n';
import { llmsTxt } from '../../i18n/llmsText';

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
  const docLinks = docsOrder
    .map((slug) => {
      const desc = bySlug[slug]?.data.description;
      const label = c.docs.labels[slug as keyof typeof c.docs.labels] ?? slug;
      return `- [${label}](${base}/${lang}/docs/${slug}.md)${desc ? ': ' + desc : ''}`;
    })
    .join('\n');

  return new Response(llmsTxt(lang, base, c.meta.description, docLinks), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
