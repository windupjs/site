---
title: LLM providers
description: The planner is provider-agnostic. Configure Google Gemini and OpenAI at once and pick one per run — switching never invalidates the plan cache.
---

# LLM providers

The planner is provider-agnostic. Google Gemini and OpenAI are supported; configure several at once and pick one per run:

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

- `--llm` works on `run`, `bench` (compare providers on the same scenario) and `scan` (LLM-assist layer).
- API keys: `GOOGLE_GENERATIVE_AI_API_KEY` / `OPENAI_API_KEY` by default; override the env-var name with `apiKeyEnv`.
- `baseUrl` (OpenAI only) points at any OpenAI-compatible endpoint — Azure, a proxy, or a local model server.
- Switching providers never invalidates the plan cache: plans are data, replays are LLM-free regardless of who planned them.
- `windup costs` breaks spend down **by provider and by model**, so alternating between LLMs keeps per-vendor spend visible.

## Planning with your Claude subscription (`--llm claude-code`)

If you already pay for a Claude plan (Pro/Max), you can plan with it instead of buying API tokens. Windup talks to [claude-code-openai-wrapper](https://github.com/RichardAtCT/claude-code-openai-wrapper) — a **third-party** server you run locally that puts an OpenAI-compatible face on your own Claude Code session.

> **Opt-in and community-maintained.** The wrapper is not built or supported by Windup or by Anthropic; it drives the Claude Code CLI and can break when either end changes. For reliability-sensitive work (CI, shared suites), prefer `--llm google` or `--llm openai`. Cached replays never call any LLM, so a plan generated this way still replays at $0 with nothing running.

### First-time setup

**1. Connect the Claude Code CLI to your subscription** (one time). The wrapper authenticates *as you*, through the Claude Code CLI — so the CLI must be logged in with your Claude plan. The **desktop app and the CLI log in separately**; having the desktop app is not enough.

```bash
# Install the CLI if you don't have it:
npm install -g @anthropic-ai/claude-code
# Log in with your Claude Pro/Max plan (choose "subscription", not an API key):
claude
#   → run /login inside the CLI, then follow the browser flow
# Already logged in? If `claude` starts a session without asking you to log in, you're connected.
```

**2. Install and start the wrapper** (a separate Python project — needs Python 3.11+ and [Poetry](https://python-poetry.org)):

```bash
git clone https://github.com/RichardAtCT/claude-code-openai-wrapper
cd claude-code-openai-wrapper
poetry install
cp .env.example .env          # defaults are fine; no ANTHROPIC_API_KEY needed for subscription auth
poetry run uvicorn src.main:app --port 8000
```

**3. Verify it's up** (another terminal):

```bash
curl http://localhost:8000/health     # → {"status":"healthy",...}
curl http://localhost:8000/v1/models  # → claude-sonnet-4-6, claude-opus-4-6, ...
```

**4. Point Windup at it** and plan:

```bash
npx windup run checkout --llm claude-code                 # default model: claude-sonnet-4-6
npx windup run checkout --llm claude-code:claude-opus-4-6
WINDUP_LLM=claude-code npx windup run --all               # via env
```

Optionally pin it in config so plain `windup run` uses it:

```ts
// windup.config.ts
llm: {
  provider: "claude-code",
  model: "claude-sonnet-4-6",
  providers: {
    "claude-code": { baseUrl: "http://localhost:8000/v1" },  // change only if the wrapper isn't on :8000
  },
},
```

### Notes & trade-offs

- **No API key needed.** The wrapper's own client auth is off by default; set `CLAUDE_CODE_API_KEY` only if you enabled it. Move the endpoint with `baseUrl` (config) or `WINDUP_CLAUDE_CODE_URL` (env).
- **Cost is reported as $0** in `windup costs` — the tokens are real and stay in the ledger, but they're covered by your subscription, so Windup does not invent a per-token price for them.
- **If the wrapper isn't running**, `windup run --llm claude-code` fails fast with a message naming the URL (it does not hang on retries). Start the wrapper, then re-run.
- **Under the hood**: the wrapper implements only `model`/`messages`/`stream`, so Windup carries the plan schema in the prompt and un-fences the reply mechanically (Ajv still validates every plan), and `temperature`/`seed` are not sent. Without an `ANTHROPIC_API_KEY` on the wrapper's side, its model list is static, topping out at `claude-sonnet-4-6` / `claude-opus-4-6`.
