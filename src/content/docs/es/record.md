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

1. **El archivo de escenario** (`e2e/scenarios/<id>.json`) — con una tarea que resume el flujo, para humanos y para un futuro re-plan.
2. **El plan cacheado** — tus acciones grabadas, guardadas como la trayectoria. Así `windup run <id>` lo reproduce **al instante, en $0, sin LLM**.

Si un cambio real de UI invalida el cache después, el escenario **se autorepara** — re-planifica desde la tarea como cualquier otro, así que una grabación no es un callejón sin salida.

## Qué se captura

Cada clic y cada campo rellenado se vuelve una acción con un **selector estable** y una **description** accesible. El selector sigue la prioridad del propio motor — el mismo orden en que confían el planificador y la firma:

```
#id  →  [data-testid]  →  [name]  →  tag[type]  →  role / texto
```

Los selectores grabados son un **punto de partida editable** — abre el escenario y ajusta uno si quieres.

## Los secretos nunca entran al plan

Escribe una contraseña durante una grabación y Windup hace lo seguro automáticamente: el valor se registra en `.env.local` (gitignored) y la acción de fill guarda un `value_ref` (`ENV:…`), **nunca el literal**. El plan grabado se puede commitear con seguridad — mira [Credenciales de prueba](/es/docs/credentials).

## Cuándo usarlo

`windup record` es una **herramienta de dev local**: es interactiva y headful, así que necesita un TTY (no CI). Úsala cuando un flujo sea más fácil de clicar que de describir, o para arrancar un escenario que luego refinarás.

## Banderas

| Bandera | Qué hace |
|---|---|
| `--url <start>` | URL inicial (por defecto `config.baseUrl`) |
| `--id <id>` | Id del escenario (por defecto: derivado del flujo) |
| `--force` | Sobrescribe un escenario existente con el mismo id |
| `--no-llm` | No llama a un LLM para resumir la tarea (se sintetiza del flujo) |
