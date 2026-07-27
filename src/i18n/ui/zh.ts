// Simplified Chinese (zh-Hans) UI dictionary — mirrors the canonical structure in en.ts.
// Fields ending in `Html` are rendered with set:html (they carry inline markup).
// Code-like tokens (CLI commands, selectors, $0, ENV names, JSON) stay untranslated.

import en from './en';

const zh = {
  meta: {
    title: 'Windup — 自然语言 E2E 测试，确定性回放',
    description:
      '自然语言 E2E 测试，确定性回放 —— LLM 只规划一次，回放无需它参与。每次回放 ~1s、$0。',
    docsTitleSuffix: ' · Windup 文档',
  },

  header: {
    nav: { how: '工作原理', features: '功能特性', docs: '文档', changelog: '更新日志', start: '快速开始' },
    home: 'Windup 主页',
    npm: 'npm 上的 Windup',
    github: 'GitHub 上的 Windup',
    toggleTheme: '切换配色主题',
    primaryNav: '主导航',
    language: '语言',
  },

  hero: {
    titleHtml:
      '用<span class="hl">纯自然语言</span>编写 E2E 测试。\n        以 <span class="hl">$0</span> 回放它们。',
    ledeHtml:
      'LLM <strong>只规划一次</strong>浏览器操作。从第二次运行起，Windup 进行<strong>确定性回放</strong>，<strong>零 LLM 调用</strong> —— <span class="mono">~1&nbsp;秒、$0</span>，结果稳定。你编辑的是测试场景，而非选择器。',
    ctaGithub: 'GitHub',
    ctaNpm: '在 npm 上查看',
    badgesHtml: [
      '无需选择器，无需测试代码',
      '回放时 <span class="mono">llm_calls=0</span>',
      '底层由 Playwright 驱动',
    ],
    demoTitle: 'windup run checkout',
    demoAlt:
      '终端录制：运行一个自然语言场景；首次运行进行规划，llm_calls=1，第二次运行从缓存回放，llm_calls=0、$0',
    demoCaptionHtml:
      '真实终端 —— 首次运行进行规划（<span class="mono">llm_calls=1</span>），第二次运行从缓存回放，成本 <span class="mono">$0</span>。',
  },

  heroCompare: {
    agentName: 'LLM 智能体',
    agentSubHtml: '每一步都要观察&amp;思考 · 第 <span data-a-act>1</span>/5 步',
    phases: ['截图', '分析图像', '思考', '点击 / 输入'],
    agentFoot: '↻ 每个操作都要重复',
    windupName: 'Windup',
    windupSub: '缓存的计划 · 无需模型',
    windupDone: '完成 —— 而智能体还在思考',
  },

  pitch: {
    kicker: '问题所在',
    p1Html:
      '手写的 E2E 测试，每当选择器变动就会失效。在<em>每次</em>运行时都驱动浏览器的 AI 智能体则速度慢、不确定，且每个测试都要向你收取一次 LLM 调用的费用。',
    p2Html:
      'Windup <strong>只规划一次</strong>，并缓存一份经过验证的操作计划。回放是确定性的，且免费。当应用发生变化、某个检查失败时，计划会失效并自动重新规划 —— 自愈，而不是悄无声息地出错。',
  },

  howItWorks: {
    kicker: '工作原理',
    title: '用 LLM 规划一次，然后无需它进行回放。',
    note: '最昂贵的部分 —— 弄清楚该执行哪些浏览器操作 —— 只发生一次，并被转化为缓存的、可验证的数据。',
    flowAria:
      '流程：一个自然语言任务交给 LLM 规划器，规划器产出一份 JSON 操作计划；一个带廉价验证的确定性执行器运行它，并写入轨迹缓存；后续运行从缓存回放，零 LLM、约一秒、零成本。',
    flow: {
      task: '自然语言任务',
      planner: '规划器',
      plannerSub: 'LLM · 1 次调用',
      plan: 'JSON 操作计划',
      executor: '确定性执行器',
      executorSub: '+ 廉价验证',
      cache: '轨迹缓存',
      next: '后续运行：0 LLM · ~1s · $0',
    },
    steps: [
      {
        title: '规划（一次）',
        body: '一个自然语言任务交给规划器。LLM 产出一份 JSON 操作计划 —— 一次调用，仅在首次运行时发生。',
        meta: 'llm_calls=1 · ~$0.0025',
      },
      {
        title: '执行 + 验证',
        body: '一个确定性执行器（Playwright）运行该计划。廉价的 DOM/URL 后置条件验证每个操作 —— 无需 LLM。',
        meta: '可信输入事件',
      },
      {
        title: '回放（免费）',
        body: '轨迹被缓存下来。之后每次运行都回放它：零 LLM 调用、~1 秒、$0，每次都是同一份计划。',
        meta: 'llm_calls=0 · $0',
      },
    ],
    principles: [
      ['计划是数据，而非代码', '经过 schema 校验的 JSON —— 没有运行时即兴发挥。'],
      ['无需 LLM 的验证', '后置条件在每个操作上检查 DOM/URL。'],
      ['自愈缓存', '检查失败会使计划失效 → 重新规划。'],
      ['零硬编码的站点知识', '引擎事先对你的应用一无所知。'],
    ],
  },

  whyWindup: {
    kicker: '为什么选 Windup',
    title: '脚本的可靠性，自然语言的顺手。',
    note: '手写脚本运行成本低，但维护成本高。每次运行都调用 AI 的智能体易于编写，但速度慢且不确定。Windup 各取二者之长。',
    dimensionSr: '维度',
    headers: ['手写脚本', '每次运行都用 AI 智能体', 'Windup'],
    rows: [
      ['编写方式', '代码 + 选择器', '自然语言', '自然语言'],
      ['每次运行成本', '$0', '每次运行都调用 LLM', '仅首次运行调用 LLM'],
      ['速度', '快', '慢（模型在回路中）', '~1s 回放'],
      ['确定性', '高', '低（每次即兴发挥）', '高（每次都是同一份计划）'],
      ['应用发生变化', '你去修脚本', '可能悄无声息地做错事', '检查失败 → 重新规划'],
    ],
  },

  features: {
    kicker: '功能特性',
    title: 'QA 工作流所需的一切 —— 唯独不要选择器。',
    note: '一款为真实项目打造的 CLI：以文字或演示编写、依赖关系、动态值（OTP/magic-link）、设备模拟、性能预算、请求打桩、运行时健康门禁、CI 护栏、只读诊断与报告器 —— QA 工作流所需的一切。',
    items: [
      { title: '自然语言场景', body: '用纯自然语言描述测试。无需选择器、无需页面对象、无需维护测试代码。' },
      { title: '规划一次，免费回放', body: '从第二次运行起：llm_calls=0、~1s、$0。缓存的计划每次都以相同方式运行。' },
      { title: '确定性执行', body: 'Playwright 配合可信输入事件（isTrusted）—— 可靠的点击、输入与导航。' },
      { title: '廉价验证', body: '每个操作都检查 DOM/URL 后置条件，回路中没有 LLM。可断言可见文本、元素数量、某个属性，或某物已消失 —— 而不只是“某个选择器存在”。' },
      { title: 'windup record', cmd: true, body: '通过演示编写：驱动一个有头浏览器，用工具栏标记验证，完成 —— Windup 写出场景并缓存录制的计划（$0 回放）。输入的密码绝不会进入计划。' },
      { title: 'windup trends / why / diff', cmd: true, body: '来自运行 ledger 的只读诊断，无 LLM：每场景的通过率历史、某场景为何重新规划、两次运行之间有何变化。还有 windup badge 生成状态 SVG。' },
      { title: '设备模拟', body: '用 --device "iPhone 14" 在某个 Playwright 设备预设下运行场景 —— 视口、UA、移动/触摸。缓存计划按设备分键，因此移动端和桌面端是独立轨迹。' },
      { title: 'Web vitals + 预算', body: '用 --web-vitals 捕获最终页面的 TTFB / FCP / LCP / CLS，并在超过 config.budgets 时让运行失败 —— 一个搭在你已有运行之上的性能门禁。' },
      { title: 'config.network / config.clock', cmd: true, body: '为请求打桩（一个 500、一个空列表、一次掉线的调用）并冻结时钟/时区 —— 每次运行都应用，绝不缓存。把它们限定到单个场景，于是一个错误状态测试不会泄漏到每次运行。' },
      { title: '运行时健康门禁', body: '让在运行期间记录了 console 错误或收到静默 5xx 的场景失败（--fail-on-console / --fail-on-5xx）—— 页面底下坏了，运行就不能“通过”。' },
      { title: 'CI 护栏', body: '重试 flake（--retries）、限制套件挂钟（--max-wall）、首次失败即停（--bail），或隔离一个已知 flaky 的场景让它照常报告而不使构建失败 —— 暴露，而非隐藏。' },
      { title: 'windup suggest-scenarios', cmd: true, body: '针对尚无测试的路由，LLM 为每条未覆盖路由起草一个场景 —— 闭合 scan → 覆盖 → 编写 的循环。' },
      { title: 'windup new', cmd: true, body: 'LLM 辅助编写：根据你应用的真实页面（站点地图）+ 项目清单生成场景。--validate 会运行并不断改进，直到通过。' },
      { title: 'windup scan', cmd: true, body: '直接从源代码（Next.js、react-router）索引你的路由和元素。' },
      { title: 'windup secret', cmd: true, body: '凭据从不进入场景、缓存、LLM 提示词或 git —— 只有 ENV:* 引用，在运行时解析。' },
      { title: 'depends_on', cmd: true, body: '场景之间的依赖关系（例如「创建发票」依赖「登录」）—— 同一会话，按依赖分别缓存。' },
      { title: 'run --summary', cmd: true, body: 'AI 撰写一份运行后的复盘，引用真实观察到的值 —— 价格、消息、确认信息。' },
      { title: 'run --suggest', cmd: true, body: '失败时，AI 阅读真实页面并对你的场景提出修复建议。' },
      { title: 'CI 报告器', body: 'JUnit、JSON 和自包含的 HTML（--reporter）。任何失败都会返回非零退出码。' },
      { title: '多提供商', body: 'Google Gemini 和 OpenAI，可按次运行选择（--llm openai:gpt-5-mini）。windup costs 按提供商和模型追踪花费。' },
      { title: 'run --concurrency', cmd: true, body: '在一个共享的热浏览器上以隔离的上下文并行运行多个场景 —— 混合套件下约快 2 倍，在有规划或长流程时更快。默认串行。' },
      { title: '跨浏览器', body: '用 --browser 在 Chromium（默认）、Firefox 或 WebKit 上运行相同的场景。同一份计划可在三者上回放 —— 编写一次，处处运行。' },
      { title: 'config.resolve', cmd: true, body: '在运行时从作者声明的来源（cmd/http/fn）获取动态值（OTP 验证码、magic-link）。计划通过 value_ref/url_ref 使用它们 —— 解锁无密码登录。resolveFields 以确定性方式绑定字段。' },
      { title: 'Session snapshots', body: '依赖的认证状态（storageState）只捕获一次，并在缓存回放时恢复 —— 因此不必为每个依赖方重新运行登录流程（deps≈0）。套件的重大提速。' },
      { title: 'config.seed', cmd: true, body: '在计划运行前注入 localStorage/sessionStorage —— 无需服务器往返即可直达购物车或某个 POS 设备状态。确定且对 CI 安全。' },
      { title: 'config.forbid', cmd: true, body: '安全禁用名单：针对被禁止的选择器或 URL 的运行会中止 —— 防止更改测试密码、删除数据或持久化配置的 CI 护栏。' },
      { title: 'windup coverage', cmd: true, body: '将 windup scan 索引的路由与你的场景交叉比对，列出还没有测试的路由 —— 自动发现覆盖缺口。' },
      { title: 'windup doctor', cmd: true, body: 'CI 前的预检：LLM 密钥、浏览器、场景可解析、无孤立片段、站点地图已扫描 —— 优先捕捉常见的「到 CI 就会挂」问题。' },
      { title: 'run --a11y', cmd: true, body: '对每个场景的最终页面进行一次免费的可访问性审计（axe-core）—— 报告违规项。仅供参考；从不导致运行失败。' },
      { title: 'run --all --shard', cmd: true, body: '将套件以轮询方式拆分到并行的 CI 运行器上（--shard 1/4、2/4、……），每一份都是独立的作业。' },
      { title: 'run --all --changed', cmd: true, body: '增量 CI：只运行受代码或场景改动影响的场景（git diff → 路由归因），并带有安全的全量回退 —— 绝不出现无声的假绿。' },
      { title: 'readySignals', body: '按路由 glob 复用的抗抖动就绪判定：在操作前等待应用就绪，只定义一次，而不是在每个场景中作为 hint 重复。' },
    ],
  },

  record: {
    kicker: '1.0 新功能',
    title: '通过演示编写',
    lead: '与其描述，不如演示？<strong>windup record</strong> 在你的应用上打开一个有头浏览器 —— 你点击走一遍流程，标记要验证什么，然后完成。Windup 会写出场景<em>并</em>缓存录制的计划，于是它以 <span class="mono">$0</span>、无 LLM 的方式确定性回放。',
    cmd: 'npx windup record --url http://localhost:3000',
    steps: [
      { n: '1', title: '点击走流程', body: '一个真实浏览器在你的应用上打开。登录、导航、填表 —— 正常使用即可。' },
      { n: '2', title: '标记验证', body: '底部有一个浮动工具栏：点 ◉ 然后点击测试应检查的元素 —— 或者什么都不标记以验证最终 URL。' },
      { n: '3', title: '完成 → $0 回放', body: '“■ finalizar”（或 Ctrl-C）。Windup 写出场景 + 缓存计划。windup run <id> 以 $0 回放。' },
    ],
    points: [
      '输入的<strong>密码绝不会进入计划</strong> —— 它存入 .env.local，并以 ENV value_ref 引用。',
      '录制的选择器遵循引擎自身的优先级（#id → [data-testid] → [name] → type → role/文本），并以可访问名称作为回退。',
      '真实的 UI 变更让缓存失效？它会按任务重新规划来<strong>自愈</strong>，和任何场景一样。',
    ],
    docHref: '/docs/scenarios',
    docLabel: 'windup record 如何工作 →',
  },

  codeExample: {
    kicker: '示例',
    title: '一个场景就是 JSON 里的自然语言。两次运行讲清全部故事。',
    noteHtml:
      '你只写意图。首次运行进行规划并支付几分之一美分；此后每次运行都是缓存回放，成本 <span class="mono">$0</span>。',
    footHtml: '<span class="mono">cache=hit · llm_calls=0 · $0</span> —— 第二次运行从不触及模型。',
    scenarioLabel: 'checkout.json',
    scenarioLang: '场景',
    outputLabel: 'windup run checkout',
    outputLang: '输出',
  },

  cicd: {
    kicker: 'CI / CD',
    title: '把它放进你的流水线。退出码和报告一应俱全。',
    note: '在一个热浏览器中运行整个套件，任何场景失败都让构建失败，并产出机器可读或人类可读的报告。',
    ciLabel: 'ci —— 一行搞定',
    pointsHtml: [
      '<span class="mono">--all</span> 在一个热浏览器中为整个套件运行每个场景。',
      '<span class="mono">--concurrency &lt;n&gt;</span> 并行运行场景（混合套件下约快 2 倍）；<span class="mono">--browser firefox|webkit</span> 进行跨浏览器运行。',
      '任何场景失败时返回非零退出码。',
      '<span class="mono">--reporter junit|json|html</span>；<span class="mono">windup costs --json</span> 追踪流水线中的 AI 花费。',
    ],
    reportsHeading: '真实报告（静态 HTML，无 JS）',
    reports: [
      { label: '完整 HTML 报告', note: '套件运行，9/10（一个外部演示站点宕机）' },
      { label: '回放报告', note: '同一套件从缓存运行 —— llm_calls=0、$0' },
      { label: '--summary 运行', note: 'AI 复盘引用真实页面值' },
      { label: '--suggest 运行', note: '一次失败，附带 AI 建议的修复' },
    ],
    bench: { label: 'LLM 规划器基准测试', note: '在规划器上对比 Gemini 与 OpenAI —— 准确率、成本、延迟。' },
  },

  reliability: {
    kicker: '可靠性',
    title: '确定性，就是货真价实的确定性。',
    note: '回放是实测出来的，不是承诺出来的。缓存的计划每次运行都产出相同结果 —— 没有模型，没有抖动。',
    stats: [
      { label: '缓存回放通过', sub: '4 个场景 × 15 次回放 —— 零抖动' },
      { label: '每次回放', sub: '登录 · 多步结账 · 添加/移除 · 第 2 个站点' },
      { label: '每次生成', sub: '默认模型，gemini-3.1-flash-lite' },
      { label: '生产环境自用', sub: '在真实生产应用上运行' },
    ],
    checkAlt: 'Windup 吉祥物举着一个绿色对勾',
  },

  getStarted: {
    kicker: '快速开始',
    title: '五条命令，从零到一个可回放的测试。',
    noteHtml:
      'Node ≥ 20，以及一个 API 密钥 —— <span class="mono">GOOGLE_GENERATIVE_AI_API_KEY</span>（Google，默认）或 <span class="mono">OPENAI_API_KEY</span>（OpenAI）—— 放在 <span class="mono">.env.local</span> 中。密钥仅用于规划；缓存回放从不调用 LLM。',
    notes: [
      'Chromium 会自动配置',
      '3 个问题 → windup.config.ts',
      '从源代码索引你应用的路由',
      'LLM 辅助编写',
      '首次运行规划 · 此后回放 ~1s、$0',
    ],
    reqChipsHtml: [
      'Node <strong>≥ 20</strong>',
      'Google Gemini <strong>或</strong> OpenAI',
      'Playwright <strong>已内置</strong>',
      'MIT',
    ],
    runnerAlt: 'Windup 吉祥物在奔跑',
  },

  aiReady: {
    kicker: '面向 AI 时代',
    title: '让你的 AI 来搭建测试。',
    noteHtml:
      '如今没人再读文档了 —— 大家都把它交给助手。所以 Windup 附带了一份 <a href="/zh/llms.txt"><code>llms.txt</code></a>：整套文档，为机器结构化组织。把你的编码智能体指向它，用纯自然语言描述流程，它就会为你编写并运行场景。',
    card1: { title: '把文档交给你的 AI', body: '将此 URL 粘贴到你的助手（Claude、Cursor、Copilot……）中。' },
    card2: { title: '描述要测试什么', body: '一段现成可粘贴的起始提示词 —— 填入你的流程即可。' },
    llmsUrl: 'https://windup.run/zh/llms.txt',
    promptText:
      '阅读 https://windup.run/zh/llms.txt 并为我的应用搭建 Windup E2E 测试，然后为以下流程编写场景：……',
    linksHtml:
      '<a href="/zh/llms-full.txt">llms-full.txt</a> —— 整套文档汇于一个文件 · 每页 markdown 位于 <code>/zh/docs/&lt;page&gt;.md</code> · <a href="https://llmstxt.org" target="_blank" rel="noopener">llms.txt 标准</a>',
  },

  footer: {
    tagline: '自然语言 E2E 测试，确定性回放。',
    beta: '1.0',
    note: '可用且经过测试。基于 MIT 许可证开源。',
    nav: '页脚',
    links: { npm: 'npm', github: 'GitHub', spec: '规范', changelog: '更新日志', llms: 'llms.txt', license: 'MIT License' },
  },

  copyCommand: { copy: '复制', copied: '已复制', aria: '将命令复制到剪贴板' },

  docs: {
    ariaSidebar: '文档',
    ariaPager: '分页',
    prev: '上一页',
    next: '下一页',
    onThisPage: '本页目录',
    mobileJump: '跳转到某个文档页面',
    aiNoteHtml:
      '<strong>在用 AI 助手？</strong>把它指向 <a href="/zh/llms.txt"><code>/zh/llms.txt</code></a> —— 或 <a href="/zh/llms-full.txt"><code>/zh/llms-full.txt</code></a> 获取汇于一个文件的完整内容 —— 然后描述你的流程。它可以为你编写并运行场景。',
    groups: { start: '快速开始', guides: '指南', reference: '参考' },
    labels: {
      'getting-started': '快速开始',
      'how-it-works': '工作原理',
      scenarios: '测试场景',
      credentials: '测试凭据',
      environments: '环境',
      'llm-providers': 'LLM 提供商',
      'ci-cd': 'CI / CD',
      configuration: '配置',
      api: '编程式 API',
      commands: '命令',
      architecture: '架构与规范',
      techniques: '工程说明',
    },
  },
} satisfies typeof en;

export default zh;
