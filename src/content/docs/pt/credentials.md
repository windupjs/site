---
title: Credenciais de teste
description: Credenciais nunca ficam em cenários, planos, no cache ou no git — apenas referências. Os valores ficam em .env.local ou nos secrets de CI, resolvidos em tempo de execução.
---

# Credenciais de teste

Credenciais nunca ficam em arquivos de cenário, planos, no cache ou no git — apenas **referências**. Os valores ficam em `.env.local` (no gitignore) ou nos secrets de CI; o mapeamento conta → nome de ENV fica em `windup.credentials.json` (versionado — não contém valores) e é mesclado ao manifesto do projeto automaticamente.

```bash
npx windup secret set admin        # hidden interactive prompts → .env.local + mapping
npx windup secret list             # accounts + whether each ENV is set (never prints values)
```

As tarefas então referenciam a conta pelo nome — *"faça login com a conta admin"* — e os planos usam `value_ref: "ENV:WINDUP_ADMIN_PASSWORD"`, resolvido apenas em tempo de execução.

`windup new` faz isso automaticamente: credenciais digitadas na instrução são detectadas, registradas e removidas — o cenário gerado menciona a conta, nunca os valores. No CI, defina os mesmos nomes de variável como secrets do pipeline.
