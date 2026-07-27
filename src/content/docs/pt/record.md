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

1. **O arquivo de cenário** (`e2e/scenarios/<id>.json`) — com um task sintetizado a partir dos **rótulos visíveis** do que você clicou (`click "Ver ingressos" → fill "Quantidade" → click "Continuar", verifying "Continuar"`), não um opaco "14 interaction(s)". É esse task legível que faz uma gravação sobreviver a uma invalidação de cache: o auto-reparo re-planeja a partir de uma descrição real do fluxo, não de uma contagem cega. (Com uma chave de LLM, o Windup escreve um resumo de uma frase; `--no-llm` pula essa chamada.)
2. **O plano cacheado** — suas ações gravadas, armazenadas como a trajetória. Então `windup run <id>` replaya **na hora, em $0, sem LLM**.

Se uma mudança real de UI invalidar o cache depois, o cenário **se auto-repara** — re-planeja pela tarefa como qualquer outro, então uma gravação não é um beco sem saída.

## O que é capturado

Cada clique e preenchimento de campo vira uma ação com uma **description** acessível e um seletor que é **checado por unicidade no momento da captura** — cada candidato ao longo da escada de âncoras só é aceito se identificar o elemento **de forma única na página** naquele instante:

```
#id  →  [data-testid]  →  [name]  →  [aria-label]  →  [placeholder]  →  clean unique text
```

O texto só é usado quando é curto, único e **não carrega valor dinâmico** — uma contagem ou preço é ignorado (então um link de carrinho nunca grava `"1…R$ 35,00…"`) — e é lido do texto direto do próprio elemento, não do de seus descendentes. Quando nada estável é único, o Windup recorre a um caminho estrutural curto e **marca a interação como instável**, imprimindo essas ao final da gravação (`⚠ N interaction(s) have no stable anchor …`) — os mesmos pontos em que um leitor de tela tem dificuldade. Adicione um `data-testid` ali, ou edite o seletor, antes que o cenário entre numa suíte.

## Segredos nunca entram no plano

Digite uma senha durante uma gravação e o Windup faz a coisa segura automaticamente: o valor é registrado no `.env.local` (gitignored) e a ação de fill guarda um `value_ref` (`ENV:…`), **nunca o literal**. O plano gravado pode ser commitado com segurança — veja [Credenciais de teste](/pt/docs/credentials).

## Quando usar

O `windup record` é uma **ferramenta de dev local**: é interativo e headful, então precisa de um **TTY** (não CI). Sob um agente/wrapper sem TTY, aloque um PTY: `script -q /dev/null npx windup record`. Use quando um fluxo for mais fácil de clicar do que de descrever, ou para dar o pontapé num cenário que você vai refinar depois.

## Flags

| Flag | O que faz |
|---|---|
| `--url <start>` | URL inicial (padrão `config.baseUrl`) |
| `--id <id>` | Id do cenário (padrão: derivado do fluxo) |
| `--force` | Sobrescreve um cenário existente com o mesmo id |
| `--no-llm` | Não chama um LLM para resumir a tarefa — em vez disso, um task legível é sintetizado a partir dos rótulos visíveis do fluxo |
