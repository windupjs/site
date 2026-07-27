---
title: 配置
description: windup.config.ts 参考 —— base URL、LLM 提供商、扫描设置，以及把团队知识注入规划器的项目清单。
---

# 配置（`windup.config.ts`）

```ts
import { defineConfig } from "windupjs";

export default defineConfig({
  baseUrl: "http://localhost:3000",
  llm: {
    provider: "google",
    model: "gemini-3.1-flash-lite",
    // Several providers at once — pick per run with --llm (see "LLM providers"):
    providers: { openai: { model: "gpt-5-mini" } },
  },
  scenarios: "e2e/scenarios",
  framework: "react-router",          // detected by init; used by scan
  // browser: "chromium",             // or "firefox" / "webkit" (need: npx playwright install <name>)
  scan: {
    llmAssist: { enabled: true, maxCalls: 20 },   // hard cost cap per scan
  },
  // Project manifest: team-provided knowledge injected into the planner prompt.
  context: {
    conventions: ["every interactive element has a data-testid"],
    credentials: {
      qa: { user: "ENV:QA_USER", password: "ENV:QA_PASSWORD" },
    },
    vocabulary: { "order": "the Order entity, screen /orders" },
  },
  // 每个路由 glob 可复用的就绪信号（抗抖动）—— 见下文。
  readySignals: {
    "**/workspace/**": "#app-ready",              // 在对任何 /workspace/* 页面执行操作之前先等待它
    "**/reports/**": ["#grid", "[data-loaded]"],  // 一个或多个选择器
  },
  // 套件级夹具（`suite` 块）：在 `run --all` 前后各运行一次（beforeAll / afterAll）。
  suite: {
    setup:    "npm run db:seed",
    teardown: "npm run db:reset",
  },
  // 安全拒绝列表：如果某个计划触及这些内容则中止（CI 护栏）。
  forbid: {
    selectors: ["#change-password", "[data-danger]"],  // 对计划选择器进行子串匹配
    urls: ["**/account/password", "**/admin/**"],       // 运行绝不可到达的路径 glob
  },
  // 在运行时获取的动态值（OTP、magic-links）—— 由计划通过 value_ref/url_ref 引用。
  resolve: {
    otp_code:   { source: { kind: "cmd", command: "psql \"$DATABASE_URL\" -tAc \"select code from otp_codes order by created_at desc limit 1\"" }, extract: { regex: "(\\d{6})" }, poll: { timeout_ms: 30000 } },
    magic_link: { source: { kind: "http", url: "https://inbox.test/latest" }, extract: { json: "body.url" }, url: true },
  },
  // 确定性绑定：匹配字段上的任何 fill 都从该 resolver 填充。
  resolveFields: { "[name=otp]": "otp_code" },
  // 请求打桩：为匹配的请求返回确定性响应（一个 500、一个空列表、一次掉线的调用）。
  network: [
    { url: "**/api/orders", json: [] },                 // 强制返回空列表
    { url: "**/api/report", status: 500 },              // 模拟服务器错误
    { url: "**/analytics", abort: true },               // 丢弃请求（网络错误）
  ],
  // 冻结时钟：为依赖日期的场景固定页面的时间和/或时区。
  clock: { now: "2026-01-15T09:00:00Z", timezone: "America/Sao_Paulo" },
  // 运行时健康门禁：运行期间出现 JS 错误 / 资源 4xx / 5xx 时让场景失败。
  failOn: { consoleErrors: true, resourceErrors: true, http5xx: true, ignore: ["/analytics", "gravatar.com"] },
  // 设备模拟：应用于每次运行的 Playwright 预设（视口/UA/移动端）。缓存按设备分键。
  device: "iPhone 14",
  // 性能预算：当最终页面的指标超过阈值时失败（毫秒，或 cls 无单位）。
  budgets: { lcp_ms: 2500, cls: 0.1, load_ms: 4000 },
});
```

下面每个部分都是可选的 —— `windup init` 新建的配置只设置 `baseUrl`、`llm` 和 `scenarios`。

## 清单与凭据

- **`context.credentials`** 把账户名映射到 ENV 引用。当任务提到该账户时，计划使用 `value_ref` —— 即便页面显示了值，清单中的凭据也优先，并且禁止规划器凭空捏造 ENV 名称。
- **`resolve`** 声明在运行时获取的动态值（一个 OTP 码、一个 magic-link URL）—— 正是它解除了 OTP/magic-link/无密码登录的阻塞。计划通过 `value_ref: "<name>"`（一次 fill）或 `url_ref: "<name>"`（一次 goto）引用它；Windup 获取 **`source`**（`cmd` shell 标准输出、`http` fetch，或 `fn` 一个项目模块），用 **`extract`**（一个 `regex` 捕获组或一个 `json` 点路径）取出该值，并 **`poll`** 直到它出现（默认 30 秒）。**source 由作者声明，绝不由 LLM 生成**（没有从模型执行代码的向量），而解析出的值是**临时的** —— 仅用于该 fill/goto，绝不写入缓存、报告或日志。
- **`resolveFields`** 以确定性方式把一个字段绑定到一个 resolver —— 推荐用于 CI。以**选择器子串**为键（`{ "[name=otp]": "otp_code" }`），匹配字段上的任何 fill 都从该 resolver 填充，**覆盖计划在那里放入的任何内容**。因此 OTP 流程不再依赖规划器记得发出 `value_ref` —— 即便它填入了一个字面量或一个大小写不同的名称，Windup 仍会解析该字段（像 `OTP_CODE` / `otp-code` 这样的名称会归一化为已声明的 `otp_code`）。

## 确定性与请求打桩

