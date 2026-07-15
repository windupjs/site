---
title: 测试凭据
description: 凭据从不存在于场景、计划、缓存或 git 中 —— 只有引用。值留在 .env.local 或 CI 密钥中，在运行时解析。
---

# 测试凭据

凭据从不存在于场景文件、计划、缓存或 git 中 —— 只有**引用**。值留在 `.env.local`（已加入 gitignore）或 CI 密钥中；账户 → ENV 名称的映射存在 `windup.credentials.json` 中（已提交 —— 它不含任何值），并自动合并进项目清单。

```bash
npx windup secret set admin        # hidden interactive prompts → .env.local + mapping
npx windup secret list             # accounts + whether each ENV is set (never prints values)
```

任务随后按名称引用账户 —— *"以 admin 账户登录"* —— 计划使用 `value_ref: "ENV:WINDUP_ADMIN_PASSWORD"`，仅在执行时解析。

`windup new` 会自动完成这件事：指令中输入的凭据会被检测、注册并清除 —— 生成的场景提到的是账户，绝非那些值。在 CI 中，把相同的变量名定义为流水线密钥即可。
