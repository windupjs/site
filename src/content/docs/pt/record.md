---
title: windup record
description: Autoria por demonstração — dirija um navegador headful, marque o que verificar, finalize. O Windup escreve o cenário e cacheia o plano gravado para um replay $0.
---

# Autoria por demonstração — `windup record`

O inverso do [`windup new`](/pt/docs/authoring): em vez de *descrever* o fluxo, **mostre-o**. Dirija seu app real num navegador, marque o que o teste deve verificar, e o Windup transforma seus cliques num cenário que replaya de forma determinística em **$0**.

```bash
npx windup record --url http://localhost:3000
```

## Como funciona

O Windup abre um navegador **headful** na sua URL inicial. Use o app normalmente — faça login, navegue, preencha formulários. Uma pequena toolbar flutuante fica na base da página:

- **◉ marcar verificação** — clique nela e depois clique no elemento que o teste deve checar. O Windup grava isso como a asserção final (a **visibilidade** dele, ou o **texto** se houver). Não marque nada e a execução é verificada pela **URL da página final**.
- **■ finalizar** — para a gravação (Ctrl-C também salva).

Ao finalizar, o Windup escreve **duas** coisas:

1. **O arquivo de cenário** (`e2e/scenarios/<id>.json`) — com um task resumindo o fluxo, para humanos e para um futuro re-plan.
2. **O plano cacheado** — suas ações gravadas, armazenadas como a trajetória. Então `windup run <id>` replaya **na hora, em $0, sem LLM**.

Se uma mudança real de UI invalidar o cache depois, o cenário **se auto-repara** — re-planeja pela tarefa como qualquer outro, então uma gravação não é um beco sem saída.

## O que é capturado

Cada clique e preenchimento de campo vira uma ação com um **seletor estável** e uma **description** acessível. O seletor segue a prioridade do próprio motor — a mesma ordem em que o planejador e a assinatura confiam:

```
#id  →  [data-testid]  →  [name]  →  tag[type]  →  role / texto
```

Os seletores gravados são um **ponto de partida que você pode editar** — abra o cenário e aperte um deles se quiser.

## Segredos nunca entram no plano

Digite uma senha durante uma gravação e o Windup faz a coisa segura automaticamente: o valor é registrado no `.env.local` (gitignored) e a ação de fill guarda um `value_ref` (`ENV:…`), **nunca o literal**. O plano gravado pode ser commitado com segurança — veja [Credenciais de teste](/pt/docs/credentials).

## Quando usar

O `windup record` é uma **ferramenta de dev local**: é interativo e headful, então precisa de um TTY (não CI). Use quando um fluxo for mais fácil de clicar do que de descrever, ou para dar o pontapé num cenário que você vai refinar depois.

## Flags

| Flag | O que faz |
|---|---|
| `--url <start>` | URL inicial (padrão `config.baseUrl`) |
| `--id <id>` | Id do cenário (padrão: derivado do fluxo) |
| `--force` | Sobrescreve um cenário existente com o mesmo id |
| `--no-llm` | Não chama um LLM para resumir a tarefa (um task é sintetizado do fluxo) |