- **`network`** 以确定性方式为 HTTP 请求打桩 —— 一组规则按请求 URL（**子串**或 **glob**）加可选的 `method` 匹配，**首个匹配生效**。用 `status`（默认 200）+ `body`/`json`（`json` 体会自动设置 `content-type`）+ 可选的 `headers`/`contentType` 作出响应，或用 `abort: true` 丢弃请求（模拟网络错误）。它让一个场景无需触碰后端就能到达难以铺设的状态 —— 一个 500、一个空列表、一次失败的第三方调用。由作者声明，每次运行都应用，且**绝不进入缓存的计划**。
- **`clock`** 固定页面的时间。`now`（一个 ISO 字符串或 epoch 毫秒）把 `Date`/`Date.now()` 冻结到一个固定时刻 —— 在任何页面脚本之前注入，因此应用里的 `new Date()` 会返回它 —— 用于那些否则会漂移的场景（"今天的订单"、倒计时）。`timezone`（一个 IANA 名称）原生设置浏览器的时区。冻结、不走动；每次运行都应用，绝不缓存。
- **`device`** 为每次运行模拟一个 Playwright 设备预设（像 `"iPhone 14"`、`"Pixel 7"`、`"iPad Pro 11"` 这样的名称）—— 视口、user-agent、设备缩放、移动/触摸。也可用 `--device <name>`（优先于 config）。缓存计划**按设备分键**，因此移动端和桌面端保持独立轨迹（在两个视口上跑同一个场景不会互相覆盖某个计划）；没有设备时缓存不变。移动端模拟需要 chromium；未知的预设名会快速失败并给出提示。

## 运行时健康门禁

- **`failOn`** 把运行时健康信号变成失败。`consoleErrors: true` 让出现 **JS** 错误——未捕获的异常、`console.error`、CSP 违规——的场景失败；`resourceErrors: true` 让某个**子资源**加载失败的场景失败（img/font/script/xhr 的 4xx——那类噪声，作为单独的门禁保留，以免 JS 健康被损坏的图片淹没）；`http5xx: true` 让收到 5xx 的场景失败。`ignore` 是一组子串，用于静默已知噪声（分析统计、一个 Gravatar `d=404`、你不拥有的第三方 500）——它同时匹配**消息和来源 URL**，因此一条 console 文本中不带 URL 的资源错误仍可按其主机静默。由 `config.network` 应答的请求始终被排除 —— 刻意的桩不是真正的失败。CLI 标志 `--fail-on-console` / `--fail-on-resource` / `--fail-on-5xx` 会为单次运行强制开启；无论哪种方式，信号都会被记录（每条 console 错误都带有其 `url` 以及 `js`/`resource` `kind`）并在报告中显示。
- **`budgets`** 为最终页面设置性能阈值 —— `ttfb_ms`、`fcp_ms`、`lcp_ms`、`dcl_ms`、`load_ms`（毫秒）以及 `cls`（无单位）。任何超标都会让场景失败（kind `budget`）。设置任一预算即开启 web-vitals 捕获；`--web-vitals` 捕获并报告但不设门禁。性能数字是有噪声的，因此预算要留出余量（用于抓回归，而非微抖动）。

## 就绪与安全

- **`readySignals`** 把路由 glob 映射到在匹配页面上**执行器运行第一个动作之前必须可见**的 CSS 选择器。它在运行时确定性地应用（无 LLM、$0、不属于缓存计划），每当一次运行进入匹配的路由时生效 —— 因此水合/加载等待只需按路由定义一次，而不必作为提示在每个场景中重复。它消除了加载期的竞态：元素已存在但其处理器尚未挂载（这是 Playwright 的逐元素等待无法察觉的）。尽力而为：在超时内始终未出现的信号会记录一条警告并继续（绝不会让整个套件硬失败）。
- **`forbid`** 是一个安全拒绝列表 —— 针对不可逆副作用的 CI 护栏。如果任何计划动作瞄准了被禁止的**选择器**（子串匹配，例如 `#change-password`），或运行到达了被禁止的 **URL**（路径 glob，例如 `**/account/password`），运行会以 `forbidden` 失败**中止**，而不会执行它。你来声明危险清单（引擎绝不推断），因此即便重新规划游走到"修改密码"，也会在点击之前被拦下。`forbidden` 失败绝不会使缓存失效或重新规划，因此无需 LLM 密钥。

## 套件夹具与扫描

- **`suite.setup` / `suite.teardown`** 是围绕一次 `run --all` **只运行一次**的 shell 命令 —— setup 在第一个场景之前运行，teardown 在最后一个场景之后运行（始终运行，即使失败）—— 用于整个套件范围的夹具（为共享数据库播种/重置、启动一个 stub）。每个场景各自的 `setup`/`teardown`（在场景 JSON 中）仍负责各测试的状态。失败的 `suite.setup` 会在任何场景运行之前中止整个套件；失败的 `suite.teardown` 只是一个警告。
- **LLM 辅助**（扫描的第 3 层）会读取静态层无法解析的文件（动态构建的路由、间接组件），并受 `maxCalls` 限额约束。结果按文件哈希记忆 —— 未变更的文件不会再次产生费用。费用记录在账本中，并由 `windup costs` 展示。

## 各文件归属

| 路径 | 内容 | 提交？ |
|---|---|---|
| `windup.config.ts` | 配置 | ✅ |
| `e2e/scenarios/*.json` | 你的测试，以自然语言编写 | ✅ |
| `e2e/fragments/*.json` | 精选的可复用块 | ✅ |
| `windup.credentials.json` | 账户 → ENV 名称映射（无值） | ✅ |
| `.env.local` | 凭据值 | ❌（自动加入 gitignore；CI 用同名密钥） |
| `.windup/` | 派生状态：计划缓存、运行账本、站点地图、报告 | ❌（init 会把它加入 `.gitignore`） |
