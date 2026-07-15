// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build
export default defineConfig({
  site: 'https://windup.run',
  compressHTML: true,
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'pt', 'es', 'zh'],
    routing: { prefixDefaultLocale: false },
  },
  markdown: {
    // Plain code blocks styled with our own tokens — guarantees correct
    // rendering in both light and dark themes (no baked-in Shiki colors).
    syntaxHighlight: false,
  },
});
