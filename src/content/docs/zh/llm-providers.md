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
- API 密钥：默认为 `GOOGLE_GENERATIVE_AI_API_KEY` / `OPENAI_API_KEY`；用 `apiKeyEnv` 覆盖环境变量名。
- `baseUrl`（仅 OpenAI）指向任何兼容 OpenAI 的端点 —— Azure、代理，或本地模型服务器。
- 切换提供商从不使计划缓存失效：计划是数据，无论由谁规划，回放都无需 LLM。
- `windup costs` **按提供商和按模型**拆分花费，因此在多个 LLM 之间轮换时，各厂商的花费始终一目了然。

## 用你的 Claude 订阅进行规划（`--llm claude-code`）

如果你已经在付费使用 Claude 套餐（Pro/Max），就可以用它来规划，而不必购买 API 令牌 —— Windup 直接驱动**你已经装好的 `claude` CLI**，无需 API 密钥，无需额外服务器。

> **可选、绝非默认。** 用订阅进行程序化规划属于 Anthropic 未背书的灰色地带，Windup 也不运营它。对可靠性敏感的工作（CI、共享套件），请优先使用 `--llm google` 或 `--llm openai`。缓存回放从不调用任何 LLM，所以这样生成的计划在没有任何服务运行时仍以 $0 回放。

### 配置 —— 只需连接一次 CLI

唯一的前提是已用你的套餐登录的 Claude Code CLI。**桌面应用和 CLI 是分开登录的**；仅有桌面应用还不够。

```bash
# 如果还没有 CLI，先安装：
npm install -g @anthropic-ai/claude-code
# 用你的 Claude Pro/Max 套餐登录（会打开浏览器；选择"订阅"，而不是 API 密钥）：
claude
#   → 在 CLI 中运行 /login，然后按浏览器流程操作
# 已经登录了？如果 `claude` 不要求登录就开启会话，说明你已连接。
```

就这些 —— 没有 wrapper，没有 Python，没有本地服务器。Windup 会为每次规划以非交互模式 `spawn` 一个 `claude`（在隔离的临时目录中运行，因此绝不会读取某个项目的 `CLAUDE.md`）。

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
