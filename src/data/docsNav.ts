// Docs structure — slugs + order + grouping. Labels/group titles are resolved
// per-locale from the i18n dictionary (src/i18n/ui/*.ts → docs.groups / docs.labels).

export interface DocGroup {
  key: 'start' | 'guides' | 'reference';
  items: string[];
}

export const docsNav: DocGroup[] = [
  { key: 'start', items: ['getting-started', 'how-it-works'] },
  { key: 'guides', items: ['scenarios', 'credentials', 'environments', 'llm-providers', 'ci-cd', 'configuration', 'api'] },
  { key: 'reference', items: ['commands', 'architecture', 'techniques'] },
];

/** Flattened slug order for prev/next navigation. */
export const docsOrder: string[] = docsNav.flatMap((g) => g.items);
