// English UI dictionary — the canonical structure. Other locales mirror this shape.
// Fields ending in `Html` are rendered with set:html (they carry inline markup).
// Code-like tokens (CLI commands, selectors, $0, ENV names, JSON) stay untranslated.

const en = {
  meta: {
    title: 'Windup — Natural-language E2E tests with deterministic replay',
    description:
      'Natural-language E2E tests with deterministic replay — the LLM plans once, replays run without it. ~1s, $0 per replay.',
    docsTitleSuffix: ' · Windup docs',
  },

  header: {
    nav: { how: 'How it works', features: 'Features', docs: 'Docs', start: 'Get started' },
    home: 'Windup home',
    npm: 'Windup on npm',
    github: 'Windup on GitHub',
    toggleTheme: 'Toggle color theme',
    primaryNav: 'Primary',
    language: 'Language',
  },

  hero: {
    titleHtml:
      'Write E2E tests in <span class="hl">plain language</span>.\n        Replay them for <span class="hl">$0</span>.',
    ledeHtml:
      'The LLM plans the browser actions <strong>once</strong>. From the second run on, Windup does a <strong>deterministic replay</strong> with <strong>zero LLM calls</strong> — <span class="mono">~1&nbsp;second, $0</span>, stable results. You edit scenarios, not selectors.',
    ctaGithub: 'GitHub',
    ctaNpm: 'View on npm',
    badgesHtml: [
      'No selectors, no test code',
      '<span class="mono">llm_calls=0</span> on replay',
      'Playwright under the hood',
    ],
    demoTitle: 'windup run checkout',
    demoAlt:
      'Terminal recording: a natural-language scenario runs; first run plans with llm_calls=1, the second run replays from cache with llm_calls=0 and $0',
    demoCaptionHtml:
      'Real terminal — first run plans (<span class="mono">llm_calls=1</span>), the second run replays from cache at <span class="mono">$0</span>.',
  },

  heroCompare: {
    agentName: 'LLM agent',
    agentSubHtml: 'sees &amp; thinks every step · <span data-a-act>1</span>/5',
    phases: ['screenshot', 'analyze image', 'think', 'click / type'],
    agentFoot: '↻ repeats every action',
    windupName: 'Windup',
    windupSub: 'cached plan · no model',
    windupDone: 'done — while the agent still thinks',
  },

  pitch: {
    kicker: 'The problem',
    p1Html:
      'Hand-written E2E tests break every time a selector moves. AI agents that drive the browser on <em>every</em> run are slow, non-deterministic, and bill you an LLM call per test.',
    p2Html:
      'Windup plans <strong>once</strong> and caches a validated action plan. Replays are deterministic and free. When the app changes and a check fails, the plan is invalidated and re-planned automatically — self-healing, not silently wrong.',
  },

  howItWorks: {
    kicker: 'How it works',
    title: 'Plan once with the LLM, then replay without it.',
    note: 'The expensive part — figuring out the browser actions — happens a single time and is turned into cached, verifiable data.',
    flowAria:
      'Flow: a natural-language task goes to the LLM planner, which emits a JSON action plan; a deterministic executor with cheap verification runs it and writes a trajectory cache; later runs replay from the cache with zero LLM, about one second, at zero cost.',
    flow: {
      task: 'Natural-language task',
      planner: 'Planner',
      plannerSub: 'LLM · 1 call',
      plan: 'JSON action plan',
      executor: 'Deterministic executor',
      executorSub: '+ cheap verify',
      cache: 'Trajectory cache',
      next: 'Next runs: 0 LLM · ~1s · $0',
    },
    steps: [
      {
        title: 'Plan (once)',
        body: 'A natural-language task goes to the planner. The LLM emits a JSON action plan — one call, on the first run only.',
        meta: 'llm_calls=1 · ~$0.0025',
      },
      {
        title: 'Execute + verify',
        body: 'A deterministic executor (Playwright) runs the plan. Cheap DOM/URL post-conditions verify each action — no LLM.',
        meta: 'trusted input events',
      },
      {
        title: 'Replay (free)',
        body: 'The trajectory is cached. Every later run replays it: zero LLM calls, ~1 second, $0, same plan every time.',
        meta: 'llm_calls=0 · $0',
      },
    ],
    principles: [
      ['Plans are data, not code', 'Schema-validated JSON — no runtime improvisation.'],
      ['Verification without LLM', 'Post-conditions check DOM/URL on every action.'],
      ['Self-healing cache', 'A failed check invalidates the plan → re-plan.'],
      ['Zero hardcoded site knowledge', 'The engine knows nothing about your app up front.'],
    ],
  },

  whyWindup: {
    kicker: 'Why Windup',
    title: 'The reliability of scripts, the ergonomics of natural language.',
    note: 'Hand-written scripts are cheap to run but expensive to maintain. Per-run AI agents are easy to write but slow and non-deterministic. Windup takes the good half of each.',
    dimensionSr: 'Dimension',
    headers: ['Hand-written scripts', 'AI agent every run', 'Windup'],
    rows: [
      ['Authoring', 'Code + selectors', 'Natural language', 'Natural language'],
      ['Cost per run', '$0', 'LLM on every run', 'LLM on the 1st run only'],
      ['Speed', 'Fast', 'Slow (model in the loop)', '~1s replay'],
      ['Determinism', 'High', 'Low (improvises)', 'High (same plan every time)'],
      ['App changed', 'You fix the script', 'May do the wrong thing silently', 'Check fails → re-plans'],
    ],
  },

  features: {
    kicker: 'Features',
    title: 'Everything a QA workflow needs — minus the selectors.',
    note: 'A CLI built for real projects: authoring, secrets, dependencies, cost tracking and CI reporters.',
    items: [
      { title: 'Natural-language scenarios', body: 'Describe the test in plain language. No selectors, no page objects, no test code to maintain.' },
      { title: 'Plan once, replay free', body: 'From the 2nd run on: llm_calls=0, ~1s, $0. The cached plan runs the same way every time.' },
      { title: 'Deterministic execution', body: 'Playwright with trusted input events (isTrusted) — reliable clicks, typing and navigation.' },
      { title: 'Cheap verification', body: 'DOM/URL post-conditions checked on every action, with no LLM in the loop.' },
      { title: 'windup new', cmd: true, body: 'LLM-assisted authoring: writes the scenario from your app’s real screens (site map) + project manifest. --validate runs and refines until it passes.' },
      { title: 'windup scan', cmd: true, body: 'Indexes your routes and elements straight from the source (Next.js, react-router).' },
      { title: 'windup secret', cmd: true, body: 'Credentials never enter the scenario, cache, LLM prompt or git — only ENV:* references, resolved at runtime.' },
      { title: 'depends_on', cmd: true, body: 'Dependencies between scenarios (e.g. "create invoice" depends on "login") — same session, cached per dependency.' },
      { title: 'run --summary', cmd: true, body: 'The AI writes a post-run debrief quoting real observed values — prices, messages, confirmations.' },
      { title: 'run --suggest', cmd: true, body: 'On failure, the AI reads the real page and suggests the fix to your scenario.' },
      { title: 'CI reporters', body: 'JUnit, JSON and self-contained HTML (--reporter). Non-zero exit code on any failure.' },
      { title: 'Multi-provider', body: 'Google Gemini and OpenAI, picked per run (--llm openai:gpt-5-mini). windup costs tracks spend by provider and model.' },
      { title: 'run --concurrency', cmd: true, body: 'Run scenarios in parallel over one shared warm browser with isolated contexts — ~2× faster on a mixed suite, more with planning or long flows. Sequential by default.' },
      { title: 'Cross-browser', body: 'Run the same scenarios on Chromium (default), Firefox or WebKit with --browser. A single plan replays across all three — author once, run everywhere.' },
    ],
  },

  codeExample: {
    kicker: 'Example',
    title: 'A scenario is natural language in JSON. Two runs tell the whole story.',
    noteHtml:
      'You write the intent. The first run plans and pays a few tenths of a cent; every run after that is a cached replay at <span class="mono">$0</span>.',
    footHtml: '<span class="mono">cache=hit · llm_calls=0 · $0</span> — the second run never touches the model.',
    scenarioLabel: 'checkout.json',
    scenarioLang: 'scenario',
    outputLabel: 'windup run checkout',
    outputLang: 'output',
  },

  cicd: {
    kicker: 'CI / CD',
    title: 'Drop it into your pipeline. Exit codes and reports included.',
    note: 'Run the whole suite in one warm browser, fail the build on any failing scenario, and emit machine- or human-readable reports.',
    ciLabel: 'ci — one line',
    pointsHtml: [
      '<span class="mono">--all</span> runs every scenario in a single warm browser for the whole suite.',
      '<span class="mono">--concurrency &lt;n&gt;</span> runs scenarios in parallel (~2× faster on a mixed suite); <span class="mono">--browser firefox|webkit</span> to run cross-browser.',
      'Non-zero exit code when any scenario fails.',
      '<span class="mono">--reporter junit|json|html</span>; <span class="mono">windup costs --json</span> tracks AI spend in the pipeline.',
    ],
    reportsHeading: 'Real reports (static HTML, no JS)',
    reports: [
      { label: 'Full HTML report', note: 'suite run, 9/10 (one external demo site down)' },
      { label: 'Replay report', note: 'same suite from cache — llm_calls=0, $0' },
      { label: '--summary run', note: 'AI debrief quoting real page values' },
      { label: '--suggest run', note: 'a failure, with an AI-suggested fix' },
    ],
    bench: { label: 'LLM planner benchmark', note: 'Gemini vs OpenAI on the planner — accuracy, cost, latency.' },
  },

  reliability: {
    kicker: 'Reliability',
    title: 'Deterministic means deterministic.',
    note: 'Replays are measured, not promised. The cached plan produces the same result on every run — no model, no flakes.',
    stats: [
      { label: 'cached replays passed', sub: '4 scenarios × 15 replays — zero flakes' },
      { label: 'on every replay', sub: 'login · multi-step checkout · add/remove · a 2nd site' },
      { label: 'per generation', sub: 'default model, gemini-3.1-flash-lite' },
      { label: 'production dogfood', sub: 'run against a real production app' },
    ],
    checkAlt: 'Windup mascot holding a green check mark',
  },

  getStarted: {
    kicker: 'Get started',
    title: 'Five commands from zero to a replaying test.',
    noteHtml:
      'Node ≥ 20 and one API key — <span class="mono">GOOGLE_GENERATIVE_AI_API_KEY</span> (Google, default) or <span class="mono">OPENAI_API_KEY</span> (OpenAI) — in <span class="mono">.env.local</span>. Keys are used only for planning; cached replays never call an LLM.',
    notes: [
      'Chromium is provisioned automatically',
      '3 questions → windup.config.ts',
      'indexes your app’s routes from the source',
      'LLM-assisted authoring',
      '1st run plans · then replay ~1s, $0',
    ],
    reqChipsHtml: [
      'Node <strong>≥ 20</strong>',
      'Google Gemini <strong>or</strong> OpenAI',
      'Playwright <strong>bundled</strong>',
      'MIT',
    ],
    runnerAlt: 'Windup mascot running',
  },

  aiReady: {
    kicker: 'For the AI era',
    title: 'Let your AI wire up the tests.',
    noteHtml:
      'Nobody reads docs anymore — they hand them to an assistant. So Windup ships an <a href="/llms.txt"><code>llms.txt</code></a>: the whole documentation, structured for machines. Point your coding agent at it, describe the flows in plain words, and it authors and runs the scenarios for you.',
    card1: { title: 'Give your AI the docs', body: 'Paste this URL into your assistant (Claude, Cursor, Copilot, …).' },
    card2: { title: 'Describe what to test', body: 'A ready-to-paste starting prompt — fill in your flows.' },
    llmsUrl: 'https://windup.run/llms.txt',
    promptText:
      'Read https://windup.run/llms.txt and set up Windup E2E tests for my app, then write scenarios for these flows: ...',
    linksHtml:
      '<a href="/llms-full.txt">llms-full.txt</a> — the entire docs in one file · per-page markdown at <code>/docs/&lt;page&gt;.md</code> · <a href="https://llmstxt.org" target="_blank" rel="noopener">the llms.txt standard</a>',
  },

  footer: {
    tagline: 'Natural-language E2E tests with deterministic replay.',
    beta: 'beta',
    note: 'Usable and tested. Open-source under the MIT license.',
    nav: 'Footer',
    links: { npm: 'npm', github: 'GitHub', spec: 'Spec', changelog: 'Changelog', llms: 'llms.txt', license: 'MIT License' },
  },

  copyCommand: { copy: 'Copy', copied: 'Copied', aria: 'Copy command to clipboard' },

  docs: {
    ariaSidebar: 'Documentation',
    ariaPager: 'Pagination',
    prev: 'Previous',
    next: 'Next',
    mobileJump: 'Jump to a docs page',
    aiNoteHtml:
      '<strong>Using an AI assistant?</strong> Point it at <a href="/llms.txt"><code>/llms.txt</code></a> — or <a href="/llms-full.txt"><code>/llms-full.txt</code></a> for the whole thing in one file — then describe your flows. It can author and run the scenarios for you.',
    groups: { start: 'Getting started', guides: 'Guides', reference: 'Reference' },
    labels: {
      'getting-started': 'Getting started',
      'how-it-works': 'How it works',
      scenarios: 'Scenarios',
      credentials: 'Test credentials',
      environments: 'Environments',
      'llm-providers': 'LLM providers',
      'ci-cd': 'CI / CD',
      configuration: 'Configuration',
      api: 'Programmatic API',
      commands: 'Commands',
      architecture: 'Architecture & spec',
      techniques: 'Engineering notes',
    },
  },
};

export default en;
