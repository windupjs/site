---
title: Entornos
description: Ejecuta los mismos escenarios en dev, staging y CI. La caché de planes es portable entre entornos — indexada por la ruta de la URL, no por el host.
---

# Entornos (dev / staging / CI)

El origen de la URL de inicio proviene de, en orden de precedencia:

1. el flag `--base-url`
2. la variable de entorno `WINDUP_BASE_URL`
3. `baseUrl` en `windup.config.ts`
4. un `start_url` absoluto en el escenario

Una sobrescritura explícita rebasa incluso las URLs absolutas del escenario (se preservan la ruta y la query).

La caché de planes es **portable entre entornos**: la identidad de la caché usa la *ruta* de la URL de inicio, no el host/puerto. Un plan generado contra `localhost:8080` se reproduce en staging o CI con cero llamadas al LLM.

```bash
npx windup run checkout --base-url https://staging.example.com
WINDUP_BASE_URL=http://localhost:8080 npx windup run --all
```
