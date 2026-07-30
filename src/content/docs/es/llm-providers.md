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
  // apiKeyEnv: "GEMINI_API_KEY",           // ¿ya tienes la clave con otro nombre? apúntala aquí
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
- Claves de API: `GOOGLE_GENERATIVE_AI_API_KEY` / `OPENAI_API_KEY` por defecto. Para reutilizar una clave que tu proyecto ya guarda con otro nombre, apúntala con **`apiKeyEnv`** — ya sea a nivel de `llm` (`llm.apiKeyEnv: "GEMINI_API_KEY"`, se aplica al proveedor que no tenga override) o por proveedor (`llm.providers.openai.apiKeyEnv`, que tiene prioridad). No hace falta duplicar el secreto. `windup doctor` informa exactamente qué variable espera.
- Un **nombre de modelo incorrecto** se detecta como un error de configuración, no como un fallo de test: el 404 del proveedor se convierte en un mensaje accionable que nombra los modelos conocidos, la ejecución falla con `kind: config` (nunca se reintenta con `--retries`), y `windup doctor` avisa de antemano cuando el modelo configurado no está en la tabla de modelos conocidos.
- `baseUrl` (solo OpenAI) apunta a cualquier endpoint compatible con OpenAI — Azure, un proxy o un servidor de modelo local.
- Cambiar de proveedor nunca invalida la caché de planes: los planes son datos, los replays no usan LLM sin importar quién planificó.
- `windup costs` desglosa el gasto **por proveedor y por modelo**, de modo que alternar entre LLMs mantiene visible el gasto por proveedor.

## Planificar con tu suscripción de Claude (`--llm claude-code`)

Si ya pagas un plan de Claude (Pro/Max), puedes planificar con él en vez de comprar tokens de API — Windup controla la **CLI `claude` que ya tienes**, sin clave de API, sin servidor extra.

> **Opcional, nunca por defecto.** Usar una suscripción para planificar de forma programática es una zona gris no respaldada por Anthropic, y Windup no la opera. Para trabajo sensible a la fiabilidad (CI, suites compartidas), prefiere `--llm google` o `--llm openai`. Los replays en caché nunca llaman a ningún LLM, así que un plan hecho así se sigue reproduciendo a $0 sin nada en ejecución.

### Configuración — un comando

```bash
npx windup claude login    # instala la CLI claude si falta, luego inicia sesión con tu suscripción
npx windup claude status   # cuando quieras: "claude CLI: ready — tu@ejemplo.com (max plan)"
```

`windup claude login` instala la CLI de Claude Code (con tu confirmación — nunca una instalación global silenciosa, nunca en CI) y abre el propio inicio de sesión de navegador de Anthropic; tú haces clic en *autorizar* en tu cuenta. La **app de escritorio y la CLI inician sesión por separado**, así que tener la app de escritorio no basta. A mano, si prefieres: `npm install -g @anthropic-ai/claude-code`, luego `claude` → `/login` (elige "suscripción", no una clave de API).

Eso es todo — sin wrapper, sin Python, sin servidor local. Windup ejecuta `claude` en modo no interactivo para cada plan (desde un directorio temporal aislado, así nunca toma el `CLAUDE.md` de un proyecto).

### Varias cuentas — una por proyecto (`--profile`)

El login del CLI es **global**: un token, en un solo directorio de config, así que todo proyecto planifica con la cuenta que inició sesión más recientemente. Si tienes un plan personal más uno por cliente, eso significa que el trabajo del cliente consume en silencio *tu* plan. Ata cada proyecto a su propia cuenta, una vez:

```bash
cd ~/work/acme
npx windup claude login --profile acme     # config dir propio + ata este proyecto + inicia sesión
npx windup claude status                   # → confirma qué cuenta consume este proyecto
```

