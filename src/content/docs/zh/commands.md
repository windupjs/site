---
title: 命令
description: 完整的 Windup CLI 参考 —— 每条命令、run 的各个标志，以及可选启用的 AI 复盘（--summary）和修复建议（--suggest）辅助功能。
---

# 命令

| 命令 | 说明 |
|---|---|
| `windup init` | 创建 `windup.config.ts`、`.windup/`（已加入 gitignore）和一个示例场景 |
| `windup new "<instruction>" [--id x] [--force] [--depends-on ids] [--validate]` | 从一句粗略的指令生成场景；`--validate` 会运行并改进它，直到通过（≤3 次尝试） |
| `windup run [scenario]` | 运行一个场景（命中缓存则回放，未命中则规划） |
| `windup run --all` | 运行每个场景 —— CI 模式 |
| `windup scan [--update] [--no-assist]` | 静态地把路由和交互元素索引进站点地图；`--update` 仅重新索引自上次扫描以来变更的文件（git diff）；`--no-assist` 跳过 LLM 层（零成本） |
| `windup costs [--last n] [--days n] [--json]` | 来自运行账本的 AI 使用报告：总计、免费回放、按提供商、按模型、按场景的细分，以及扫描和编写花费 |
| `windup status` | 站点地图页面（按来源）、陈旧度、已缓存的场景、片段 |
| `windup fragment extract <scenario> <a1..aN> --id <id> --description <text>` | 把缓存计划中的一段提升为可复用片段 |
| `windup secret set <account> [--user u] [--password p]` | 注册测试凭据：值 → `.env.local`，映射 → `windup.credentials.json` |
| `windup secret list` | 账户 + 每个 ENV 是否已设置（从不打印值） |
| `windup secret remove <account>` | 删除一个账户：移除映射及其在 `.env.local` 中的值（别名：`rm`） |
| `windup sig <url> [--repeat n]` | 页面结构签名（诊断用） |
| `windup bench <scenario>` | 完整验证协议（生成、回放确定性、失败恢复） |
| `windup cache clear` | 清空轨迹缓存（后续运行会重新规划） |

### `run` 标志

| 标志 | 作用 |
|---|---|
| `--all` | 运行目录中的每个场景 —— CI 模式，整个套件共用一个热浏览器。任何场景失败则退出码为非零。 |
| `--concurrency <n>` | 在一个共享的热浏览器上以隔离的上下文并行运行最多 `n` 个场景 —— 混合套件下约快 2 倍。默认串行。 |
| `--no-cache` | 忽略缓存的计划并从头重新规划（强制一次 LLM 调用），即便存在有效轨迹。用于有意重新生成计划。 |
| `--no-map` | 不带站点地图图进行规划 —— 跳过已索引的路由和选择器。适合调试规划器或全新环境。 |
| `--repeat <n>` | 在同一个热浏览器上把场景连续运行 `n` 次 —— 稳定性和抖动检查。 |
| `--verbose` | 将规划/执行的里程碑打印到 stderr——为慢速提供方（如 `--llm claude-code`，其规划可能耗时数分钟且无输出）提供心跳。 |
| `--stream` | 向 stdout 输出机器可读的 NDJSON 事件（每个里程碑一行：`run:start`、`planning`、`plan`、`action`、`replan`、`run:end`），供 CI/仪表板使用；`--verbose` 仍走 stderr，因此 stdout 保持纯 NDJSON。 |
| `--headed` | 显示浏览器窗口，而非以无头模式运行。 |
| `--slowmo <ms>` | 在操作之间加入延迟，让你能观察每一步 —— 演示和调试节奏。 |
| `--base-url <url>` | 为本次运行覆盖起始 URL 的 origin（dev / staging / CI）。对绝对的场景 URL 也进行重定基，并保留路径和查询串。 |
| `--browser chromium\|firefox\|webkit` | 在所选引擎上运行（默认 Chromium）。同一份计划可在三者上回放 —— 编写一次，处处运行。 |
| `--llm <provider[:model]>` | 为本次运行选择规划器 LLM（例如 `openai:gpt-5-mini`）。仅影响规划；缓存回放从不调用 LLM。 |
| `--summary` | 运行结束后，额外一次 LLM 调用撰写一份人类可读的复盘，引用最终页面上观察到的真实值。默认关闭，以保持回放为 $0。 |
| `--suggest` | 在**失败**的运行上，额外一次 LLM 调用为场景提出具体的修复。仅在失败时触发。 |
| `--reporter junit\|json\|html` | 产出 CI 报告 —— JUnit XML、机器可读的 JSON 摘要，或一个自包含的 HTML 页面。 |
| `--report-file <path>` | 把报告写到指定路径（默认 `.windup/reports/`）。 |

## AI 复盘（`--summary`）

面向阅读结果的人（而非 CI），`--summary` 在每次运行后增加一次 LLM 调用，撰写一份简短的复盘：测试做了什么、结果如何、**最终页面上观察到的具体值**（价格、消息、商品名 —— 从页面逐字引用），以及任何困难（缓慢的步骤、重新规划、失败）。它会打印到终端、落入运行账本，并在 HTML/JSON 报告中作为一个高亮块展示。

```bash
npx windup run checkout --summary --reporter html
# summary: "The test logged in and completed checkout for 3 items; the
#  confirmation page showed 'Thank you for your order'. Prices observed: ..."
```

有意默认关闭 —— 缓存回放保持零 LLM 调用和 $0。复盘费用（默认模型上约 $0.0005）在运行指标中单独追踪，并计入 `estimated_cost_usd`。

## 失败时的修复建议（`--suggest`）

当一次运行**失败**时，`--suggest` 增加一次 LLM 调用，充当一位调试它的资深 QA 工程师：它把已执行的计划和失败的步骤与**真实的最终页面**以及站点地图中已知的选择器进行对比，然后为场景提出具体的修复 —— 错误的选择器和真实的选择器、一个并不包含任务所预期内容的目标页面、一个缺失的步骤，或一个对慢页面而言过短的超时。

```bash
npx windup run create-invoice --suggest
# FAIL  create-invoice  ... element button:has-text('Save') not visible
#   suggested fix: The 'Save' button does not exist; the dialog's real button
#   is labeled 'Create'. Change the hint to button:has-text('Create').
```

它把一次失败（红色）的运行变成一处具体的编辑 —— 而不必手工逆向工程整个应用。仅在失败时触发（成功的运行不花一分钱），从不编辑场景本身，并在 HTML/JSON 报告中作为一个高亮块展示。与 `--summary` 天然搭配。
