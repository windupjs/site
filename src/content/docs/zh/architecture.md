---
title: 架构与规范
description: 活文档 —— Windup 确定性回放背后的论点、原则、模块边界、数据格式，以及成本与安全态势。
---

# 架构与规范

[活规范（living specification）](https://github.com/windupjs/windup/blob/main/docs/specs/SPEC.md)的浓缩视图。它描述的是已发布的系统。

## 论点

浏览器 E2E 测试可以**只在规划时**（以及失败时的重新规划）使用 LLM，配合确定性执行和廉价验证 —— 于是重复运行**零 LLM 调用**。已端到端验证：首次运行以数秒完成规划，成本只有几分之一美分；回放耗时 ~0.5–1s，成本 $0。

## 原则

1. **LLM 是例外，而非常规。** 每次缓存未命中调用一次；回放从不调用它。
2. **零硬编码的站点知识。** 引擎可以懂*框架*（Next.js、react-router、设计系统命名）和 Web 平台 —— 但从不懂某个具体站点。所有站点知识都作为输入到来，或在运行时被发现。
3. **每次执行也是一次采集。** 执行器本就会访问一个流程的每个页面；持久化它所见到的内容，成本约为每个操作一次 `evaluate`。
4. **知识是缓存，而非真理。** 站点地图或静态扫描断言的任何内容都可能陈旧；它会降级为运行时发现。优先级：`execution > static > llm`。
5. **成本从不意外。** 每个 LLM 触点都有明确的上限；每次调用都记录在账本中；重复的静态/辅助工作会被记忆化。
6. **计划是数据，而非程序。** 没有条件分支，没有循环，没有自由形式的代码。如果一个流程需要分支，就拆分场景。

## 架构

```
scenario (natural language, versioned)
    │
    ▼
┌─ runner ─────────────────────────┐
│ cache lookup (path-keyed)         │
│   miss → planner (LLM, 1 call)    │
│   hit  → cached plan (rebased)    │
│   → executor (deterministic)      │
│   → verifier (postconditions)     │─▶ fail → invalidate → re-plan
│   → cache save + run ledger       │
└───────────────────────────────────┘

site map (graph) ◀── windup scan (static + LLM-assist)
                 ◀── passive collection (every run)
```

模块边界（全部位于 `packages/windup/src/`）：

| 模块 | 职责 |
|---|---|
| `browser.ts` | 单一引擎边界（Playwright）。在惰性的 Chromium 单例上，每个会话使用全新的 `BrowserContext`；配合原生可操作性的可信点击；`ariaSnapshot()` 喂给规划器。以第一个*可见*匹配为目标，而非第一个 DOM 匹配。 |
| `llm.ts` | 多提供商 LLM 边界。一个 `LlmClient` 接口；Google Gemini（SDK）和 OpenAI（纯 REST）实现。可同时配置多个提供商；按次运行选择。切换提供商从不触及计划缓存。 |
| `planner.ts` | 规划逻辑（与提供商无关）。提示词 = 任务 + 页面无障碍树 + 真实元素 + 站点地图切片 + 片段目录 + 清单 + 提示。结构化输出；两级重试（语义 + 瞬时）；输出先清洗后校验（Ajv 是权威）。 |
| `executor.ts` | 确定性循环：goto → 逐个操作（以可见性为闸门 → 执行 → 验证）。产出被动的站点地图观察。 |
| `verifier.ts` | 后置条件，全部无需 LLM：元素可见、URL glob、输入值。以对帧安全的等待进行轮询。 |
| `cache.ts` | 以 `scenario_id` + 起始 URL 的**路径**为键的轨迹缓存（可跨环境移植）。仅在完整验证执行后保存；失败的回放会使其失效并重新规划，同时把陈旧条目保留为证据。 |
| `signature.ts` | 页面结构身份：规范化交互元素的 SHA-256 —— 不含文本、不含数据 —— 因此环境噪声不会拆分身份。 |
| `sitemap.ts` | 页面/跳转图。节点携带 `source: execution\|static\|llm`，附带陈旧度和来源。提示词切片：BFS（深度 ≤ 3），按词打分，控制在字符预算内。 |
| `scan/` | 项目索引。第 1 层：按约定识别路由（Next.js、react-router）。第 2 层：通过感知花括号的 JSX 解析识别交互元素（原始标签 + 设计系统组件）。第 3 层：受限的 LLM 辅助，按文件哈希记忆化。 |
| `fragments.ts` | 可复用的、经测试的子轨迹，提交在 `e2e/fragments/` 中。计划按 id 引用它们；缓存存储引用（更新会传播）。 |
| `authoring.ts` | `windup new` —— LLM 把一句粗略的指令改写成一个扎根于站点地图和清单的精确场景；凭据自动注册并清除；输出是一个供审阅的已提交文件。 |
| `metrics.ts` / `costs.ts` | 每次运行写入一条账本记录（token、调用次数、模型、计时、失败类别）。价格是一张带日期的按模型表；`windup costs` 重新计算，因此历史保持正确。 |
| `summary.ts` / `suggest.ts` | 可选启用的运行后 AI 复盘和失败后修复建议 —— 各额外一次 LLM 调用，单独追踪，从不影响运行结果。 |
| `reporters.ts` | JUnit XML、JSON 和自包含的 HTML 报告；失败时退出码非零。 |
| `secrets.ts` | 无需提交密钥的凭据：值在 `.env.local` 中，账户 → ENV 名称映射已提交；计划仅携带 `value_ref`，在运行时解析。 |

## 数据格式

**操作计划**（`plan_version: "0.1"`）：`{ plan_version, scenario_id, task, start_url, generated_by, actions[] }`。一个操作是 `{ id, type: goto|click|fill|wait_for|use, target?, value? | value_ref?, url?, use?, expect?, timeout_ms }`。语义规则：click/fill/wait_for 需要 `target.selector`；fill 需要 value/value_ref 中恰好一个；`value_ref` 必须被 task/hints/manifest 提到（不得凭空捏造 ENV 名称）；最后一个操作必须携带 `expect`（或本身是一个 `use`）。

**缓存条目**（`cache_version: "0.2"`）：`{ key: {scenario_id, start_url(path), start_sig?}, plan, status: active|stale, stats }`。

**站点地图**（`map_version: "0.1"`）：`{ last_scan_sha, pages, transitions, assist_seen }`。

## 模型与成本态势

默认规划器模型：**`gemini-3.1-flash-lite`**（实测：每次生成 1 次干净调用，~3–4s，≈ $0.0025/次生成）。与提供商无关：Google Gemini 和 OpenAI 开箱即用，位于 `llm.ts` 边界之后。每条账本记录都携带 provider+model；价格是一张扁平的按模型表。增加一个厂商 = 一个客户端实现。

## 安全态势

从被测应用捕获的页面内容被喂给 LLM 时，会**加定界符并标记为不可信数据**，并附带明确指令要求把它当作数据、绝不当作指令。由于计划是经过 schema 校验的数据、以确定性方式执行，页面无法让 Windup 运行任意代码。凭据值从不进入场景、计划、缓存或 LLM 提示词。完整威胁模型：[SECURITY.md](https://github.com/windupjs/windup/blob/main/SECURITY.md)。

## 已知限制

- 嵌套的 react-router 相对路径以尽力而为的方式采集（由执行观察加以纠正）。
- 扫描感知单个包；monorepo 会被检测并给出警告，按应用分别索引是未来的工作。
- CLI 调用之间没有守护进程（有意为之）；热池是按进程的。
- 尚未构建片段自动检测；提取是手动的。

## 验证

- `npm test`（packages/windup）：约 97 个单元/集成测试，与 LLM 隔离。CI 在 Ubuntu 上用真实 Chromium 运行它们。
- `windup bench <scenario>`：验证协议 —— 5 次生成（≥ 4/5 有效）、10 次回放（10/10 且 `llm_calls=0`）、回放快 ≥ 5×、回放 $0、破坏选择器后的恢复。
- 真实项目自用：一个有 106 条路由的 react-router 应用 —— 计划以 ~0.5s/$0 回放，缓存可跨环境移植。
