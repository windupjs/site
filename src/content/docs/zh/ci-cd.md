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

## 非破坏性测试 —— 停在副作用的边界

在**每次 push** 时运行的套件绝不能扣款、发送 email/OTP、创建账户或改变持久化状态。可靠的规则：**测试到副作用的边界为止，然后停在那里。** 几乎每个屏幕都能这样覆盖 —— 有价值的检查在网络调用*之前*触发：

- **客户端校验** —— 无效的 email/CPF/卡号、必填字段、超出范围的值。消息在任何请求*之前*出现，所以断言它是安全的。
- **导航与只读屏幕** —— 列表、过滤器、标签页、详情视图、空状态。
- **通过 [`seed`](/scenarios/) 的客户端状态** —— 购物车数量/移除/上限（localStorage）、一个 POS 设备（sessionStorage）—— 无需服务器往返即可到达。
- **来自伪造 token/slug 的错误状态** —— `/order/BOGUS` → "未找到"，无效链接 → "已过期"。完全确定性，无需 seed 数据。
- **确认对话框 —— 打开并*取消*。** 断言 "删除？" 对话框出现，然后将其关闭（原生 `confirm` 通过 `"dialog": "dismiss"`；模态框则点击取消）。你在不执行破坏性操作的情况下验证守护 UI。

不要放进 CI：真实支付、OTP/email/WhatsApp 发送、账户/公司创建、保存会持久化的配置（**当心单击即保存、没有确认步骤的开关**）、消耗代金券的签到，以及 —— 最危险的 —— **修改测试账户的密码**。Windup 不会阻止你编写这样的步骤，所以这份纪律活在场景里：每一个都在不可逆操作之前停下。`setup`/`teardown` 是为你确实必须执行的写操作而存在的 —— 针对一次性 fixture 执行它们，绝不要针对生产数据。

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