`--profile acme` le da a esa cuenta su **propio directorio de config** (`~/.claude-acme` — una sesión independiente), **ata el proyecto** a él exportando `CLAUDE_CONFIG_DIR` en `.envrc`, ejecuta `direnv allow`, y solo entonces abre el login. A partir de ahí, hacer `cd` en el proyecto hace que esa cuenta sea la que planifica — incluido el proceso `claude` que Windup ejecuta, que hereda el entorno. Repite por proyecto con otro nombre; tu `~/.claude` por defecto queda intacto como el perfil sin nombre.

Tu `.envrc` nunca se sobrescribe: a un archivo existente se le hace **append** (los demás exports intactos), volver a ejecutarlo no hace nada, y una atadura a un perfil *diferente* se detiene y te muestra la línea a editar. ¿Sin direnv? El comando imprime el `export` para poner en tu shell.

```bash
npx windup claude status                 # qué cuenta está activa aquí (email + plan) — no gasta tokens
npx windup claude status --profile acme  # comprueba un perfil con nombre sin cambiar a él
npx windup claude login --force          # cambia la cuenta activa (cierra sesión primero, diciendo de quién)
```

Dos cosas que vale saber: el `.claude/settings.json` de un proyecto **no** puede cambiar la cuenta (el directorio de config se resuelve antes de que esas settings carguen) — por eso la atadura vive en `.envrc`; y **los replays cacheados no llaman a ningún LLM**, así que con `.windup/cache/` versionado una suite corre a `$0` sin tocar ninguna cuenta.

```bash
npx windup run checkout --llm claude-code                 # modelo por defecto: claude-sonnet-4-6
npx windup run checkout --llm claude-code:claude-opus-4-6
WINDUP_LLM=claude-code npx windup run --all               # vía variable de entorno
```

Opcionalmente fíjalo en la config para que `windup run` a secas ya lo use:

```ts
// windup.config.ts
llm: { provider: "claude-code", model: "claude-sonnet-4-6" },
```

- **El costo se reporta como $0** en `windup costs` — los tokens son reales y quedan en el ledger, pero los cubre tu suscripción, así que Windup no inventa un precio por token para ellos.
- **Si `claude` no está instalado o con sesión iniciada**, la ejecución falla de inmediato con un mensaje accionable (instalar / `/login`), no un stack trace.
- **Más lento para planificar** que una API alojada (cada plan levanta el agente de la CLI — ~8–12s vs ~2–4s), pero la planificación ocurre una vez y se cachea; los replays son $0 e instantáneos igualmente.
- **Por dentro**: no hay modo JSON, así que Windup lleva el esquema del plan en el prompt y desenvuelve la respuesta de forma mecánica (Ajv sigue validando cada plan); `temperature`/`seed` no tienen equivalente en la CLI y no se envían.

### Alternativa: enrutar a través del claude-code-openai-wrapper (HTTP)

En vez de la CLI, puedes apuntar Windup al [claude-code-openai-wrapper](https://github.com/RichardAtCT/claude-code-openai-wrapper) — un proxy local **de terceros**, mantenido por la comunidad, que expone un endpoint compatible con OpenAI sobre tu sesión de Claude Code. Útil si ya lo ejecutas, quieres una frontera HTTP, o llegas a Claude vía Bedrock/Vertex por detrás. Windup usa el wrapper (en vez de ejecutar la CLI) **siempre que haya una URL configurada**:

```bash
# arranca el wrapper (necesita Python 3.11+ y Poetry), luego:
WINDUP_CLAUDE_CODE_URL=http://localhost:8000/v1 npx windup run checkout --llm claude-code
```

```ts
// windup.config.ts — mismo efecto, persistido
llm: { provider: "claude-code", providers: { "claude-code": { baseUrl: "http://localhost:8000/v1" } } },
```

Su auth de cliente viene desactivada; define `CLAUDE_CODE_API_KEY` solo si la habilitaste. Mismo costo $0, mismo desenvuelto. Un wrapper caído falla de inmediato con un mensaje que nombra la URL.
