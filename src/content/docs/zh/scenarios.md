---
title: 测试场景
description: 一个场景就是一个用纯自然语言描述测试的 JSON 文件。了解其格式、场景依赖，以及用 windup new 进行 LLM 辅助编写。
---

# 测试场景

一个场景就是位于你场景目录（默认 `e2e/scenarios/`）中的一个 JSON 文件：

```json
{
  "scenario_id": "checkout",
  "start_url": "/",
  "task": "Log in as the qa account, add 'Backpack' to the cart, check out and verify the order confirmation message appears.",
  "hints": ["Optional site-specific tips for the planner. Delete if not needed."]
}
```

- `start_url` 是**可选的**（默认为 `/`），且应保持与环境无关：只是一个路径，相对于生效的 base URL 解析。
- 在任务末尾写上**要验证什么** —— 那会成为计划的最终后置条件。
- 切勿把密钥放进任务里。请按名称引用项目清单中的账户（参见[测试凭据](/zh/docs/credentials)）；计划会使用 `value_ref: "ENV:VAR"`，真实值仅在运行时解析，从不缓存。

## 场景依赖（`depends_on`）

流程很少从零开始 —— 创建一个银行账户需要先登录。声明前置条件，每个场景就能保持小巧、聚焦，并可单独缓存：

```json
{
  "scenario_id": "create-bank-account",
  "depends_on": ["login"],
  "task": "Already on the dashboard, open Settings > Bank accounts, create an account named 'Inter' and verify it appears in the list."
}
```

- 依赖在**同一浏览器会话中**按顺序运行，各自拥有自己的缓存 —— 一个热套件会以零 LLM 调用回放整条链路。
- 在没有 `start_url` 时，被依赖的场景会**从上一个依赖结束的地方继续** —— 首次规划时 LLM 看到的是那个真实页面（登录后的仪表盘），而不是盲目规划。
- 链式依赖可用（`login` → `select-company` → `create-account`），环依赖会被拒绝，而失败的依赖会以 `dependency` 类别让本次运行失败，且发生在场景本身开始之前。
- 每个依赖都保留自己的自愈能力：如果它缓存的计划失效，它会重新规划并重新缓存 —— 依赖它的场景自动受益。
- 编辑场景的 `task` 会使其缓存的计划失效（重写过的测试就是另一个测试）。

`windup new` 以两种方式处理依赖：`--depends-on login` 显式声明它们，而**编写用的 LLM 也会自行建议依赖** —— 它会看到每个已有场景（id + task），当指令预设了其中某个场景所产生的状态（"已经登录……"）时，就自动产出 `depends_on`（会机械地与真实的场景 id 过滤比对 —— 绝不凭空捏造）。

## 用 `windup new` 编写

你不必手写详尽的任务。给 `windup new` 一句粗略的指令，LLM 就充当测试编写者 —— 它会利用**站点地图**（来自 `windup scan` 和历史运行的真实页面、菜单和元素）以及**项目清单**（按名称引用的账户，从不写明字面凭据），把它改写成一个精确、可验证的场景：

```bash
npx windup new "log in with the qa user, add the backpack to the cart and check out"
# → e2e/scenarios/purchase-backpack-qa.json — real screen names, concrete fake
#   form data, account referenced as "the qa account", explicit final verification
```

它会生成 `scenario_id`，从已知路由中挑选 `start_url`（回退到 `/` —— 它从不凭空捏造路径），并在有帮助时从地图中加入选择器提示。加上 **`--validate`**，它就会运行所生成的场景，若失败则根据失败原因加以改进并重试（最多 3 次尝试）—— 你拿回的是一个*已经通过过一次*、缓存已预热的场景：

```bash
npx windup new "log in and create a cost center named Marketing" --validate
#   attempt 1: FAIL — element button:has-text('Save') not visible
#   attempt 2: PASSED
#   ✓ validated in 2 attempts — the plan is cached
```

**指令中的凭据绝不会落入场景文件**：它们会被自动注册为一个具名账户（值存入 `.env.local`，映射存入 `windup.credentials.json`），任务引用的是该账户 —— 参见[测试凭据](/zh/docs/credentials)。

标志：`--id <id>`、`--force`（覆盖）、`--depends-on <ids>`、`--llm <provider[:model]>`。输出是一个**供你审阅、编辑并提交**的文件 —— 编写是被辅助的，测试仍归你所有。一次 LLM 调用（~$0.001），记录在 `windup costs` 账本的 `authoring` 项下。
