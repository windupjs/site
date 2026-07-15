---
title: Credenciales de prueba
description: Las credenciales nunca viven en escenarios, planes, la caché ni git — solo referencias. Los valores permanecen en .env.local o en secretos de CI, resueltos en tiempo de ejecución.
---

# Credenciales de prueba

Las credenciales nunca viven en los archivos de escenario, los planes, la caché ni git — solo **referencias**. Los valores permanecen en `.env.local` (gitignored) o en secretos de CI; el mapeo cuenta → nombre ENV vive en `windup.credentials.json` (versionado — no contiene valores) y se fusiona en el manifiesto del proyecto automáticamente.

```bash
npx windup secret set admin        # hidden interactive prompts → .env.local + mapping
npx windup secret list             # accounts + whether each ENV is set (never prints values)
```

Las tareas luego referencian la cuenta por nombre — *"inicia sesión con la cuenta admin"* — y los planes usan `value_ref: "ENV:WINDUP_ADMIN_PASSWORD"`, resuelto solo en tiempo de ejecución.

`windup new` hace esto automáticamente: las credenciales escritas en la instrucción se detectan, se registran y se depuran — el escenario generado menciona la cuenta, nunca los valores. En CI, define los mismos nombres de variables como secretos del pipeline.
