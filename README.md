# Windup — website

Source for **[windup.run](https://windup.run)** — the landing page and documentation for
[Windup](https://github.com/windupjs/windup): natural-language E2E tests with deterministic replay.

Built with [Astro](https://astro.build) (static output). Warm-neutral / brass design system,
light + dark themes.

## Develop

```bash
npm install
npm run dev        # http://localhost:4321
npm run build      # static output → dist/
npm run preview    # serve the built dist/
```

Requires Node >= 20.

## Structure

- `src/pages/` — routes: `index.astro` (landing), `docs/` (documentation),
  `llms.txt.ts` / `llms-full.txt.ts` (AI-facing endpoints), `docs/[slug].md.ts` (raw markdown per page)
- `src/content/docs/` — documentation pages (markdown, one file per page)
- `src/data/docsNav.ts` — docs sidebar order & grouping
- `src/components/` — landing sections + shared UI (CopyCommand, CodeBlock, Header, Footer…)
- `src/layouts/` — `Layout.astro` (base) and `DocsLayout.astro` (docs shell)
- `src/styles/global.css` — design tokens + prose styles
- `public/` — static assets (brand, demo gif, live HTML report examples)

## AI-facing docs (llms.txt)

The site publishes the [llms.txt standard](https://llmstxt.org):

- `/llms.txt` — curated map for AI agents
- `/llms-full.txt` — the whole documentation in one markdown file
- `/docs/<page>.md` — each doc page as raw markdown

Docs content is adapted from the [windup repo](https://github.com/windupjs/windup)
(`packages/windup/README.md` + `docs/specs/SPEC.md`); that repo is the source of truth.

## Deploy

Cloudflare Pages — build command `npm run build`, output directory `dist`. Domain: `windup.run`.

## License

MIT
