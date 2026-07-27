---
title: windup record
description: Autoría por demostración — maneja un navegador headful, marca qué verificar, finaliza. Windup escribe el escenario y cachea el plan grabado para un replay $0.
---

# Autoría por demostración — `windup record`

Lo inverso de [`windup new`](/es/docs/authoring): en vez de *describir* el flujo, **muéstralo**. Maneja tu app real en un navegador, marca qué debe verificar el test, y Windup convierte tus clics en un escenario que se reproduce de forma determinista en **$0**.

```bash
npx windup record --url http://localhost:3000
```

## Cómo funciona

Windup abre un navegador **headful** en tu URL inicial. Usa la app normalmente — inicia sesión, navega, rellena formularios. Una pequeña toolbar flotante está en la base de la página:

- **◉ marcar verificación** — haz clic y luego clic en el elemento que el test debe comprobar. Windup lo graba como la aserción final (su **visibilidad**, o su **texto** si tiene). No marques nada y la ejecución se verifica por la **URL de la página final**.
- **■ finalizar** — detiene la grabación (Ctrl-C también guarda).

Al finalizar, Windup escribe **dos** cosas:

1. **El archivo de escenario** (`e2e/scenarios/<id>.json`) — con una tarea sintetizada a partir de las **etiquetas visibles** de lo que hiciste clic (`click "Ver ingressos" → fill "Quantidade" → click "Continuar", verifying "Continuar"`), no un opaco "14 interaction(s)". Esa tarea legible es lo que permite que una grabación sobreviva a una invalidación de cache: la autorreparación re-planifica a partir de una descripción real del flujo, no de un conteo a ciegas. (Con una clave de LLM, Windup escribe en su lugar un resumen de una frase; `--no-llm` omite esa llamada.)
2. **El plan cacheado** — tus acciones grabadas, guardadas como la trayectoria. Así `windup run <id>` lo reproduce **al instante, en $0, sin LLM**.

Si un cambio real de UI invalida el cache después, el escenario **se autorepara** — re-planifica desde la tarea como cualquier otro, así que una grabación no es un callejón sin salida.

## Qué se captura

Cada clic y cada campo rellenado se vuelve una acción con una **description** accesible y un selector que se **verifica como único en el momento de la captura** — cada candidato a lo largo de la escalera de anclajes se acepta solo si identifica al elemento de forma **única en la página** en ese instante:

```
#id  →  [data-testid]  →  [name]  →  [aria-label]  →  [placeholder]  →  clean unique text
```

El texto se usa solo cuando es corto, único y **no lleva ningún valor dinámico** — un conteo o un precio se omite (así un enlace del carrito nunca graba `"1…R$ 35,00…"`) — y se lee del propio texto directo del elemento, no del de sus descendientes. Cuando nada estable es único, Windup recurre a una ruta estructural corta y **marca la interacción como inestable**, imprimiéndolas después de la grabación (`⚠ N interaction(s) have no stable anchor …`) — los mismos puntos con los que un lector de pantalla batalla. Añade ahí un `data-testid`, o edita el selector, antes de que el escenario entre en una suite.

## Los secretos nunca entran al plan

Escribe una contraseña durante una grabación y Windup hace lo seguro automáticamente: el valor se registra en `.env.local` (gitignored) y la acción de fill guarda un `value_ref` (`ENV:…`), **nunca el literal**. El plan grabado se puede commitear con seguridad — mira [Credenciales de prueba](/es/docs/credentials).

## Cuándo usarlo

`windup record` es una **herramienta de dev local**: es interactiva y headful, así que necesita un **TTY** (no CI). Bajo un agente/wrapper sin TTY, asigna un PTY: `script -q /dev/null npx windup record`. Úsala cuando un flujo sea más fácil de clicar que de describir, o para arrancar un escenario que luego refinarás.

## Banderas

| Bandera | Qué hace |
|---|---|
| `--url <start>` | URL inicial (por defecto `config.baseUrl`) |
| `--id <id>` | Id del escenario (por defecto: derivado del flujo) |
| `--force` | Sobrescribe un escenario existente con el mismo id |
| `--no-llm` | No llama a un LLM para resumir la tarea — en su lugar se sintetiza una tarea legible a partir de las etiquetas visibles del flujo |
