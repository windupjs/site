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
    // Shiki dual-theme syntax highlighting: each token carries a light color
    // and a `--shiki-dark` var; global.css swaps to the dark var when the page
    // is dark (data-theme or prefers-color-scheme). Backgrounds stay ours
    // (--code-bg) so code matches the warm palette in both themes.
    shikiConfig: {
      themes: { light: 'github-light', dark: 'github-dark' },
      wrap: true,
    },
  },
});
