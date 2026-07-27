---
title: windup record
description: 通过演示编写 —— 驱动一个有头浏览器，标记要验证什么，完成。Windup 写出场景并缓存录制的计划，实现 $0 回放。
---

# 通过演示编写 —— `windup record`

[`windup new`](/zh/docs/authoring) 的反向操作：不是*描述*流程，而是**演示**它。在浏览器里操作你的真实应用，标记测试应验证什么，Windup 就把你的点击变成一个以 **$0** 确定性回放的场景。

```bash
npx windup record --url http://localhost:3000
```

## 如何工作

Windup 在你的起始 URL 打开一个**有头**浏览器。正常使用应用 —— 登录、导航、填表。页面底部有一个浮动的小工具栏：

- **◉ 标记验证** —— 点击它，然后点击测试应检查的元素。Windup 会把它记录为最终断言（它的**可见性**，或它的**文本**——若有）。什么都不标记，则该运行以**最终页面的 URL** 来验证。
- **■ 完成** —— 停止录制（Ctrl-C 也会保存）。

完成时，Windup 会写出**两样**东西：

1. **场景文件**（`e2e/scenarios/<id>.json`）—— 其中的 task 由你所点击内容的**可见标签**合成（`click "Ver ingressos" → fill "Quantidade" → click "Continuar", verifying "Continuar"`），而不是一个含糊的 "14 interaction(s)"。正是这个可读的 task 让录制能在缓存失效后存活下来：自愈会依据流程的真实描述重新规划，而非依据一个盲目的计数。（若配置了 LLM 密钥，Windup 会改为写入一句话摘要；`--no-llm` 会跳过该调用。）
2. **缓存的计划** —— 你录制的操作，作为轨迹存储。于是 `windup run <id>` 会**立即、以 $0、无 LLM** 回放。

如果日后真实的 UI 变更让缓存失效，场景会**自愈** —— 像任何场景一样按 task 重新规划，所以一次录制不是死胡同。

## 捕获了什么

每一次点击和字段输入都会变成一个带可访问 **description** 的操作，以及一个在**捕获时经过唯一性校验**的选择器 —— 锚点阶梯上的每个候选，只有当它在那一刻能**在页面上唯一地**标识该元素时才会被接受：

```
#id  →  [data-testid]  →  [name]  →  [aria-label]  →  [placeholder]  →  clean unique text
```

只有当文本简短、唯一且**不携带任何动态值**时才会使用文本 —— 计数或价格会被跳过（所以购物车链接绝不会记录 `"1…R$ 35,00…"`）—— 而且它读取的是元素自身的直接文本，而非其后代的文本。当没有任何稳定的东西是唯一的时，Windup 会退回到一条简短的结构路径，并**将该交互标记为不稳定**，在录制结束后打印它们（`⚠ N interaction(s) have no stable anchor …`）—— 这些正是屏幕阅读器也难以处理的地方。在场景进入测试套件之前，在那里加一个 `data-testid`，或者手动编辑选择器。

## 密码绝不会进入计划

在录制时输入密码，Windup 会自动做安全处理：该值被注册到 `.env.local`（已 gitignore），而 fill 操作里存的是一个 `value_ref`（`ENV:…`），**绝非明文**。录制的计划可安全提交 —— 参见[测试凭据](/zh/docs/credentials)。

## 何时使用

`windup record` 是一个**本地开发工具**：它是交互式且有头的，因此需要 **TTY**（而非 CI）。在没有 TTY 的 agent/wrapper 下，分配一个 PTY：`script -q /dev/null npx windup record`。当一个流程点击起来比描述更容易，或者想快速起草一个之后再打磨的场景时，就用它。

## 参数

| 参数 | 作用 |
|---|---|
| `--url <start>` | 起始 URL（默认 `config.baseUrl`） |
| `--id <id>` | 场景 id（默认：从流程推导） |
| `--force` | 覆盖同名的已有场景 |
| `--no-llm` | 不调用 LLM 来概括 task —— 而是由流程的可见标签合成一个可读的 task |
