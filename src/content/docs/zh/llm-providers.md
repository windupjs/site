---
title: LLM 提供商
description: 规划器与提供商无关。同时配置 Google Gemini 和 OpenAI，按次运行选择其一 —— 切换从不使计划缓存失效。
---

# LLM 提供商

规划器与提供商无关。支持 Google Gemini 和 OpenAI；可同时配置多个，并按次运行选择其一：

```ts
// windup.config.ts
llm: {
  provider: "google",                       // default for runs without --llm
  model: "gemini-3.1-flash-lite",
  // apiKeyEnv: "GEMINI_API_KEY",           // 密钥已经用别的名字存在了？指向它即可
  providers: {
    openai: { model: "gpt-5-mini" },        // default model when --llm openai is used
    // openai: { apiKeyEnv: "MY_OPENAI_KEY", baseUrl: "https://my-proxy/v1" },
  },
},
```

```bash
npx windup run checkout                         # config default (google)
npx windup run checkout --llm openai            # provider default model (gpt-5-mini)
npx windup run checkout --llm openai:gpt-5-nano # explicit provider:model
WINDUP_LLM=openai:gpt-5-mini npx windup run --all   # same thing via env (CI)
```

- `--llm` 适用于 `run`、`bench`（在同一场景上对比多个提供商）和 `scan`（LLM 辅助层）。
- API 密钥：默认为 `GOOGLE_GENERATIVE_AI_API_KEY` / `OPENAI_API_KEY`。如果你的项目已经把密钥存在别的名字下，想直接复用，就用 **`apiKeyEnv`** 指向它 —— 既可以放在 `llm` 这一层（`llm.apiKeyEnv: "GEMINI_API_KEY"`，作用于所有没有单独覆盖的提供商），也可以按提供商设置（`llm.providers.openai.apiKeyEnv`，它优先生效）。无需重复一份密钥。`windup doctor` 会报告它期望的确切变量名。
- **写错模型名**会被当作配置错误捕获，而不是测试失败：提供商返回的 404 会变成一条可操作的消息并列出已知模型，该次运行以 `kind: config` 失败（`--retries` 绝不会重试它），而且当配置的模型不在已知模型表中时，`windup doctor` 会提前发出警告。
- `baseUrl`（仅 OpenAI）指向任何兼容 OpenAI 的端点 —— Azure、代理，或本地模型服务器。
- 切换提供商从不使计划缓存失效：计划是数据，无论由谁规划，回放都无需 LLM。
- `windup costs` **按提供商和按模型**拆分花费，因此在多个 LLM 之间轮换时，各厂商的花费始终一目了然。

## 用你的 Claude 订阅进行规划（`--llm claude-code`）

如果你已经在付费使用 Claude 套餐（Pro/Max），就可以用它来规划，而不必购买 API 令牌 —— Windup 直接驱动**你已经装好的 `claude` CLI**，无需 API 密钥，无需额外服务器。

> **可选、绝非默认。** 用订阅进行程序化规划属于 Anthropic 未背书的灰色地带，Windup 也不运营它。对可靠性敏感的工作（CI、共享套件），请优先使用 `--llm google` 或 `--llm openai`。缓存回放从不调用任何 LLM，所以这样生成的计划在没有任何服务运行时仍以 $0 回放。

### 配置 —— 一条命令

```bash
npx windup claude login    # 缺少时先安装 claude CLI，然后登录你的订阅
npx windup claude status   # 随时查看："claude CLI: ready — you@example.com (max plan)"
```

`windup claude login` 会安装 Claude Code CLI（需要你确认 —— 绝不静默进行全局安装，也绝不在 CI 中安装），并启动 Anthropic 自己的浏览器登录流程；你在自己的账户上点击*授权*。**桌面应用和 CLI 是分开登录的**，所以仅有桌面应用还不够。若想手动操作：`npm install -g @anthropic-ai/claude-code`，然后 `claude` → `/login`（选择"订阅"，而不是 API 密钥）。

就这些 —— 没有 wrapper，没有 Python，没有本地服务器。Windup 会为每次规划以非交互模式 `spawn` 一个 `claude`（在隔离的临时目录中运行，因此绝不会读取某个项目的 `CLAUDE.md`）。

### 多个账户 —— 每个项目一个（`--profile`）

