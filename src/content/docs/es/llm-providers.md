---
title: Proveedores de LLM
description: El planificador es agnóstico al proveedor. Configura Google Gemini y OpenAI a la vez y elige uno por ejecución — cambiar nunca invalida la caché de planes.
---

# Proveedores de LLM

El planificador es agnóstico al proveedor. Se admiten Google Gemini y OpenAI; configura varios a la vez y elige uno por ejecución:

```ts
// windup.config.ts
llm: {
  provider: "google",                       // default for runs without --llm
  model: "gemini-3.1-flash-lite",
  providers: {
    openai: { model: "gpt-5-mini" },        // default model when --llm openai is used
    // openai: { apiKeyEnv: "MY_OPENAI_KEY", baseUrl: "https://my-proxy/v1" },
  },
},
```

```bash
npx windup run checkout                         # config default (google)
npx windup run checkout --llm openai            # provider default model (gpt-5-mini)
npx windup run checkout --llm openai:gpt-5-nano # explicit provider:model
WINDUP_LLM=openai:gpt-5-mini npx windup run --all   # same thing via env (CI)
```

- `--llm` funciona en `run`, `bench` (compara proveedores en el mismo escenario) y `scan` (capa de asistencia LLM).
- Claves de API: `GOOGLE_GENERATIVE_AI_API_KEY` / `OPENAI_API_KEY` por defecto; sobrescribe el nombre de la variable de entorno con `apiKeyEnv`.
- `baseUrl` (solo OpenAI) apunta a cualquier endpoint compatible con OpenAI — Azure, un proxy o un servidor de modelo local.
- Cambiar de proveedor nunca invalida la caché de planes: los planes son datos, los replays no usan LLM sin importar quién planificó.
- `windup costs` desglosa el gasto **por proveedor y por modelo**, de modo que alternar entre LLMs mantiene visible el gasto por proveedor.

## Planificar con tu suscripción de Claude (`--llm claude-code`)

Si ya pagas un plan de Claude (Pro/Max), puedes planificar con él en vez de comprar tokens de API. Windup habla con [claude-code-openai-wrapper](https://github.com/RichardAtCT/claude-code-openai-wrapper) — un servidor **de terceros** que ejecutas localmente y que le da una fachada compatible con OpenAI a tu propia sesión de Claude Code.

> **Opcional y mantenido por la comunidad.** El wrapper no está hecho ni soportado por Windup ni por Anthropic; controla el Claude Code CLI y puede romperse cuando cualquiera de los dos extremos cambia. Para trabajo sensible a la fiabilidad (CI, suites compartidas), prefiere `--llm google` o `--llm openai`. Los replays en caché nunca llaman a ningún LLM, así que un plan generado así se sigue reproduciendo a $0 sin nada en ejecución.

### Configuración inicial

**1. Conecta el Claude Code CLI a tu suscripción** (una vez). El wrapper se autentica *como tú*, a través del Claude Code CLI — así que el CLI debe estar con sesión iniciada con tu plan de Claude. La **app de escritorio y el CLI inician sesión por separado**; tener la app de escritorio no basta.

```bash
# Instala el CLI si no lo tienes:
npm install -g @anthropic-ai/claude-code
# Inicia sesión con tu plan Claude Pro/Max (elige "suscripción", no una clave de API):
claude
#   → ejecuta /login dentro del CLI y sigue el flujo del navegador
# ¿Ya iniciaste sesión? Si `claude` abre una sesión sin pedirte login, estás conectado.
```

**2. Instala y arranca el wrapper** (un proyecto Python aparte — necesita Python 3.11+ y [Poetry](https://python-poetry.org)):

```bash
git clone https://github.com/RichardAtCT/claude-code-openai-wrapper
cd claude-code-openai-wrapper
poetry install
cp .env.example .env          # los valores por defecto sirven; no hace falta ANTHROPIC_API_KEY con auth por suscripción
poetry run uvicorn src.main:app --port 8000
```

**3. Verifica que esté activo** (otra terminal):

```bash
curl http://localhost:8000/health     # → {"status":"healthy",...}
curl http://localhost:8000/v1/models  # → claude-sonnet-4-6, claude-opus-4-6, ...
```

**4. Apunta Windup hacia él** y planifica:

```bash
npx windup run checkout --llm claude-code                 # modelo por defecto: claude-sonnet-4-6
npx windup run checkout --llm claude-code:claude-opus-4-6
WINDUP_LLM=claude-code npx windup run --all               # vía variable de entorno
```

Opcionalmente fíjalo en la config para que `windup run` a secas ya lo use:

```ts
// windup.config.ts
llm: {
  provider: "claude-code",
  model: "claude-sonnet-4-6",
  providers: {
    "claude-code": { baseUrl: "http://localhost:8000/v1" },  // cambia solo si el wrapper no está en :8000
  },
},
```

### Notas y compensaciones

- **No hace falta clave de API.** La auth de cliente del propio wrapper viene desactivada; define `CLAUDE_CODE_API_KEY` solo si la habilitaste. Mueve el endpoint con `baseUrl` (config) o `WINDUP_CLAUDE_CODE_URL` (env).
- **El costo se reporta como $0** en `windup costs` — los tokens son reales y quedan en el ledger, pero los cubre tu suscripción, así que Windup no inventa un precio por token para ellos.
- **Si el wrapper no está en ejecución**, `windup run --llm claude-code` falla de inmediato con un mensaje que nombra la URL (no se cuelga en reintentos). Arranca el wrapper y vuelve a ejecutar.
- **Por dentro**: el wrapper implementa solo `model`/`messages`/`stream`, así que Windup lleva el esquema del plan en el prompt y desenvuelve la respuesta de forma mecánica (Ajv sigue validando cada plan), y `temperature`/`seed` no se envían. Sin un `ANTHROPIC_API_KEY` en el lado del wrapper, su lista de modelos es estática y llega hasta `claude-sonnet-4-6` / `claude-opus-4-6`.
