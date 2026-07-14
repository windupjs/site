// Single source of truth for docs order + sidebar grouping.
// Page content lives in src/content/docs/<slug>.md; this controls navigation.

export interface DocLink {
  slug: string;
  label: string;
}
export interface DocGroup {
  title: string;
  items: DocLink[];
}

export const docsNav: DocGroup[] = [
  {
    title: 'Getting started',
    items: [
      { slug: 'getting-started', label: 'Getting started' },
      { slug: 'how-it-works', label: 'How it works' },
    ],
  },
  {
    title: 'Guides',
    items: [
      { slug: 'scenarios', label: 'Scenarios' },
      { slug: 'credentials', label: 'Test credentials' },
      { slug: 'environments', label: 'Environments' },
      { slug: 'llm-providers', label: 'LLM providers' },
      { slug: 'ci-cd', label: 'CI / CD' },
      { slug: 'configuration', label: 'Configuration' },
      { slug: 'api', label: 'Programmatic API' },
    ],
  },
  {
    title: 'Reference',
    items: [
      { slug: 'commands', label: 'Commands' },
      { slug: 'architecture', label: 'Architecture & spec' },
      { slug: 'techniques', label: 'Engineering notes' },
    ],
  },
];

// Flattened order for prev/next navigation.
export const docsOrder: DocLink[] = docsNav.flatMap((g) => g.items);
