---
title: CI / CD
description: 在一个热浏览器中运行整个套件，任何场景失败都让构建失败，并产出 JUnit、JSON 或自包含的 HTML 报告。
---

# CI / CD

```bash
npx windup run --all --reporter junit --report-file reports/windup.xml
```

- `--all` 运行目录中的每个场景（整个套件共用一个热浏览器）。
- **套件摘要与模块分组。** `--all` 打印一行套件汇总 —— 通过率、缓存命中率、重新规划次数、LLM 调用次数、花费、总耗时 —— 外加按**模块**（文件夹）的细分。HTML 报告按模块对场景分组（带缓存命中 / 重新规划的小块）；JUnit 为每个模块产出一个 `<testsuite>`；JSON 携带完整摘要（`by_module`、`flaky`）以及每个用例的 `module`。
- **Flaky 评分。** `--repeat <n>` 会按场景聚合 —— 某个场景在部分而非全部运行中通过，就会被列为 flaky（`passed X/N`），这样依赖数据的不稳定性会在你提交绿色结果之前浮现。
- 任何场景失败时退出码为非零。
- `--concurrency <n>` 在一个共享的热浏览器上并行运行场景（混合套件下约快 2 倍）；`--browser firefox|webkit` 跨浏览器运行整个套件。
- **增量运行（`--changed` / `--since <ref>`）。** 配合 `--all`，只运行受某次改动影响的场景：`--changed` 将工作区与 `HEAD` 做差异比较，`--since main`（或任意 git ref）与该 ref 比较。当某个场景自身的文件发生变更、没有缓存计划、或其计划访问了某条**索引源**已变更的路由（即站点地图的文件→路由归属）时，该场景会被选中。它可靠但粗粒度，且**绝不出现静默的假绿**：如果 diff 触及了地图无法归属到某条路由的文件（共享代码、配置），或者没有 git/站点地图，Windup 会运行整个套件并打印原因。用 `windup scan` 保持归属为最新；对完整的合并前/夜间关卡使用纯 `--all`。
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
