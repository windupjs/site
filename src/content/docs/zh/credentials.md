---
title: 测试凭据
description: Windup 如何处理测试凭据 —— 创建、列出和删除账户，在场景中使用它们，以及值存储在何处。任何密钥都不会出现在场景、计划、缓存或 git 中。
---

# 测试凭据

Windup 让测试凭据远离一切会被提交或缓存的内容。场景只会说 *"以 admin 账户登录"* —— 从不出现密码。真实的值存放在一处已加入 gitignore 的位置；其他所有内容都**按名称**引用它们。

## 存储位置

| 内容 | 位置 | 是否提交？ |
|---|---|---|
| 真实的值（用户、密码） | `.env.local`（以 `600` 权限创建） | **否** —— 自动加入 gitignore。在 CI 中，相同的变量名是流水线密钥。 |
| 账户 → 变量名的映射 | `windup.credentials.json` | **是** —— 它**不含任何值**，只有 `ENV:` 引用。 |
| 实时接线 | 在启动时合并进项目清单（`context.credentials`） | —— |

一个值**只由执行器在填入字段的那一刻**读取。它从不进入规划提示、操作计划、轨迹缓存或 git。

## 创建账户

```bash
npx windup secret set admin
```

（隐藏地）提示输入用户和密码，将它们写入 `.env.local`，把映射添加到 `windup.credentials.json`，并确保 `.env.local` 已加入 gitignore。变量名遵循 `WINDUP_<ACCOUNT>_<FIELD>` —— 因此 `admin` 账户的密码变成 `WINDUP_ADMIN_PASSWORD`。

需要多少账户就注册多少（`admin`、`qa`、`readonly`……）；每个账户都拥有各自的变量。

非交互式（CI 或脚本）—— 标志会留在 shell 历史里，因此真实密钥请优先使用提示：

```bash
npx windup secret set admin --user admin@acme.test --password 's3cr3t'
```

## 列出账户

```bash
npx windup secret list
```

列出每个账户、它的字段，以及每个值是否存在 —— `[set]` 或 `[MISSING in .env.local / CI]`。它**从不打印值**。在运行套件前执行它，以便尽早发现缺失的密钥。

## 删除账户

```bash
npx windup secret remove admin        # alias: windup secret rm admin
```

从映射中移除该账户、从 `.env.local` 中移除它的值（其他变量保持不变），并从清单中清除它。

## 在场景中使用凭据

在任务中**按名称**引用账户 —— 绝不写出字面值：

```json
{
  "scenario_id": "create-invoice",
  "task": "Log in as the admin account, open the Invoices menu, create an invoice for ACME and verify it appears in the list."
}
```

在规划时，Windup 会告诉 LLM `admin` 账户存在，并带有 `ENV:WINDUP_ADMIN_USER` / `ENV:WINDUP_ADMIN_PASSWORD`，于是计划以 `value_ref: "ENV:WINDUP_ADMIN_PASSWORD"` 填入这些字段 —— 这是一个引用，仅在执行时解析为真实的值。

`windup new` 会替你完成这件事：如果你在指令中输入了真实凭据，它会检测到、注册账户并清除这些值 —— 生成的场景提到的是账户，绝非那个密钥。

## 在配置中声明凭据（替代方式）

你不一定要使用 CLI。映射也可以直接在 `windup.config.ts` 中声明 —— 这正是 `windup.credentials.json` 所馈入的内容：

```ts
context: {
  credentials: {
    admin: { user: "ENV:WINDUP_ADMIN_USER", password: "ENV:WINDUP_ADMIN_PASSWORD" },
  },
}
```

无论采用哪种方式，值仍然来自 `.env.local`（本地）或 CI 密钥，都在这些变量名之下。

## 在 CI 中

提交 `windup.credentials.json`，然后把相同的变量名（`WINDUP_ADMIN_USER`、`WINDUP_ADMIN_PASSWORD`……）定义为流水线密钥。任何密钥都不会进入仓库，而 `windup secret list` 会在运行前告诉你是否有任何缺失。
