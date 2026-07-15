---
title: 环境
description: 在 dev、staging 和 CI 中运行相同的场景。计划缓存可跨环境移植 —— 以 URL 路径为键，而非主机。
---

# 环境（dev / staging / CI）

起始 URL 的 origin 按以下优先级顺序确定：

1. `--base-url` 标志
2. `WINDUP_BASE_URL` 环境变量
3. `windup.config.ts` 中的 `baseUrl`
4. 场景中一个绝对的 `start_url`

显式覆盖会对绝对的场景 URL 也进行重定基（路径和查询串会被保留）。

计划缓存**可跨环境移植**：缓存标识使用起始 URL 的*路径*，而非主机/端口。针对 `localhost:8080` 生成的计划，可在 staging 或 CI 上以零 LLM 调用回放。

```bash
npx windup run checkout --base-url https://staging.example.com
WINDUP_BASE_URL=http://localhost:8080 npx windup run --all
```
