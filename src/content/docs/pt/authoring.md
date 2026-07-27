---
title: Autoria com windup new
description: Dê ao windup new uma instrução vaga e o LLM age como um autor de testes — escreve um cenário preciso e verificável a partir das telas reais do seu app e do manifesto do projeto.
---

# Autoria com `windup new`

Você não precisa escrever tasks detalhados à mão. Há dois jeitos de criar um cenário sem escrever JSON: descrevê-lo com `windup new` (abaixo), ou **[gravá-lo por demonstração](/pt/docs/record)**.

> **A tarefa e sua verificação final são o melhor palpite do LLM** a partir da sua instrução e do mapa do site — um LLM pode escolher um destino plausível-mas-errado. O `windup new` direciona a verificação para o objetivo real da instrução (um elemento/texto visível em vez de uma rota adivinhada) e recomenda confirmar com `--validate` (gerar → rodar → auto-refinar até ficar verde) ou um primeiro `windup run`.

Dê ao `windup new` uma instrução vaga e o LLM age como um autor de testes — reescreve-a num cenário preciso e verificável usando o **mapa do site** (telas, menus e elementos reais do `windup scan` e de execuções passadas) e o **manifesto do projeto** (contas referenciadas por nome, nunca credenciais literais):

```bash
npx windup new "faça login com o usuário qa, adicione a mochila ao carrinho e finalize a compra"
# → e2e/scenarios/comprar-mochila-qa.json — nomes de tela reais, dados de formulário
#   fictícios concretos, conta referenciada como "a conta qa", verificação final explícita
```

Ele gera o `scenario_id`, escolhe o `start_url` entre rotas conhecidas (caindo para `/` — nunca inventa caminhos) e adiciona hints de seletor do mapa quando ajudam.

## Valide enquanto escreve

Adicione **`--validate`** para ele rodar o cenário gerado e, se falhar, refiná-lo a partir da falha e tentar de novo (até 3 tentativas) — você recebe de volta um cenário que *já passou uma vez*, com cache quente:

```bash
npx windup new "faça login e crie um centro de custo chamado Marketing" --validate
#   tentativa 1: FAIL — elemento button:has-text('Salvar') não visível
#   tentativa 2: PASSED
#   ✓ validado em 2 tentativas — o plano está em cache
```

## Credenciais & saída

**Credenciais na instrução nunca vão parar no arquivo do cenário**: elas são auto-registradas como uma conta nomeada (valores em `.env.local`, mapeamento em `windup.credentials.json`) e a tarefa referencia a conta — veja [Credenciais de teste](/pt/docs/credentials).

Flags: `--id <id>`, `--force` (sobrescreve), `--depends-on <ids>`, `--llm <provider[:model]>`. A saída é um arquivo para **você revisar, editar e commitar** — a autoria é assistida, o teste continua seu. Uma chamada ao LLM (~$0.001), registrada no ledger do `windup costs` como `authoring`.
