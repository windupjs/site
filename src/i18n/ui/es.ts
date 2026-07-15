import en from './en';

const es = {
  meta: {
    title: 'Windup — Pruebas E2E en lenguaje natural con replay determinista',
    description:
      'Pruebas E2E en lenguaje natural con replay determinista — el LLM planifica una vez, los replays se ejecutan sin él. ~1s, $0 por replay.',
    docsTitleSuffix: ' · Docs de Windup',
  },

  header: {
    nav: { how: 'Cómo funciona', features: 'Características', docs: 'Docs', start: 'Empezar' },
    home: 'Inicio de Windup',
    npm: 'Windup en npm',
    github: 'Windup en GitHub',
    toggleTheme: 'Cambiar tema de color',
    primaryNav: 'Principal',
    language: 'Idioma',
  },

  hero: {
    titleHtml:
      'Escribe pruebas E2E en <span class="hl">lenguaje natural</span>.\n        Reprodúcelas por <span class="hl">$0</span>.',
    ledeHtml:
      'El LLM planifica las acciones del navegador <strong>una vez</strong>. A partir de la segunda ejecución, Windup hace un <strong>replay determinista</strong> con <strong>cero llamadas al LLM</strong> — <span class="mono">~1&nbsp;segundo, $0</span>, resultados estables. Editas escenarios, no selectores.',
    ctaGithub: 'GitHub',
    ctaNpm: 'Ver en npm',
    badgesHtml: [
      'Sin selectores, sin código de prueba',
      '<span class="mono">llm_calls=0</span> en replay',
      'Playwright por debajo',
    ],
    demoTitle: 'windup run checkout',
    demoAlt:
      'Grabación de terminal: se ejecuta un escenario en lenguaje natural; la primera ejecución planifica con llm_calls=1, la segunda hace replay desde caché con llm_calls=0 y $0',
    demoCaptionHtml:
      'Terminal real — la primera ejecución planifica (<span class="mono">llm_calls=1</span>), la segunda hace replay desde caché a <span class="mono">$0</span>.',
  },

  heroCompare: {
    agentName: 'Agente LLM',
    agentSubHtml: 've y piensa cada paso · <span data-a-act>1</span>/5',
    phases: ['captura de pantalla', 'analizar imagen', 'pensar', 'clic / escribir'],
    agentFoot: '↻ repite cada acción',
    windupName: 'Windup',
    windupSub: 'plan en caché · sin modelo',
    windupDone: 'listo — mientras el agente aún piensa',
  },

  pitch: {
    kicker: 'El problema',
    p1Html:
      'Las pruebas E2E escritas a mano se rompen cada vez que se mueve un selector. Los agentes de IA que manejan el navegador en <em>cada</em> ejecución son lentos, no deterministas y te cobran una llamada al LLM por prueba.',
    p2Html:
      'Windup planifica <strong>una vez</strong> y guarda en caché un plan de acciones validado. Los replays son deterministas y gratuitos. Cuando la app cambia y una verificación falla, el plan se invalida y se replanifica automáticamente — se autorepara, no queda silenciosamente incorrecto.',
  },

  howItWorks: {
    kicker: 'Cómo funciona',
    title: 'Planifica una vez con el LLM, luego reproduce sin él.',
    note: 'La parte cara — averiguar las acciones del navegador — ocurre una sola vez y se convierte en datos verificables guardados en caché.',
    flowAria:
      'Flujo: una tarea en lenguaje natural va al planificador LLM, que emite un plan de acciones JSON; un ejecutor determinista con verificación barata lo ejecuta y escribe una caché de trayectoria; las ejecuciones posteriores hacen replay desde la caché con cero LLM, alrededor de un segundo, a coste cero.',
    flow: {
      task: 'Tarea en lenguaje natural',
      planner: 'Planificador',
      plannerSub: 'LLM · 1 llamada',
      plan: 'Plan de acciones JSON',
      executor: 'Ejecutor determinista',
      executorSub: '+ verificación barata',
      cache: 'Caché de trayectoria',
      next: 'Ejecuciones siguientes: 0 LLM · ~1s · $0',
    },
    steps: [
      {
        title: 'Planificar (una vez)',
        body: 'Una tarea en lenguaje natural va al planificador. El LLM emite un plan de acciones JSON — una llamada, solo en la primera ejecución.',
        meta: 'llm_calls=1 · ~$0.0025',
      },
      {
        title: 'Ejecutar + verificar',
        body: 'Un ejecutor determinista (Playwright) ejecuta el plan. Postcondiciones baratas de DOM/URL verifican cada acción — sin LLM.',
        meta: 'eventos de entrada confiables',
      },
      {
        title: 'Replay (gratis)',
        body: 'La trayectoria queda en caché. Cada ejecución posterior la reproduce: cero llamadas al LLM, ~1 segundo, $0, el mismo plan siempre.',
        meta: 'llm_calls=0 · $0',
      },
    ],
    principles: [
      ['Los planes son datos, no código', 'JSON validado por esquema — sin improvisación en tiempo de ejecución.'],
      ['Verificación sin LLM', 'Las postcondiciones comprueban DOM/URL en cada acción.'],
      ['Caché autorreparable', 'Una verificación fallida invalida el plan → replanifica.'],
      ['Cero conocimiento del sitio incrustado', 'El motor no sabe nada de tu app de antemano.'],
    ],
  },

  whyWindup: {
    kicker: 'Por qué Windup',
    title: 'La fiabilidad de los scripts, la ergonomía del lenguaje natural.',
    note: 'Los scripts escritos a mano son baratos de ejecutar pero caros de mantener. Los agentes de IA por ejecución son fáciles de escribir pero lentos y no deterministas. Windup toma la mitad buena de cada uno.',
    dimensionSr: 'Dimensión',
    headers: ['Scripts escritos a mano', 'Agente de IA en cada ejecución', 'Windup'],
    rows: [
      ['Autoría', 'Código + selectores', 'Lenguaje natural', 'Lenguaje natural'],
      ['Coste por ejecución', '$0', 'LLM en cada ejecución', 'LLM solo en la 1ª ejecución'],
      ['Velocidad', 'Rápido', 'Lento (modelo en el bucle)', '~1s replay'],
      ['Determinismo', 'Alto', 'Bajo (improvisa)', 'Alto (el mismo plan siempre)'],
      ['La app cambió', 'Arreglas el script', 'Puede hacer algo incorrecto en silencio', 'La verificación falla → replanifica'],
    ],
  },

  features: {
    kicker: 'Características',
    title: 'Todo lo que necesita un flujo de QA — menos los selectores.',
    note: 'Una CLI hecha para proyectos reales: autoría, secretos, dependencias, seguimiento de costes y reporters de CI.',
    items: [
      { title: 'Escenarios en lenguaje natural', body: 'Describe la prueba en lenguaje natural. Sin selectores, sin page objects, sin código de prueba que mantener.' },
      { title: 'Planifica una vez, reproduce gratis', body: 'A partir de la 2ª ejecución: llm_calls=0, ~1s, $0. El plan en caché se ejecuta igual siempre.' },
      { title: 'Ejecución determinista', body: 'Playwright con eventos de entrada confiables (isTrusted) — clics, escritura y navegación fiables.' },
      { title: 'Verificación barata', body: 'Postcondiciones de DOM/URL comprobadas en cada acción, sin LLM en el bucle.' },
      { title: 'windup new', cmd: true, body: 'Autoría asistida por LLM: escribe el escenario a partir de las pantallas reales de tu app (mapa del sitio) + el manifiesto del proyecto. --validate lo ejecuta y refina hasta que pasa.' },
      { title: 'windup scan', cmd: true, body: 'Indexa tus rutas y elementos directamente desde el código fuente (Next.js, react-router).' },
      { title: 'windup secret', cmd: true, body: 'Las credenciales nunca entran en el escenario, la caché, el prompt del LLM ni git — solo referencias ENV:*, resueltas en tiempo de ejecución.' },
      { title: 'depends_on', cmd: true, body: 'Dependencias entre escenarios (p. ej. "crear factura" depende de "login") — misma sesión, con caché por dependencia.' },
      { title: 'run --summary', cmd: true, body: 'La IA escribe un informe posterior a la ejecución citando valores reales observados — precios, mensajes, confirmaciones.' },
      { title: 'run --suggest', cmd: true, body: 'Ante un fallo, la IA lee la página real y sugiere la corrección para tu escenario.' },
      { title: 'Reporters de CI', body: 'JUnit, JSON y HTML autocontenido (--reporter). Código de salida distinto de cero ante cualquier fallo.' },
      { title: 'Multiproveedor', body: 'Google Gemini y OpenAI, elegidos por ejecución (--llm openai:gpt-5-mini). windup costs rastrea el gasto por proveedor y modelo.' },
      { title: 'run --concurrency', cmd: true, body: 'Ejecuta escenarios en paralelo sobre un único navegador caliente compartido con contextos aislados — ~2× más rápido en una suite mixta, más con planificación o flujos largos. Secuencial por defecto.' },
      { title: 'Multinavegador', body: 'Ejecuta los mismos escenarios en Chromium (por defecto), Firefox o WebKit con --browser. Un único plan se reproduce en los tres — escribe una vez, ejecuta en todos.' },
    ],
  },

  codeExample: {
    kicker: 'Ejemplo',
    title: 'Un escenario es lenguaje natural en JSON. Dos ejecuciones cuentan toda la historia.',
    noteHtml:
      'Tú escribes la intención. La primera ejecución planifica y paga unas décimas de céntimo; cada ejecución posterior es un replay desde caché a <span class="mono">$0</span>.',
    footHtml: '<span class="mono">cache=hit · llm_calls=0 · $0</span> — la segunda ejecución nunca toca el modelo.',
    scenarioLabel: 'checkout.json',
    scenarioLang: 'escenario',
    outputLabel: 'windup run checkout',
    outputLang: 'salida',
  },

  cicd: {
    kicker: 'CI / CD',
    title: 'Intégralo en tu pipeline. Códigos de salida e informes incluidos.',
    note: 'Ejecuta toda la suite en un navegador caliente, haz fallar el build ante cualquier escenario fallido y emite informes legibles por máquina o por humanos.',
    ciLabel: 'ci — una línea',
    pointsHtml: [
      '<span class="mono">--all</span> ejecuta cada escenario en un único navegador caliente para toda la suite.',
      '<span class="mono">--concurrency &lt;n&gt;</span> ejecuta escenarios en paralelo (~2× más rápido en una suite mixta); <span class="mono">--browser firefox|webkit</span> para ejecutar multinavegador.',
      'Código de salida distinto de cero cuando cualquier escenario falla.',
      '<span class="mono">--reporter junit|json|html</span>; <span class="mono">windup costs --json</span> rastrea el gasto de IA en el pipeline.',
    ],
    reportsHeading: 'Informes reales (HTML estático, sin JS)',
    reports: [
      { label: 'Informe HTML completo', note: 'ejecución de la suite, 9/10 (un sitio demo externo caído)' },
      { label: 'Informe de replay', note: 'la misma suite desde caché — llm_calls=0, $0' },
      { label: 'Ejecución con --summary', note: 'informe de IA citando valores reales de la página' },
      { label: 'Ejecución con --suggest', note: 'un fallo, con una corrección sugerida por IA' },
    ],
    bench: { label: 'Benchmark del planificador LLM', note: 'Gemini vs OpenAI en el planificador — precisión, coste, latencia.' },
  },

  reliability: {
    kicker: 'Fiabilidad',
    title: 'Determinista significa determinista.',
    note: 'Los replays se miden, no se prometen. El plan en caché produce el mismo resultado en cada ejecución — sin modelo, sin flakes.',
    stats: [
      { label: 'replays desde caché superados', sub: '4 escenarios × 15 replays — cero flakes' },
      { label: 'en cada replay', sub: 'login · checkout multipaso · añadir/quitar · un 2º sitio' },
      { label: 'por generación', sub: 'modelo por defecto, gemini-3.1-flash-lite' },
      { label: 'dogfood en producción', sub: 'ejecutado contra una app de producción real' },
    ],
    checkAlt: 'La mascota de Windup sosteniendo una marca de verificación verde',
  },

  getStarted: {
    kicker: 'Empezar',
    title: 'Cinco comandos de cero a una prueba con replay.',
    noteHtml:
      'Node ≥ 20 y una clave de API — <span class="mono">GOOGLE_GENERATIVE_AI_API_KEY</span> (Google, por defecto) o <span class="mono">OPENAI_API_KEY</span> (OpenAI) — en <span class="mono">.env.local</span>. Las claves se usan solo para planificar; los replays en caché nunca llaman a un LLM.',
    notes: [
      'Chromium se aprovisiona automáticamente',
      '3 preguntas → windup.config.ts',
      'indexa las rutas de tu app desde el código fuente',
      'autoría asistida por LLM',
      '1ª ejecución planifica · luego replay ~1s, $0',
    ],
    reqChipsHtml: [
      'Node <strong>≥ 20</strong>',
      'Google Gemini <strong>u</strong> OpenAI',
      'Playwright <strong>incluido</strong>',
      'MIT',
    ],
    runnerAlt: 'La mascota de Windup corriendo',
  },

  aiReady: {
    kicker: 'Para la era de la IA',
    title: 'Deja que tu IA arme las pruebas.',
    noteHtml:
      'Ya nadie lee la documentación — se la pasa a un asistente. Por eso Windup incluye un <a href="/es/llms.txt"><code>llms.txt</code></a>: toda la documentación, estructurada para máquinas. Apunta tu agente de código hacia él, describe los flujos con palabras y él escribe y ejecuta los escenarios por ti.',
    card1: { title: 'Dale la documentación a tu IA', body: 'Pega esta URL en tu asistente (Claude, Cursor, Copilot, …).' },
    card2: { title: 'Describe qué probar', body: 'Un prompt inicial listo para pegar — completa tus flujos.' },
    llmsUrl: 'https://windup.run/es/llms.txt',
    promptText:
      'Lee https://windup.run/es/llms.txt y configura pruebas E2E de Windup para mi app, luego escribe escenarios para estos flujos: ...',
    linksHtml:
      '<a href="/es/llms-full.txt">llms-full.txt</a> — toda la documentación en un solo archivo · markdown por página en <code>/es/docs/&lt;page&gt;.md</code> · <a href="https://llmstxt.org" target="_blank" rel="noopener">el estándar llms.txt</a>',
  },

  footer: {
    tagline: 'Pruebas E2E en lenguaje natural con replay determinista.',
    beta: 'beta',
    note: 'Usable y probado. Código abierto bajo la licencia MIT.',
    nav: 'Pie de página',
    links: { npm: 'npm', github: 'GitHub', spec: 'Spec', changelog: 'Changelog', llms: 'llms.txt', license: 'MIT License' },
  },

  copyCommand: { copy: 'Copiar', copied: 'Copiado', aria: 'Copiar comando al portapapeles' },

  docs: {
    ariaSidebar: 'Documentación',
    ariaPager: 'Paginación',
    prev: 'Anterior',
    next: 'Siguiente',
    mobileJump: 'Ir a una página de docs',
    aiNoteHtml:
      '<strong>¿Usas un asistente de IA?</strong> Apúntalo a <a href="/es/llms.txt"><code>/es/llms.txt</code></a> — o <a href="/es/llms-full.txt"><code>/es/llms-full.txt</code></a> para todo en un solo archivo — y luego describe tus flujos. Puede escribir y ejecutar los escenarios por ti.',
    groups: { start: 'Primeros pasos', guides: 'Guías', reference: 'Referencia' },
    labels: {
      'getting-started': 'Primeros pasos',
      'how-it-works': 'Cómo funciona',
      scenarios: 'Escenarios',
      credentials: 'Credenciales de prueba',
      environments: 'Entornos',
      'llm-providers': 'Proveedores de LLM',
      'ci-cd': 'CI / CD',
      configuration: 'Configuración',
      api: 'API programática',
      commands: 'Comandos',
      architecture: 'Arquitectura y especificación',
      techniques: 'Notas de ingeniería',
    },
  },
} satisfies typeof en;

export default es;
