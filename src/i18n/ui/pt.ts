// Brazilian Portuguese (pt-BR) UI dictionary — mirrors the structure of en.ts.
// Fields ending in `Html` are rendered with set:html (they carry inline markup).
// Code-like tokens (CLI commands, selectors, $0, ENV names, JSON) stay untranslated.

import en from './en';

const pt = {
  meta: {
    title: 'Windup — Testes E2E em linguagem natural com replay determinístico',
    description:
      'Testes E2E em linguagem natural com replay determinístico — o LLM planeja uma vez, os replays rodam sem ele. ~1s, $0 por replay.',
    docsTitleSuffix: ' · Documentação do Windup',
  },

  header: {
    nav: { how: 'Como funciona', features: 'Recursos', docs: 'Documentação', start: 'Começar' },
    home: 'Página inicial do Windup',
    npm: 'Windup no npm',
    github: 'Windup no GitHub',
    toggleTheme: 'Alternar tema de cor',
    primaryNav: 'Principal',
    language: 'Idioma',
  },

  hero: {
    titleHtml:
      'Escreva testes E2E em <span class="hl">linguagem simples</span>.\n        Replay por <span class="hl">$0</span>.',
    ledeHtml:
      'O LLM planeja as ações do navegador <strong>uma vez</strong>. A partir da segunda execução, o Windup faz um <strong>replay determinístico</strong> com <strong>zero chamadas ao LLM</strong> — <span class="mono">~1&nbsp;segundo, $0</span>, resultados estáveis. Você edita cenários, não seletores.',
    ctaGithub: 'GitHub',
    ctaNpm: 'Ver no npm',
    badgesHtml: [
      'Sem seletores, sem código de teste',
      '<span class="mono">llm_calls=0</span> no replay',
      'Playwright por baixo dos panos',
    ],
    demoTitle: 'windup run checkout',
    demoAlt:
      'Gravação de terminal: um cenário em linguagem natural roda; a primeira execução planeja com llm_calls=1, a segunda faz replay do cache com llm_calls=0 e $0',
    demoCaptionHtml:
      'Terminal real — a primeira execução planeja (<span class="mono">llm_calls=1</span>), a segunda faz replay do cache por <span class="mono">$0</span>.',
  },

  heroCompare: {
    agentName: 'Agente LLM',
    agentSubHtml: 'vê &amp; pensa a cada passo · <span data-a-act>1</span>/5',
    phases: ['screenshot', 'analisar imagem', 'pensar', 'clicar / digitar'],
    agentFoot: '↻ repete cada ação',
    windupName: 'Windup',
    windupSub: 'plano em cache · sem modelo',
    windupDone: 'concluído — enquanto o agente ainda pensa',
  },

  pitch: {
    kicker: 'O problema',
    p1Html:
      'Testes E2E escritos à mão quebram toda vez que um seletor muda de lugar. Agentes de IA que dirigem o navegador em <em>cada</em> execução são lentos, não determinísticos e cobram uma chamada ao LLM por teste.',
    p2Html:
      'O Windup planeja <strong>uma vez</strong> e guarda em cache um plano de ações validado. Os replays são determinísticos e gratuitos. Quando o app muda e uma verificação falha, o plano é invalidado e replanejado automaticamente — autorreparável, não silenciosamente errado.',
  },

  howItWorks: {
    kicker: 'Como funciona',
    title: 'Planeje uma vez com o LLM, depois faça replay sem ele.',
    note: 'A parte cara — descobrir as ações do navegador — acontece uma única vez e é transformada em dados verificáveis em cache.',
    flowAria:
      'Fluxo: uma tarefa em linguagem natural vai para o planejador LLM, que emite um plano de ações em JSON; um executor determinístico com verificação barata roda o plano e grava um cache de trajetória; execuções posteriores fazem replay do cache com zero LLM, cerca de um segundo, a custo zero.',
    flow: {
      task: 'Tarefa em linguagem natural',
      planner: 'Planejador',
      plannerSub: 'LLM · 1 chamada',
      plan: 'Plano de ações em JSON',
      executor: 'Executor determinístico',
      executorSub: '+ verificação barata',
      cache: 'Cache de trajetória',
      next: 'Próximas execuções: 0 LLM · ~1s · $0',
    },
    steps: [
      {
        title: 'Planejar (uma vez)',
        body: 'Uma tarefa em linguagem natural vai para o planejador. O LLM emite um plano de ações em JSON — uma chamada, apenas na primeira execução.',
        meta: 'llm_calls=1 · ~$0.0025',
      },
      {
        title: 'Executar + verificar',
        body: 'Um executor determinístico (Playwright) roda o plano. Pós-condições baratas de DOM/URL verificam cada ação — sem LLM.',
        meta: 'eventos de entrada confiáveis',
      },
      {
        title: 'Replay (grátis)',
        body: 'A trajetória fica em cache. Cada execução posterior faz replay dela: zero chamadas ao LLM, ~1 segundo, $0, o mesmo plano todas as vezes.',
        meta: 'llm_calls=0 · $0',
      },
    ],
    principles: [
      ['Planos são dados, não código', 'JSON validado por schema — sem improviso em tempo de execução.'],
      ['Verificação sem LLM', 'Pós-condições checam DOM/URL em cada ação.'],
      ['Cache autorreparável', 'Uma verificação que falha invalida o plano → replaneja.'],
      ['Zero conhecimento do site embutido', 'O motor não sabe nada sobre o seu app de antemão.'],
    ],
  },

  whyWindup: {
    kicker: 'Por que Windup',
    title: 'A confiabilidade dos scripts, a ergonomia da linguagem natural.',
    note: 'Scripts escritos à mão são baratos de rodar, mas caros de manter. Agentes de IA por execução são fáceis de escrever, mas lentos e não determinísticos. O Windup pega a metade boa de cada um.',
    dimensionSr: 'Dimensão',
    headers: ['Scripts à mão', 'Agente de IA a cada execução', 'Windup'],
    rows: [
      ['Autoria', 'Código + seletores', 'Linguagem natural', 'Linguagem natural'],
      ['Custo por execução', '$0', 'LLM em cada execução', 'LLM apenas na 1ª execução'],
      ['Velocidade', 'Rápido', 'Lento (modelo no loop)', '~1s replay'],
      ['Determinismo', 'Alto', 'Baixo (improvisa)', 'Alto (mesmo plano toda vez)'],
      ['App mudou', 'Você conserta o script', 'Pode fazer a coisa errada em silêncio', 'Verificação falha → replaneja'],
    ],
  },

  features: {
    kicker: 'Recursos',
    title: 'Tudo que um fluxo de QA precisa — menos os seletores.',
    note: 'Uma CLI feita para projetos reais: autoria, segredos, dependências, controle de custos e relatórios de CI.',
    items: [
      { title: 'Cenários em linguagem natural', body: 'Descreva o teste em linguagem simples. Sem seletores, sem page objects, sem código de teste para manter.' },
      { title: 'Planeje uma vez, replay grátis', body: 'A partir da 2ª execução: llm_calls=0, ~1s, $0. O plano em cache roda igual todas as vezes.' },
      { title: 'Execução determinística', body: 'Playwright com eventos de entrada confiáveis (isTrusted) — cliques, digitação e navegação confiáveis.' },
      { title: 'Verificação barata', body: 'Pós-condições de DOM/URL checadas em cada ação, sem LLM no loop.' },
      { title: 'windup new', cmd: true, body: 'Autoria assistida por LLM: escreve o cenário a partir das telas reais do seu app (mapa do site) + manifesto do projeto. --validate roda e refina até passar.' },
      { title: 'windup scan', cmd: true, body: 'Indexa suas rotas e elementos direto do código-fonte (Next.js, react-router).' },
      { title: 'windup secret', cmd: true, body: 'Credenciais nunca entram no cenário, no cache, no prompt do LLM ou no git — apenas referências ENV:*, resolvidas em tempo de execução.' },
      { title: 'depends_on', cmd: true, body: 'Dependências entre cenários (ex.: "criar fatura" depende de "login") — mesma sessão, cache por dependência.' },
      { title: 'run --summary', cmd: true, body: 'A IA escreve um resumo pós-execução citando valores reais observados — preços, mensagens, confirmações.' },
      { title: 'run --suggest', cmd: true, body: 'Em caso de falha, a IA lê a página real e sugere a correção do seu cenário.' },
      { title: 'Relatórios de CI', body: 'JUnit, JSON e HTML autocontido (--reporter). Código de saída diferente de zero em qualquer falha.' },
      { title: 'Multi-provedor', body: 'Google Gemini e OpenAI, escolhidos por execução (--llm openai:gpt-5-mini). windup costs rastreia gastos por provedor e modelo.' },
      { title: 'run --concurrency', cmd: true, body: 'Roda cenários em paralelo em um único navegador aquecido compartilhado com contextos isolados — ~2× mais rápido em uma suíte mista, mais ainda com planejamento ou fluxos longos. Sequencial por padrão.' },
      { title: 'Multi-navegador', body: 'Rode os mesmos cenários no Chromium (padrão), Firefox ou WebKit com --browser. Um único plano faz replay nos três — escreva uma vez, rode em todos.' },
    ],
  },

  codeExample: {
    kicker: 'Exemplo',
    title: 'Um cenário é linguagem natural em JSON. Duas execuções contam a história toda.',
    noteHtml:
      'Você escreve a intenção. A primeira execução planeja e paga uns décimos de centavo; toda execução depois dela é um replay do cache por <span class="mono">$0</span>.',
    footHtml: '<span class="mono">cache=hit · llm_calls=0 · $0</span> — a segunda execução nunca toca no modelo.',
    scenarioLabel: 'checkout.json',
    scenarioLang: 'cenário',
    outputLabel: 'windup run checkout',
    outputLang: 'saída',
  },

  cicd: {
    kicker: 'CI / CD',
    title: 'Coloque no seu pipeline. Códigos de saída e relatórios inclusos.',
    note: 'Rode a suíte inteira em um navegador aquecido, faça o build falhar em qualquer cenário que falhar e gere relatórios legíveis por máquina ou por humanos.',
    ciLabel: 'ci — uma linha',
    pointsHtml: [
      '<span class="mono">--all</span> roda todos os cenários em um único navegador aquecido para a suíte inteira.',
      '<span class="mono">--concurrency &lt;n&gt;</span> roda cenários em paralelo (~2× mais rápido em uma suíte mista); <span class="mono">--browser firefox|webkit</span> para rodar multi-navegador.',
      'Código de saída diferente de zero quando qualquer cenário falha.',
      '<span class="mono">--reporter junit|json|html</span>; <span class="mono">windup costs --json</span> rastreia gasto com IA no pipeline.',
    ],
    reportsHeading: 'Relatórios reais (HTML estático, sem JS)',
    reports: [
      { label: 'Relatório HTML completo', note: 'execução da suíte, 9/10 (um site de demo externo fora do ar)' },
      { label: 'Relatório de replay', note: 'mesma suíte a partir do cache — llm_calls=0, $0' },
      { label: 'Execução com --summary', note: 'resumo da IA citando valores reais da página' },
      { label: 'Execução com --suggest', note: 'uma falha, com correção sugerida pela IA' },
    ],
    bench: { label: 'Benchmark do planejador LLM', note: 'Gemini vs OpenAI no planejador — precisão, custo, latência.' },
  },

  reliability: {
    kicker: 'Confiabilidade',
    title: 'Determinístico significa determinístico.',
    note: 'Os replays são medidos, não prometidos. O plano em cache produz o mesmo resultado em cada execução — sem modelo, sem instabilidade.',
    stats: [
      { label: 'replays de cache aprovados', sub: '4 cenários × 15 replays — zero instabilidade' },
      { label: 'em cada replay', sub: 'login · checkout de múltiplos passos · adicionar/remover · um 2º site' },
      { label: 'por geração', sub: 'modelo padrão, gemini-3.1-flash-lite' },
      { label: 'dogfood em produção', sub: 'rodado contra um app real de produção' },
    ],
    checkAlt: 'Mascote do Windup segurando um sinal de visto verde',
  },

  getStarted: {
    kicker: 'Começar',
    title: 'Cinco comandos do zero a um teste com replay.',
    noteHtml:
      'Node ≥ 20 e uma chave de API — <span class="mono">GOOGLE_GENERATIVE_AI_API_KEY</span> (Google, padrão) ou <span class="mono">OPENAI_API_KEY</span> (OpenAI) — em <span class="mono">.env.local</span>. As chaves são usadas apenas para planejar; replays do cache nunca chamam um LLM.',
    notes: [
      'O Chromium é provisionado automaticamente',
      '3 perguntas → windup.config.ts',
      'indexa as rotas do seu app a partir do código-fonte',
      'autoria assistida por LLM',
      '1ª execução planeja · depois replay ~1s, $0',
    ],
    reqChipsHtml: [
      'Node <strong>≥ 20</strong>',
      'Google Gemini <strong>ou</strong> OpenAI',
      'Playwright <strong>incluído</strong>',
      'MIT',
    ],
    runnerAlt: 'Mascote do Windup correndo',
  },

  aiReady: {
    kicker: 'Para a era da IA',
    title: 'Deixe sua IA montar os testes.',
    noteHtml:
      'Ninguém lê documentação mais — todo mundo entrega para um assistente. Por isso o Windup traz um <a href="/pt/llms.txt"><code>llms.txt</code></a>: toda a documentação, estruturada para máquinas. Aponte seu agente de código para ele, descreva os fluxos em palavras simples e ele escreve e roda os cenários por você.',
    card1: { title: 'Dê a documentação à sua IA', body: 'Cole esta URL no seu assistente (Claude, Cursor, Copilot, …).' },
    card2: { title: 'Descreva o que testar', body: 'Um prompt inicial pronto para colar — preencha com seus fluxos.' },
    llmsUrl: 'https://windup.run/pt/llms.txt',
    promptText:
      'Leia https://windup.run/pt/llms.txt e configure testes E2E do Windup para o meu app, depois escreva cenários para estes fluxos: ...',
    linksHtml:
      '<a href="/pt/llms-full.txt">llms-full.txt</a> — toda a documentação em um só arquivo · markdown por página em <code>/pt/docs/&lt;page&gt;.md</code> · <a href="https://llmstxt.org" target="_blank" rel="noopener">o padrão llms.txt</a>',
  },

  footer: {
    tagline: 'Testes E2E em linguagem natural com replay determinístico.',
    beta: 'beta',
    note: 'Utilizável e testado. Código aberto sob a licença MIT.',
    nav: 'Rodapé',
    links: { npm: 'npm', github: 'GitHub', spec: 'Spec', changelog: 'Changelog', llms: 'llms.txt', license: 'Licença MIT' },
  },

  copyCommand: { copy: 'Copiar', copied: 'Copiado', aria: 'Copiar comando para a área de transferência' },

  docs: {
    ariaSidebar: 'Documentação',
    ariaPager: 'Paginação',
    prev: 'Anterior',
    next: 'Próximo',
    mobileJump: 'Ir para uma página da documentação',
    aiNoteHtml:
      '<strong>Usando um assistente de IA?</strong> Aponte-o para <a href="/pt/llms.txt"><code>/llms.txt</code></a> — ou <a href="/pt/llms-full.txt"><code>/llms-full.txt</code></a> para tudo em um só arquivo — e depois descreva seus fluxos. Ele pode escrever e rodar os cenários por você.',
    groups: { start: 'Primeiros passos', guides: 'Guias', reference: 'Referência' },
    labels: {
      'getting-started': 'Primeiros passos',
      'how-it-works': 'Como funciona',
      scenarios: 'Cenários',
      credentials: 'Credenciais de teste',
      environments: 'Ambientes',
      'llm-providers': 'Provedores de LLM',
      'ci-cd': 'CI / CD',
      configuration: 'Configuração',
      api: 'API programática',
      commands: 'Comandos',
      architecture: 'Arquitetura e especificação',
      techniques: 'Notas de engenharia',
    },
  },
} satisfies typeof en;

export default pt;
