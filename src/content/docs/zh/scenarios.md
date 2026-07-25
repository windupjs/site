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
- **原生对话框与非 toast 验证。** Windup 会处理那些守卫破坏性操作（归档、删除、取消）的浏览器原生对话框（`window.confirm`/`alert`/`prompt`）：规划器会在打开对话框的那个动作上加入 `"dialog": "accept"`（或用 `"dismiss"` 取消）—— 否则对话框会被自动关闭，而该动作会悄无声息地什么都不做。它还会把最终验证导向一个**持久**信号（一行消失、一个标签改变、一个 URL），而不是几秒钟内就消失的短暂 toast/snackbar。
- **按文件夹组织。** 场景是递归发现的，因此你可以把它们分组到子文件夹中（`e2e/scenarios/contacts/list.json`、`e2e/scenarios/auth/login.json`）。**`scenario_id` 才是身份标识** —— `run --all`、vitest 套件和 `depends_on` 都按它解析，与文件路径无关（重复的 id 会被报告）。

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
- **引导式自愈。** 一次重新规划会告诉规划器究竟是哪个选择器失败了（"不要再用它"），重新强调你的提示，并且 —— 配合 `--suggest` —— 把你本会读到的同一份专家诊断喂回重新规划中，使它做出修正，而不是再次提出一个已被否定的选择器。如果某个场景不断重新规划却始终无法稳定下来，Windup 会警告：该应用很可能缺少稳定的选择器（可访问性缺口）或存在竞态，而不是默默地空转。
- 编辑场景的 `task` 会使其缓存的计划失效（重写过的测试就是另一个测试）。

`windup new` 以两种方式处理依赖：`--depends-on login` 显式声明它们，而**编写用的 LLM 也会自行建议依赖** —— 它会看到每个已有场景（id + task），当指令预设了其中某个场景所产生的状态（"已经登录……"）时，就自动产出 `depends_on`（会机械地与真实的场景 id 过滤比对 —— 绝不凭空捏造）。

## 同构计划复用（`like`）

在规模化时，许多场景其实是**同一流程运行在不同的路由/实体上** —— 创建联系人、创建交易、创建公司都驱动同一个表单。与其为每个场景都支付一次 LLM 规划调用，一个场景可以复用另一个场景**已经过验证**的计划：

```json
{
  "scenario_id": "deals-create",
  "start_url": "/deals/new",
  "task": "Type 'Big Deal' into the Name field and click Save; verify a new row appears.",
  "like": { "scenario": "contacts-create", "set": { "Alice": "Big Deal" } }
}
```

- `like.scenario` 指定其活跃缓存计划作为模板的场景。Windup 会为**当前**场景实例化它 —— 使用当前的 `start_url`，并用 `like.set` 替换任何有差异的填充值（`"source literal" → "value to use here"`，仅应用于 `value` 字段；选择器和 `value_ref` 密钥保持不变）。
- 被复用的计划在被信任并缓存之前**仍会被执行并验证** —— 与每个计划所经过的关卡完全相同。如果页面其实并非同构（某个选择器不匹配、验证失败），Windup 会**回退到正常的 LLM 规划**。它绝不跳过验证，因此不会产生悄无声息的假绿灯。
- 当验证通过时，这次运行花费了**零次 LLM 调用**，而该场景现在有了自己的缓存计划；后续运行就是普通的 `$0` 重放。
- 源场景必须先被规划过一次（它的计划就是模板）。在一个源场景较晚运行的套件里，`like` 场景那一轮只是用 LLM 进行规划，并在下一轮复用 —— 没有错误，只是错过一次优化。

用 `like` 复用整个计划；用片段（`windup fragment extract`）在其他方面不同的流程之间复用一个**动作块**。两者都保持确定性、经过验证的保证。

## 幂等性、setup 与 teardown

一次回放会用**相同的值重跑同一份缓存计划** —— 非常适合**幂等**流程（把一条固定记录编辑为一个固定值、切换并检查、读取/列表/过滤）。它**不**适合一个纯粹的 **CREATE**，其资源带有不可复用的唯一键：第一次运行会创建它，之后每次回放都会违反该约束。有两种方式覆盖写入操作：

1. **优先编写幂等场景** —— 编辑一条已知的测试记录，而不是新建一条；回放是 `$0` 且不留残余。
2. **`setup` / `teardown` 钩子** —— 在缓存计划**之外**运行（因此每次回放都会执行）的 shell 命令，用于夹具或清理（硬删除测试所创建的内容，通过 SQL/HTTP 重置）：

```json
{
  "scenario_id": "create-contact",
  "task": "Open Contacts, create a contact with CPF 111.111.111-11 and verify it appears in the list.",
  "setup":    "psql \"$DATABASE_URL\" -c \"delete from contacts where national_id = '11111111111'\"",
  "teardown": "psql \"$DATABASE_URL\" -c \"delete from contacts where national_id = '11111111111'\""
}
```

`setup` 在场景及其依赖之前运行（失败会让本次运行失败）；`teardown` 在之后运行，**始终**运行 —— 无论通过还是失败（其失败只是一个警告）。它们是你自己的可信命令（就像测试的 `beforeEach`/`afterEach`），在项目根目录中以进程环境变量运行，且从不进入计划或缓存。

对于整个套件共享的状态（一次性为夹具数据库播种、启动一个 stub），请使用[配置](/configuration/)中的 `suite.setup` / `suite.teardown` —— 它们围绕 `run --all` **只运行一次**（相当于 `beforeAll`/`afterAll`），而每个场景各自的钩子负责各测试的状态。

## 用 `windup new` 编写

> **任务及其最终验证是 LLM 根据你的指令和站点地图做出的最佳猜测** —— LLM 可能挑中一个貌似合理却错误的目的地。`windup new` 会把验证导向指令的实际目标（一个可见的元素/文本，而非一个猜测出来的路由），并建议用 `--validate`（生成 → 运行 → 自我改进直到通过）或第一次 `windup run` 来确认。

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
