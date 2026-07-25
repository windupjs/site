---
title: CI / CD
description: 在一个热浏览器中运行整个套件，任何场景失败都让构建失败，并产出 JUnit、JSON 或自包含的 HTML 报告。
---

# CI / CD

```bash
npx windup run --all --reporter junit --report-file reports/windup.xml
```

- `--all` 运行目录中的每个场景（整个套件共用一个热浏览器）。
- 任何场景失败时退出码为非零。
- `--concurrency <n>` 在一个共享的热浏览器上并行运行场景（混合套件下约快 2 倍）；`--browser firefox|webkit` 跨浏览器运行整个套件。
- `--reporter junit` 产出 JUnit XML（GitHub Actions、GitLab 和 Jenkins 原生消费它）；`--reporter json` 产出机器可读的摘要；`--reporter html` 产出一个自包含、对人类友好的页面（零 JS/依赖 —— 可作为 CI 制品上传或本地打开）。默认输出：`.windup/reports/`。
- `windup costs --json` 汇报 AI 花费，用于流水线追踪。
- `--stream` 向 stdout 输出 **NDJSON**——每个里程碑一个事件（`run:start`、`planning`、`plan`、`action`、`replan`、`run:end`）——让 CI 或仪表板实时跟踪运行。人类可读进度（`--verbose`）走 stderr，使 stdout 保持纯 NDJSON。

## 示例：GitHub Actions

```yaml
- run: npm ci && npx playwright install chromium
- run: npx windup run --all --base-url http://localhost:8080 --reporter junit --report-file reports/windup.xml
  env:
    GOOGLE_GENERATIVE_AI_API_KEY: ${{ secrets.GEMINI_KEY }}
- uses: dorny/test-reporter@v1
  if: always()
  with: { name: windup, path: reports/windup.xml, reporter: java-junit }
```
