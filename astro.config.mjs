// @ts-check
import { defineConfig } from 'astro/config';

import cloudflare from "@astrojs/cloudflare";

// https://astro.build
export default defineConfig({
  site: 'https://windup.run',
  compressHTML: true,

  markdown: {
    // Plain code blocks styled with our own tokens — guarantees correct
    // rendering in both light and dark themes (no baked-in Shiki colors).
    syntaxHighlight: false,
  },

  output: "hybrid",
  adapter: cloudflare()
});