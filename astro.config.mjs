// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// https://astro.build
export default defineConfig({
  site: 'https://windup.run',
  compressHTML: true,
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'pt', 'es', 'zh'],
    routing: { prefixDefaultLocale: false },
  },
  integrations: [
    sitemap({
      i18n: {
        defaultLocale: 'en',
        locales: { en: 'en', pt: 'pt-BR', es: 'es', zh: 'zh-Hans' },
      },
      // keep the raw .md / llms.txt endpoints out of the sitemap
      filter: (page) => !/\.(md|txt)$/.test(page),
    }),
  ],
  markdown: {
    // Plain code blocks styled with our own tokens — guarantees correct
    // rendering in both light and dark themes (no baked-in Shiki colors).
    syntaxHighlight: false,
  },
});