CLI 的登录是**全局的**：一个令牌，存在一个配置目录里，因此每个项目都会用最后登录的那个账户来规划。如果你有一个个人套餐外加每个客户一个，那就意味着客户的工作会悄悄消耗*你自己的*套餐。把每个项目绑定到它自己的账户，只需一次：

```bash
cd ~/work/acme
npx windup claude login --profile acme     # 自己的配置目录 + 绑定本项目 + 登录
npx windup claude status                   # → 确认这个项目消耗哪个账户
```

`--profile acme` 会给那个账户**自己的配置目录**（`~/.claude-acme` —— 一个独立会话），通过在 `.envrc` 中导出 `CLAUDE_CONFIG_DIR` 来**绑定本项目**，运行 `direnv allow`，然后才打开登录流程。从此以后，`cd` 进这个项目就会让那个账户成为负责规划的账户 —— 包括 Windup `spawn` 的 `claude` 进程，它会继承环境变量。换个名字在每个项目重复即可；你默认的 `~/.claude` 保持不变，作为无名配置档。

你的 `.envrc` 绝不会被覆盖：已存在的文件会被**追加**（其他 export 保持不变），重复运行不做任何事，而绑定到*不同*配置档时会中止并把需要你编辑的那一行显示出来。没有 direnv？该命令会打印出你要放进 shell 的 `export`。

```bash
npx windup claude status                 # 这里激活的是哪个账户（邮箱 + 套餐）—— 不消耗 token
npx windup claude status --profile acme  # 检查某个具名配置档，而不切换到它
npx windup claude login --force          # 切换激活账户（先退出，并说明退出的是谁）
```

两点值得知道：项目的 `.claude/settings.json` **无法**切换账户（配置目录在那些 settings 加载之前就已解析）—— 这正是绑定要放在 `.envrc` 的原因；另外**缓存回放完全不调用 LLM**，因此只要 `.windup/cache/` 已提交，整个套件就能以 `$0` 运行，不触及任何账户。

```bash
npx windup run checkout --llm claude-code                 # 默认模型：claude-sonnet-4-6
npx windup run checkout --llm claude-code:claude-opus-4-6
WINDUP_LLM=claude-code npx windup run --all               # 通过环境变量
```

也可以在配置中固定，让直接的 `windup run` 就使用它：

```ts
// windup.config.ts
llm: { provider: "claude-code", model: "claude-sonnet-4-6" },
```

- **费用在 `windup costs` 中报告为 $0** —— 令牌是真实的并保留在账本中，但它们由你的订阅覆盖，因此 Windup 不会为其虚构按令牌计价。
- **如果 `claude` 未安装或未登录**，运行会立即失败并给出可操作的消息（安装 / `/login`），而不是堆栈跟踪。
- **规划比托管 API 慢**（每次规划都会启动 CLI 的智能体 —— 约 8–12 秒，而非约 2–4 秒），但规划只发生一次并被缓存；无论如何回放都是 $0 且即时。
- **底层原理**：没有 JSON 模式，所以 Windup 把计划 schema 放进 prompt 并以机械方式去除响应的代码围栏（Ajv 仍会校验每个计划）；`temperature`/`seed` 在 CLI 中没有对应项，因此不发送。

### 备选：通过 claude-code-openai-wrapper 路由（HTTP）

除了 CLI，你也可以把 Windup 指向 [claude-code-openai-wrapper](https://github.com/RichardAtCT/claude-code-openai-wrapper) —— 一个由社区维护的**第三方**本地代理，在你的 Claude Code 会话之上暴露一个兼容 OpenAI 的端点。适用于：你已经在运行它、想要一个 HTTP 边界，或在其后经由 Bedrock/Vertex 访问 Claude。**只要配置了 URL**，Windup 就会使用 wrapper（而不是 `spawn` CLI）：

```bash
# 启动 wrapper（需要 Python 3.11+ 和 Poetry），然后：
WINDUP_CLAUDE_CODE_URL=http://localhost:8000/v1 npx windup run checkout --llm claude-code
```

```ts
// windup.config.ts —— 同样效果，持久化
llm: { provider: "claude-code", providers: { "claude-code": { baseUrl: "http://localhost:8000/v1" } } },
```

它自身的客户端认证默认关闭；仅在你启用了它时才设置 `CLAUDE_CODE_API_KEY`。同样的 $0 费用，同样的去围栏。wrapper 掉线时会立即失败并给出指明该 URL 的消息。
