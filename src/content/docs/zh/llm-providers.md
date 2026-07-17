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

如果你已经在付费使用 Claude 套餐（Pro/Max），就可以用它来规划，而不必购买 API 令牌。Windup 通过 [claude-code-openai-wrapper](https://github.com/RichardAtCT/claude-code-openai-wrapper) 通信 —— 这是一个由你在本地运行的**第三方**服务器，它为你自己的 Claude Code 会话套上了一层兼容 OpenAI 的外壳。

> **可选、由社区维护。** 该 wrapper 不是由 Windup 或 Anthropic 构建或支持的；它驱动 Claude Code CLI，任一端发生变化时都可能失效。对可靠性敏感的工作（CI、共享套件），请优先使用 `--llm google` 或 `--llm openai`。缓存回放从不调用任何 LLM，所以这样生成的计划在没有任何服务运行时仍以 $0 回放。

### 首次配置

**1. 把 Claude Code CLI 连接到你的订阅**（仅一次）。wrapper 以 *你的身份* 通过 Claude Code CLI 进行认证 —— 因此 CLI 必须已用你的 Claude 套餐登录。**桌面应用和 CLI 是分开登录的**；仅有桌面应用还不够。

```bash
# 如果还没有 CLI，先安装：
npm install -g @anthropic-ai/claude-code
# 用你的 Claude Pro/Max 套餐登录（选择"订阅"，而不是 API 密钥）：
claude
#   → 在 CLI 中运行 /login，然后按浏览器流程操作
# 已经登录了？如果 `claude` 不要求登录就开启会话，说明你已连接。
```

**2. 安装并启动 wrapper**（一个独立的 Python 项目 —— 需要 Python 3.11+ 和 [Poetry](https://python-poetry.org)）：

```bash
git clone https://github.com/RichardAtCT/claude-code-openai-wrapper
cd claude-code-openai-wrapper
poetry install
cp .env.example .env          # 默认值即可；订阅认证不需要 ANTHROPIC_API_KEY
poetry run uvicorn src.main:app --port 8000
```

**3. 确认它已运行**（另开一个终端）：

```bash
curl http://localhost:8000/health     # → {"status":"healthy",...}
curl http://localhost:8000/v1/models  # → claude-sonnet-4-6、claude-opus-4-6 ……
```

**4. 让 Windup 指向它** 并进行规划：

```bash
npx windup run checkout --llm claude-code                 # 默认模型：claude-sonnet-4-6
npx windup run checkout --llm claude-code:claude-opus-4-6
WINDUP_LLM=claude-code npx windup run --all               # 通过环境变量
```

也可以在配置中固定，让直接的 `windup run` 就使用它：

```ts
// windup.config.ts
llm: {
  provider: "claude-code",
  model: "claude-sonnet-4-6",
  providers: {
    "claude-code": { baseUrl: "http://localhost:8000/v1" },  // 仅当 wrapper 不在 :8000 时才需修改
  },
},
```

### 说明与取舍

- **无需 API 密钥。** wrapper 自身的客户端认证默认关闭；仅在你启用了它时才设置 `CLAUDE_CODE_API_KEY`。用 `baseUrl`（配置）或 `WINDUP_CLAUDE_CODE_URL`（环境变量）改变端点。
- **费用在 `windup costs` 中报告为 $0** —— 令牌是真实的并保留在账本中，但它们由你的订阅覆盖，因此 Windup 不会为其虚构按令牌计价。
- **如果 wrapper 未运行**，`windup run --llm claude-code` 会立即失败并给出指明该 URL 的消息（不会卡在重试上）。启动 wrapper 后再重新运行。
- **底层原理**：wrapper 只实现了 `model`/`messages`/`stream`，所以 Windup 把计划 schema 放进 prompt 并以机械方式去除响应的代码围栏（Ajv 仍会校验每个计划），且不发送 `temperature`/`seed`。在 wrapper 一侧没有 `ANTHROPIC_API_KEY` 时，其模型列表是静态的，最高到 `claude-sonnet-4-6` / `claude-opus-4-6`。
