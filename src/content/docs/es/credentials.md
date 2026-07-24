---
title: Credenciales de prueba
description: Cómo maneja Windup las credenciales de prueba — crear, listar y eliminar cuentas, usarlas en escenarios y dónde se almacenan los valores. Ningún secreto toca jamás los escenarios, los planes, la caché ni git.
---

# Credenciales de prueba

Windup mantiene las credenciales de prueba fuera de todo lo que se versiona o se cachea. Un escenario dice *"inicia sesión con la cuenta admin"* — nunca la contraseña. Los valores reales viven en un único lugar gitignored; todo lo demás se refiere a ellos **por nombre**.

## Dónde se almacena cada cosa

| Qué | Dónde | ¿Versionado? |
|---|---|---|
| Los valores reales (usuarios, contraseñas) | `.env.local` (creado con permisos `600`) | **No** — gitignored automáticamente. En CI, los mismos nombres de variables son secretos del pipeline. |
| El mapeo cuenta → nombre de variable | `windup.credentials.json` | **Sí** — no contiene **ningún valor**, solo referencias `ENV:`. |
| El cableado en vivo | fusionado en el manifiesto del proyecto (`context.credentials`) al arrancar | — |

Un valor lo lee **únicamente el executor, en el momento en que rellena un campo**. Nunca entra en el prompt de planificación, el plan de acciones, la caché de trayectorias ni git.

## Crear una cuenta

```bash
npx windup secret set admin
```

Pide (de forma oculta) el usuario y la contraseña, los escribe en `.env.local`, añade el mapeo a `windup.credentials.json` y se asegura de que `.env.local` esté gitignored. Los nombres de variables siguen el patrón `WINDUP_<ACCOUNT>_<FIELD>` — así, la contraseña de la cuenta `admin` se convierte en `WINDUP_ADMIN_PASSWORD`.

Registra tantas cuentas como necesites (`admin`, `qa`, `readonly`, …); cada una obtiene sus propias variables.

No interactivo (CI o scripting) — los flags quedan en el historial del shell, así que para secretos reales es preferible el prompt:

```bash
npx windup secret set admin --user admin@acme.test --password 's3cr3t'
```

## Listar cuentas

```bash
npx windup secret list
```

Lista cada cuenta, sus campos y si cada valor está presente — `[set]` o `[MISSING in .env.local / CI]`. **Nunca imprime los valores**. Ejecútalo antes de una suite para detectar pronto un secreto que falte.

## Eliminar una cuenta

```bash
npx windup secret remove admin        # alias: windup secret rm admin
```

Quita la cuenta del mapeo y sus valores de `.env.local` (las demás variables quedan intactas), y la borra del manifiesto.

## Usar credenciales en un escenario

Referencia la cuenta **por nombre** en la tarea — nunca los valores literales:

```json
{
  "scenario_id": "create-invoice",
  "task": "Log in as the admin account, open the Invoices menu, create an invoice for ACME and verify it appears in the list."
}
```

Al planificar, Windup le indica al LLM que la cuenta `admin` existe con `ENV:WINDUP_ADMIN_USER` / `ENV:WINDUP_ADMIN_PASSWORD`, de modo que el plan rellena esos campos con `value_ref: "ENV:WINDUP_ADMIN_PASSWORD"` — una referencia, resuelta al valor real solo en tiempo de ejecución.

`windup new` hace esto por ti: si escribes credenciales reales en la instrucción, las detecta, registra la cuenta y depura los valores — el escenario generado menciona la cuenta, nunca el secreto.

## Declarar credenciales en la configuración (alternativa)

No tienes por qué usar la CLI. El mapeo también puede declararse directamente en `windup.config.ts` — es exactamente lo que alimenta `windup.credentials.json`:

```ts
context: {
  credentials: {
    admin: { user: "ENV:WINDUP_ADMIN_USER", password: "ENV:WINDUP_ADMIN_PASSWORD" },
  },
}
```

En cualquier caso, los valores siguen viniendo de `.env.local` (en local) o de los secretos de CI, bajo esos nombres de variables.

## En CI

Versiona `windup.credentials.json` y luego define los mismos nombres de variables (`WINDUP_ADMIN_USER`, `WINDUP_ADMIN_PASSWORD`, …) como secretos del pipeline. Ningún secreto toca jamás el repositorio, y `windup secret list` te dice si falta alguno antes de una ejecución.
