---
title: CI / CD
description: 在一个热浏览器中运行整个套件，任何场景失败都让构建失败，并产出 JUnit、JSON 或自包含的 HTML 报告。
---

# CI / CD

```bash
npx windup run --all --reporter junit --report-file reports/windup.xml
```

- `--all` 运行目录中的每个场景（整个套件共用一个热浏览器）。
- **套件摘要与模块分组。** `--all` 打印一行套件汇总 —— 通过率、缓存命中率、重新规划次数、LLM 调用次数、花费，以及**实际耗时**（wall-clock，真实经过时间；膨胀后的总耗时之和会连同并发数一并显示，例如 `wall 130s (sum 512s · concurrency 4)`）—— 外加按**模块**（文件夹）的细分。HTML 报告按模块对场景分组（带缓存命中 / 重新规划的小块），以实际耗时为首要指标，并为每个场景提供一条可对账到其总耗时的耗时细分条；JUnit 为每个模块产出一个 `<testsuite>`；JSON 携带完整摘要（`wall_ms`、`concurrency`、`by_module`、`flaky`）以及每个用例的 `duration_breakdown`。
- **Flaky 评分 + 根因提示。** `--repeat <n>` 会按场景聚合 —— 某个场景在部分而非全部运行中通过，就会被列为 flaky（`passed X/N`），并附上从其各次运行中读出的可能根因**提示**（起始页签名漂移 → 水合竞态；网络失败；始终相同的动作 → 不稳定的选择器；缓存频繁变动 → 非确定性回放），这样依赖数据的不稳定性会浮现，并在你提交绿色结果之前指向某处。
- **重试 flake —— `--retries N`。** 对以**瞬时**方式失败的场景（网络重置、水合竞态导致的验证未命中、不稳定的 `setup`/`dependency`）额外重跑至多 N 次 —— 第一次通过即胜出。`config.forbid` 拦截**永不**重试（那是刻意的守卫，不是 flake）。flake 会被**暴露而非掩盖**：仅在重试后才转绿的场景会被标记为 `flaky`（控制台 `↻ N passed only on retry`、HTML 报告中的 `FLAKY N×` 徽章、JSON 及 `run:end` 流中的 `flaky`/`attempts`）—— 让你去修复根因，而不是把红色构建洗成绿色。
- **时间预算 —— `--all --max-wall <seconds>`。** 一道护栏：一旦套件的挂钟时间超过上限，Windup 就**停止启动新场景**（进行中的会跑完 —— 不会中途取消任何工作）并**以非零码退出**，于是失控的套件会让构建失败，而不是把 runner 挂住。顺序模式和 `--concurrency` 下都有效。会打印 `⏱ --max-wall Ns exceeded — X/Y ran, Z not started`。
- **快速失败 —— `--all --bail`。** 在**第一次失败**后就停止启动新场景 —— 在 PR check 里快速得到反馈，而不必等完整套件跑完。与 `--retries`/`--max-wall` 组成护栏三件套；顺序模式和 `--concurrency` 下都有效。
- **分片 —— `--all --shard i/n`。** 运行第 *i* 个分片（共 *n* 个，轮询式拆分），将一个大套件分摊到并行的 CI runner 上（`--shard 1/4`、`--shard 2/4`、……），每个都是独立的 job。
- **标签 —— `--all --tag <names>`。** 给场景打标签（`"tags": ["smoke", "checkout"]`）并运行子集：`--tag smoke,checkout` 会运行任何带有其中一个标签的场景。每次 push 运行 smoke，每晚运行完整套件 —— 可与 `--shard` 和 `--changed` 组合。
- **失败时的跟踪 + 截图 —— `--trace`。** 当某个场景失败时，Windup 会保存一份 **Playwright 跟踪**（`.windup/reports/traces/<id>.zip` —— 在 Playwright 跟踪查看器中打开它：每一步的 DOM 快照、网络和控制台）以及一张整页**截图**，HTML 报告会从失败的那一行链接到两者。直接看清 CI 中到底发生了什么，而不是从耗时去猜。（仅在失败时捕获 —— 通过的运行不会留下任何东西。）
- **GitHub Actions 输出 —— `--github`**（当 `GITHUB_ACTIONS=true` 时自动开启）。为每个失败的场景发出一条 `::error::` 注解（在 PR 上内联显示），并向 job 页面写入一份 Markdown 套件摘要 + 每个场景的表格（`$GITHUB_STEP_SUMMARY`）—— 结果无需打开构件即可呈现。
- **无障碍 —— `--a11y`。** 每个场景结束后，对最终页面运行一次 [axe-core](https://github.com/dequelabs/axe-core) 审计并报告违规项 —— 在 Windup 已有的基础设施上免费做一次无障碍检查。仅供参考（绝不使运行失败）；需选择启用的可选依赖（`npm i -D axe-core`）。
- **`windup doctor`** 是一次预检 —— LLM 密钥、浏览器、场景可解析、无孤立片段、站点地图已扫描 —— 在流水线运行之前抓出常见的「到了 CI 就会挂」问题。
- 任何场景失败时退出码为非零。
- `--concurrency <n>` 在一个共享的热浏览器上并行运行场景（混合套件下约快 2 倍）；`--browser firefox|webkit` 跨浏览器运行整个套件。
- **增量运行（`--changed` / `--since <ref>`）。** 配合 `--all`，只运行受某次改动影响的场景：`--changed` 将工作区与 `HEAD` 做差异比较，`--since main`（或任意 git ref）与该 ref 比较。当某个场景自身的文件发生变更、没有缓存计划、或其计划访问了某条**索引源**已变更的路由（即站点地图的文件→路由归属）时，该场景会被选中。它可靠但粗粒度，且**绝不出现静默的假绿**：如果 diff 触及了地图无法归属到某条路由的文件（共享代码、配置），或者没有 git/站点地图，Windup 会运行整个套件并打印原因。用 `windup scan` 保持归属为最新；对完整的合并前/夜间关卡使用纯 `--all`。
- `--reporter junit` 产出 JUnit XML（GitHub Actions、GitLab 和 Jenkins 原生消费它）；`--reporter json` 产出机器可读的摘要；`--reporter html` 产出一个自包含、对人类友好的页面（零 JS/依赖 —— 可作为 CI 制品上传或本地打开）。默认输出：`.windup/reports/`。HTML 报告中每个场景的动作列表会显示每一步的**类型和目标**（`a4 · fill · otp`、`a2 · click · Add to cart`、`a1 · goto · →/checkout`）—— fill 的值永不显示（密钥/OTP 不外泄）。
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
