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
  // apiKeyEnv: "GEMINI_API_KEY",           // already have the key under another name? point at it
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
- API keys: `GOOGLE_GENERATIVE_AI_API_KEY` / `OPENAI_API_KEY` by default. To reuse a key your project already stores under another name, point at it with **`apiKeyEnv`** — either at the `llm` level (`llm.apiKeyEnv: "GEMINI_API_KEY"`, applies to whichever provider has no override) or per provider (`llm.providers.openai.apiKeyEnv`, which wins). No need to duplicate the secret. `windup doctor` reports the exact variable it expects.
- A **wrong model name** is caught as a config error, not a test failure: the provider's 404 becomes an actionable message naming known models, the run fails with `kind: config` (never retried by `--retries`), and `windup doctor` warns up-front when the configured model isn't in the known-model table.
- `baseUrl` (OpenAI only) points at any OpenAI-compatible endpoint — Azure, a proxy, or a local model server.
- Switching providers never invalidates the plan cache: plans are data, replays are LLM-free regardless of who planned them.
- `windup costs` breaks spend down **by provider and by model**, so alternating between LLMs keeps per-vendor spend visible.

## Planning with your Claude subscription (`--llm claude-code`)

If you already pay for a Claude plan (Pro/Max), you can plan with it instead of buying API tokens — Windup drives the **`claude` CLI you already have**, no API key, no extra server.

> **Opt-in, never a default.** Using a subscription to plan programmatically is a gray area not endorsed by Anthropic, and Windup does not operate it. For reliability-sensitive work (CI, shared suites) prefer `--llm google` or `--llm openai`. Cached replays never call any LLM, so a plan made this way still replays at $0 with nothing running.

### Setup — one command

```bash
npx windup claude login    # installs the claude CLI if missing, then signs it into your plan
npx windup claude status   # anytime: "claude CLI: ready — you@example.com (max plan)"
```

`windup claude login` installs the Claude Code CLI (with your confirmation — never a silent global install, never in CI) and launches Anthropic's own browser sign-in; you click *authorize* on your account. The **desktop app and the CLI sign in separately**, so having the desktop app is not enough. By hand instead: `npm install -g @anthropic-ai/claude-code`, then `claude` → `/login` (pick "subscription", not an API key).

That's it — no wrapper, no Python, no local server. Windup spawns `claude` in non-interactive mode for each plan (from an isolated temp dir, so it never picks up a project's `CLAUDE.md`).

### Switching account — and one account per project

The CLI's login is **global**, not per project: the token lives in one place (the macOS Keychain / the config dir), so every project plans on whichever account signed in last. To check and to switch:

```bash
npx windup claude status    # which account is active right now (email + plan) — no tokens spent
claude auth logout          # sign out of the current account
npx windup claude login     # sign in again (browser) — now this account is the active one
```

If you juggle **several accounts** (a personal one plus one per client/company) and don't want a project billing the wrong plan, don't switch back and forth — give each account its **own config dir** via `CLAUDE_CONFIG_DIR`, then bind each project to one:

```bash
# once per account — each config dir keeps its own independent session
CLAUDE_CONFIG_DIR=~/.claude-acme      claude auth login
CLAUDE_CONFIG_DIR=~/.claude-globex    claude auth login
# your default ~/.claude stays untouched

# then, in each project (with direnv):
echo 'export CLAUDE_CONFIG_DIR=$HOME/.claude-acme' > .envrc && direnv allow
npx windup claude status    # → confirms the Acme account is the one this project uses
```

Windup spawns the `claude` CLI inheriting the environment, so the project's `CLAUDE_CONFIG_DIR` is what plans a cache miss there — no Windup setting needed. Two caveats: a project's `.claude/settings.json` **cannot** switch it (the config dir is resolved before those settings load), so use the shell/direnv; and remember that **cached replays call no LLM at all** — with `.windup/cache/` committed, a suite runs at `$0` without touching any account.

```bash
npx windup run checkout --llm claude-code                 # default model: claude-sonnet-4-6
npx windup run checkout --llm claude-code:claude-opus-4-6
WINDUP_LLM=claude-code npx windup run --all               # via env
```

Optionally pin it in config so plain `windup run` uses it:

```ts
// windup.config.ts
llm: { provider: "claude-code", model: "claude-sonnet-4-6" },
```

- **Cost is reported as $0** in `windup costs` — the tokens are real and stay in the ledger, but they're covered by your subscription, so Windup does not invent a per-token price for them.
- **If `claude` isn't installed or logged in**, the run fails fast with an actionable message (install / `/login`), not a stack trace.
- **Slower to plan** than a hosted API (each plan spawns the CLI's agent — ~8–12s vs ~2–4s), but planning happens once and is cached; replays are $0 and instant regardless.
- **Under the hood**: there's no JSON mode, so Windup carries the plan schema in the prompt and un-fences the reply mechanically (Ajv still validates every plan); `temperature`/`seed` have no CLI equivalent and aren't sent.

### Alternative: route through the claude-code-openai-wrapper (HTTP)

Instead of the CLI, you can point Windup at [claude-code-openai-wrapper](https://github.com/RichardAtCT/claude-code-openai-wrapper) — a **third-party**, community-maintained local proxy that exposes an OpenAI-compatible endpoint over your Claude Code session. Useful if you already run it, want an HTTP boundary, or reach Claude through Bedrock/Vertex behind it. Windup uses the wrapper (instead of spawning the CLI) **whenever a URL is configured**:

```bash
# start the wrapper (needs Python 3.11+ and Poetry), then:
WINDUP_CLAUDE_CODE_URL=http://localhost:8000/v1 npx windup run checkout --llm claude-code
```

```ts
// windup.config.ts — same effect, persisted
llm: { provider: "claude-code", providers: { "claude-code": { baseUrl: "http://localhost:8000/v1" } } },
```

Its own client auth is off by default; set `CLAUDE_CODE_API_KEY` only if you enabled it. Same $0 cost, same un-fencing. A down wrapper fails fast with a message naming the URL.
