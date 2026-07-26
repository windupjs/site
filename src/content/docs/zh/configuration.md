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
});
```

- **`context.credentials`** 把账户名映射到 ENV 引用。当任务提到该账户时，计划使用 `value_ref` —— 即便页面显示了值，清单中的凭据也优先，并且禁止规划器凭空捏造 ENV 名称。
- **`readySignals`** 把路由 glob 映射到在匹配页面上**执行器运行第一个动作之前必须可见**的 CSS 选择器。它在运行时确定性地应用（无 LLM、$0、不属于缓存计划），每当一次运行进入匹配的路由时生效 —— 因此水合/加载等待只需按路由定义一次，而不必作为提示在每个场景中重复。它消除了加载期的竞态：元素已存在但其处理器尚未挂载（这是 Playwright 的逐元素等待无法察觉的）。尽力而为：在超时内始终未出现的信号会记录一条警告并继续（绝不会让整个套件硬失败）。
- **`suite.setup` / `suite.teardown`** 是围绕一次 `run --all` **只运行一次**的 shell 命令 —— setup 在第一个场景之前运行，teardown 在最后一个场景之后运行（始终运行，即使失败）—— 用于整个套件范围的夹具（为共享数据库播种/重置、启动一个 stub）。每个场景各自的 `setup`/`teardown`（在场景 JSON 中）仍负责各测试的状态。失败的 `suite.setup` 会在任何场景运行之前中止整个套件；失败的 `suite.teardown` 只是一个警告。
- **`forbid`** 是一个安全拒绝列表 —— 针对不可逆副作用的 CI 护栏。如果任何计划动作瞄准了被禁止的**选择器**（子串匹配，例如 `#change-password`），或运行到达了被禁止的 **URL**（路径 glob，例如 `**/account/password`），运行会以 `forbidden` 失败**中止**，而不会执行它。你来声明危险清单（引擎绝不推断），因此即便重新规划游走到"修改密码"，也会在点击之前被拦下。`forbidden` 失败绝不会使缓存失效或重新规划，因此无需 LLM 密钥。
- **`resolve`** 声明在运行时获取的动态值（一个 OTP 码、一个 magic-link URL）—— 正是它解除了 OTP/magic-link/无密码登录的阻塞。计划通过 `value_ref: "<name>"`（一次 fill）或 `url_ref: "<name>"`（一次 goto）引用它；Windup 获取 **`source`**（`cmd` shell 标准输出、`http` fetch，或 `fn` 一个项目模块），用 **`extract`**（一个 `regex` 捕获组或一个 `json` 点路径）取出该值，并 **`poll`** 直到它出现（默认 30 秒）。**source 由作者声明，绝不由 LLM 生成**（没有从模型执行代码的向量），而解析出的值是**临时的** —— 仅用于该 fill/goto，绝不写入缓存、报告或日志。
- **`resolveFields`** 以确定性方式把一个字段绑定到一个 resolver —— 推荐用于 CI。以**选择器子串**为键（`{ "[name=otp]": "otp_code" }`），匹配字段上的任何 fill 都从该 resolver 填充，**覆盖计划在那里放入的任何内容**。因此 OTP 流程不再依赖规划器记得发出 `value_ref` —— 即便它填入了一个字面量或一个大小写不同的名称，Windup 仍会解析该字段（像 `OTP_CODE` / `otp-code` 这样的名称会归一化为已声明的 `otp_code`）。
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
