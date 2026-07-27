---
title: Autoría con windup new
description: Dale a windup new una instrucción imprecisa y el LLM actúa como autor de tests — escribe un escenario preciso y verificable desde las pantallas reales de tu app y el manifiesto del proyecto.
---

# Autoría con `windup new`

No tienes que escribir tareas detalladas a mano. Hay dos formas de crear un escenario sin escribir JSON: descríbelo con `windup new` (abajo), o **[grábalo por demostración](/es/docs/record)**.

> **La tarea y su verificación final son el mejor intento del LLM** a partir de tu instrucción y el mapa del sitio — un LLM puede elegir un destino plausible-pero-erróneo. `windup new` orienta la verificación hacia el objetivo real de la instrucción (un elemento/texto visible en vez de una ruta adivinada) y recomienda confirmar con `--validate` (generar → ejecutar → auto-refinar hasta verde) o un primer `windup run`.

Dale a `windup new` una instrucción imprecisa y el LLM actúa como autor de tests — la reescribe en un escenario preciso y verificable usando el **mapa del sitio** (pantallas, menús y elementos reales de `windup scan` y ejecuciones pasadas) y el **manifiesto del proyecto** (cuentas referenciadas por nombre, nunca credenciales literales):

```bash
npx windup new "inicia sesión con el usuario qa, agrega la mochila al carrito y finaliza la compra"
# → e2e/scenarios/comprar-mochila-qa.json — nombres de pantalla reales, datos de
#   formulario ficticios concretos, cuenta como "la cuenta qa", verificación final explícita
```

Genera el `scenario_id`, elige el `start_url` entre rutas conocidas (recurriendo a `/` — nunca inventa rutas) y añade hints de selector del mapa cuando ayudan.

## Valida mientras escribes

Añade **`--validate`** para que ejecute el escenario generado y, si falla, lo refine desde la falla y reintente (hasta 3 intentos) — recibes un escenario que *ya pasó una vez*, con caché caliente:

```bash
npx windup new "inicia sesión y crea un centro de costo llamado Marketing" --validate
#   intento 1: FAIL — elemento button:has-text('Guardar') no visible
#   intento 2: PASSED
#   ✓ validado en 2 intentos — el plan está en caché
```

## Credenciales y salida

**Las credenciales en la instrucción nunca llegan al archivo del escenario**: se registran automáticamente como una cuenta con nombre (valores en `.env.local`, mapeo en `windup.credentials.json`) y la tarea referencia la cuenta — mira [Credenciales de prueba](/es/docs/credentials).

Banderas: `--id <id>`, `--force` (sobrescribir), `--depends-on <ids>`, `--llm <provider[:model]>`. La salida es un archivo para **que revises, edites y commitees** — la autoría es asistida, el test sigue siendo tuyo. Una llamada al LLM (~$0.001), registrada en el ledger de `windup costs` como `authoring`.
