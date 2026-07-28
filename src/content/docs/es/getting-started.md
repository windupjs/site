---
title: Primeros pasos
description: Instala Windup, inicializa un proyecto y pasa de una instrucción imprecisa a una prueba con replay determinista en cinco comandos.
---

# Primeros pasos

**Pruebas E2E en lenguaje natural con replay determinista — el LLM planifica una vez, los replays se ejecutan sin él.**

Describe una prueba en lenguaje natural — *"inicia sesión con la cuenta de prueba, añade el producto X al carrito, finaliza la compra y verifica la confirmación del pedido"* — y Windup la convierte en un plan JSON determinista de acciones del navegador. A partir de la segunda ejecución, la prueba se reproduce **con cero llamadas al LLM**: ~1 segundo, $0, resultados estables.

```bash
npm i -D windupjs        # Chromium is provisioned automatically (one-time, machine-wide cache)
npx windup init          # 3 questions → windup.config.ts + example scenario
npx windup scan          # index your app's routes & elements from source code
npx windup new "log in as admin and create an invoice"   # LLM-assisted scenario authoring
npx windup run checkout  # 1st run: the LLM plans · every run after: ~1s replay, $0
```

## Requisitos

- **Node ≥ 20.**
- Una **clave de API** para tu LLM planificador en `.env.local` o `.env` (`.env.local` gana — úsalo cuando tu `.env` esté versionado): `GOOGLE_GENERATIVE_AI_API_KEY` para Google (por defecto) o `OPENAI_API_KEY` para OpenAI.

Las claves se usan solo para planificar; los replays en caché nunca llaman a un LLM. Para usar un Chrome existente en vez del Chromium descargado automáticamente, define `CHROME_PATH`; para omitir la descarga por completo, define `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1`.

## Un recorrido de cinco minutos

El flujo completo en un proyecto nuevo, con lo que deberías esperar ver:

```bash
# 1. Install — Chromium is provisioned automatically
npm i -D windupjs

# 2. Initialize — 3 questions (base URL, model, scenarios dir)
npx windup init
#    → windup.config.ts + e2e/scenarios/ + .windup/ (cache & map versionados; state/runs/reports en gitignore)

# 3. Index your app from source — before anything ever runs
npx windup scan
#    scan complete (full): framework=react-router routes=106 elements=1125
#    The site map now knows your real routes and selectors; the planner
#    will use them instead of guessing. Re-run after big changes
#    (windup scan --update re-indexes only files changed since, via git).

# 4. Register test credentials once — values never touch git
npx windup secret set admin        # hidden prompts → .env.local + mapping

# 5. Author a scenario from a rough instruction
npx windup new "log in with the admin account and create an invoice for ACME"
#    → e2e/scenarios/create-invoice-acme.json — precise task grounded in
#      your real screens, account referenced by name, final verification

# 6. First run — the LLM plans once (~3s, ~$0.002)
npx windup run create-invoice-acme
#    PASS  create-invoice-acme  cache=miss llm_calls=1 ... cost=$0.0024

# 7. Every run after — deterministic replay, zero LLM
npx windup run create-invoice-acme
#    PASS  create-invoice-acme  cache=hit llm_calls=0 total=600ms cost=$0

# 8. Read results like a human, ship reports to CI
npx windup run --all --summary --reporter html
npx windup costs                   # AI spend: totals, per provider/model
```

Si una ejecución falla tras un cambio en la app, el plan en caché se invalida y se replanifica automáticamente en la siguiente ejecución — **editas escenarios, no selectores.**
