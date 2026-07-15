---
title: 快速开始
description: 安装 Windup，初始化项目，用五条命令从一句粗略的指令走到一个可确定性回放的测试。
---

# 快速开始

**自然语言 E2E 测试，确定性回放 —— LLM 只规划一次，回放无需它参与。**

用纯自然语言描述一个测试 —— *"以测试账户登录，把商品 X 加入购物车，结账并验证订单确认信息"* —— Windup 就会把它变成一份确定性的浏览器操作 JSON 计划。从第二次运行起，测试**以零 LLM 调用**回放：~1 秒、$0，结果稳定。

```bash
npm i -D windupjs        # Chromium is provisioned automatically (one-time, machine-wide cache)
npx windup init          # 3 questions → windup.config.ts + example scenario
npx windup scan          # index your app's routes & elements from source code
npx windup new "log in as admin and create an invoice"   # LLM-assisted scenario authoring
npx windup run checkout  # 1st run: the LLM plans · every run after: ~1s replay, $0
```

## 环境要求

- **Node ≥ 20。**
- 在 `.env.local` 或 `.env` 中为规划器 LLM 准备一个 **API 密钥**（`.env.local` 优先 —— 当你的 `.env` 已提交到仓库时用它）：Google（默认）用 `GOOGLE_GENERATIVE_AI_API_KEY`，OpenAI 用 `OPENAI_API_KEY`。

密钥仅用于规划；缓存回放从不调用 LLM。若要使用已有的 Chrome 而非自动下载的 Chromium，设置 `CHROME_PATH`；若要完全跳过下载，设置 `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1`。

## 五分钟上手

在一个全新项目上的完整工作流，以及你应当看到的结果：

```bash
# 1. Install — Chromium is provisioned automatically
npm i -D windupjs

# 2. Initialize — 3 questions (base URL, model, scenarios dir)
npx windup init
#    → windup.config.ts + e2e/scenarios/ + .windup/ (gitignored)

# 3. Index your app from source — before anything ever runs
npx windup scan
#    scan complete (full): framework=react-router routes=106 elements=1125
#    The site map now knows your real routes and selectors; the planner
#    will use them instead of guessing. Re-run after big changes
#    (windup scan --update re-indexes only files changed since, via git).

# 4. Register test credentials once — values never touch git
npx windup secret set admin        # hidden prompts → .env.local + mapping

# 5. Author a scenario from a rough instruction
npx windup new "log in with the admin account and create an invoice for ACME"
#    → e2e/scenarios/create-invoice-acme.json — precise task grounded in
#      your real screens, account referenced by name, final verification

# 6. First run — the LLM plans once (~3s, ~$0.002)
npx windup run create-invoice-acme
#    PASS  create-invoice-acme  cache=miss llm_calls=1 ... cost=$0.0024

# 7. Every run after — deterministic replay, zero LLM
npx windup run create-invoice-acme
#    PASS  create-invoice-acme  cache=hit llm_calls=0 total=600ms cost=$0

# 8. Read results like a human, ship reports to CI
npx windup run --all --summary --reporter html
npx windup costs                   # AI spend: totals, per provider/model
```

如果某次运行在应用变更后失败，缓存的计划会失效，并在下一次运行时自动重新规划 —— **你编辑的是场景，而非选择器。**
