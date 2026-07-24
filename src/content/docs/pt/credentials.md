---
title: Credenciais de teste
description: Como o Windup lida com credenciais de teste — criar, listar e remover contas, usá-las em cenários e onde os valores ficam armazenados. Nenhum segredo toca em cenários, planos, no cache ou no git.
---

# Credenciais de teste

O Windup mantém as credenciais de teste fora de tudo que é versionado ou colocado em cache. Um cenário diz *"faça login com a conta admin"* — nunca a senha. Os valores reais ficam em um único lugar no gitignore; todo o resto se refere a eles **pelo nome**.

## Onde as coisas ficam armazenadas

| O quê | Onde | Versionado? |
|---|---|---|
| Os valores reais (usuários, senhas) | `.env.local` (criado com permissões `600`) | **Não** — no gitignore automaticamente. No CI, os mesmos nomes de variável são secrets do pipeline. |
| O mapeamento conta → nome de variável | `windup.credentials.json` | **Sim** — não contém **nenhum valor**, apenas referências `ENV:`. |
| A ligação em tempo real | mesclada ao manifesto do projeto (`context.credentials`) na inicialização | — |

Um valor é lido **apenas pelo executor, no momento em que ele preenche um campo**. Ele nunca entra no prompt de planejamento, no plano de ação, no cache de trajetória ou no git.

## Criar uma conta

```bash
npx windup secret set admin
```

Pergunta (de forma oculta) o usuário e a senha, escreve-os em `.env.local`, adiciona o mapeamento a `windup.credentials.json` e garante que `.env.local` esteja no gitignore. Os nomes de variável seguem `WINDUP_<ACCOUNT>_<FIELD>` — então a senha da conta `admin` vira `WINDUP_ADMIN_PASSWORD`.

Registre quantas contas precisar (`admin`, `qa`, `readonly`, …); cada uma ganha suas próprias variáveis.

Não interativo (CI ou scripts) — as flags ficam no histórico do shell, então prefira o prompt para segredos reais:

```bash
npx windup secret set admin --user admin@acme.test --password 's3cr3t'
```

## Listar contas

```bash
npx windup secret list
```

Lista todas as contas, seus campos e se cada valor está presente — `[set]` ou `[MISSING in .env.local / CI]`. Ele **nunca imprime os valores**. Rode-o antes de uma suíte para detectar um segredo faltando logo cedo.

## Remover uma conta

```bash
npx windup secret remove admin        # alias: windup secret rm admin
```

Remove a conta do mapeamento e seus valores de `.env.local` (as outras variáveis ficam intactas) e a apaga do manifesto.

## Usar credenciais em um cenário

Referencie a conta **pelo nome** na tarefa — nunca os valores literais:

```json
{
  "scenario_id": "create-invoice",
  "task": "Log in as the admin account, open the Invoices menu, create an invoice for ACME and verify it appears in the list."
}
```

Ao planejar, o Windup informa ao LLM que a conta `admin` existe com `ENV:WINDUP_ADMIN_USER` / `ENV:WINDUP_ADMIN_PASSWORD`, para que o plano preencha esses campos com `value_ref: "ENV:WINDUP_ADMIN_PASSWORD"` — uma referência, resolvida para o valor real apenas em tempo de execução.

O `windup new` faz isso por você: se você digitar credenciais reais na instrução, ele as detecta, registra a conta e remove os valores — o cenário gerado menciona a conta, nunca o segredo.

## Declarar credenciais na config (alternativa)

Você não precisa usar a CLI. O mapeamento também pode ser declarado diretamente em `windup.config.ts` — é exatamente isso que `windup.credentials.json` alimenta:

```ts
context: {
  credentials: {
    admin: { user: "ENV:WINDUP_ADMIN_USER", password: "ENV:WINDUP_ADMIN_PASSWORD" },
  },
}
```

De qualquer forma, os valores continuam vindo de `.env.local` (localmente) ou dos secrets de CI, sob esses nomes de variável.

## No CI

Versione `windup.credentials.json` e então defina os mesmos nomes de variável (`WINDUP_ADMIN_USER`, `WINDUP_ADMIN_PASSWORD`, …) como secrets do pipeline. Nenhum segredo toca no repositório, e `windup secret list` avisa se algum está faltando antes de uma execução.
