---
title: 用 windup new 编写
description: 给 windup new 一句粗略指令，LLM 就充当测试作者 —— 根据你应用的真实界面与项目清单，写出一个精确、可验证的场景。
---

# 用 `windup new` 编写

你不必手写详细的 task。有两种方式无需写 JSON 就能创建场景：用 `windup new` 描述它（见下），或**[通过演示录制它](/zh/docs/record)**。

> **task 及其最终验证是 LLM 的最佳猜测** —— 来自你的指令和站点地图；LLM 可能选到一个看似合理却错误的目标。`windup new` 会把验证导向指令的真实目标（优先用可见元素/文本，而非猜出来的路由），并建议用 `--validate`（生成 → 运行 → 自我改进直到通过）或先跑一次 `windup run` 来确认。

给 `windup new` 一句粗略指令，LLM 就充当测试作者 —— 用**站点地图**（来自 `windup scan` 和过往运行的真实界面、菜单和元素）与**项目清单**（按名称引用的账户，绝非明文凭据）把它重写成一个精确、可验证的场景：

```bash
npx windup new "用 qa 用户登录，把背包加入购物车并结账"
# → e2e/scenarios/purchase-backpack-qa.json —— 真实界面名、具体的虚构表单
#   数据、以“qa 账户”引用账户、明确的最终验证
```

它会生成 `scenario_id`，从已知路由中选取 `start_url`（回退到 `/` —— 绝不臆造路径），并在有帮助时从地图加入选择器 hint。

## 边写边验证

加上 **`--validate`**，它会运行生成的场景；若失败，则据失败进行改进并重试（至多 3 次）—— 你拿回的是一个*已经通过过一次*的场景，且缓存已预热：

```bash
npx windup new "登录并创建一个名为 Marketing 的成本中心" --validate
#   第 1 次：FAIL —— 元素 button:has-text('Save') 不可见
#   第 2 次：PASSED
#   ✓ 2 次尝试内验证通过 —— 计划已缓存
```

## 凭据与产物

**指令中的凭据绝不会落入场景文件**：它们会被自动注册为一个具名账户（值存入 `.env.local`，映射存入 `windup.credentials.json`），task 引用的是该账户 —— 参见[测试凭据](/zh/docs/credentials)。

参数：`--id <id>`、`--force`（覆盖）、`--depends-on <ids>`、`--llm <provider[:model]>`。产物是一个供**你审阅、编辑并提交**的文件 —— 编写是辅助性的，测试始终归你。一次 LLM 调用（~$0.001），在 `windup costs` 的 ledger 中记为 `authoring`。
