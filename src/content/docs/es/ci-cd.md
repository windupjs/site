---
title: CI / CD
description: Ejecuta toda la suite en un navegador caliente, haz fallar el build ante cualquier escenario fallido y emite informes JUnit, JSON o HTML autocontenido.
---

# CI / CD

```bash
npx windup run --all --reporter junit --report-file reports/windup.xml
```

- `--all` ejecuta cada escenario del directorio (un navegador caliente para toda la suite).
- **Resumen de la suite y agrupación por módulo.** `--all` imprime una línea de suite — tasa de aprobación, tasa de acierto de caché, replanificaciones, llamadas al LLM, coste y **tiempo real de ejecución** (wall-clock, tiempo transcurrido real; la suma inflada de totales se muestra al lado junto con la concurrencia, p. ej. `wall 130s (sum 512s · concurrency 4)`) — más un desglose por **módulo** (carpeta). El informe HTML agrupa los escenarios por módulo (con recuadros de acierto de caché / replanificación), encabeza con el tiempo real de ejecución, y da a cada escenario una barra de desglose de duración que reconcilia con su total; JUnit emite un `<testsuite>` por módulo; JSON lleva el resumen completo (`wall_ms`, `concurrency`, `by_module`, `flaky`) y un `duration_breakdown` por caso.
- **Puntuación de flakiness + pista de causa raíz.** `--repeat <n>` se agrega por escenario — uno que pasa en algunas pero no en todas sus ejecuciones se lista como flaky (`passed X/N`), con una **pista** de la causa probable leída de sus ejecuciones (deriva de la firma de la página inicial → carrera de hidratación; un fallo de red; siempre-la-misma-acción → un selector inestable; rotación de caché → replay no determinista), de modo que la flakiness dependiente de datos aparece y apunta a algún lado antes de que hagas commit de un verde.
- **Reintentar un flake — `--retries N`.** Vuelve a ejecutar un escenario que falló de forma **transitoria** (un reset de red, un fallo de verificación por carrera de hidratación, un `setup`/`dependency` inestable) hasta N veces más — gana el primer pase. Un bloqueo de `config.forbid` **nunca** se reintenta (una guarda deliberada, no un flake). El flake se **expone, no se oculta**: un escenario que solo se pone verde en un reintento se marca `flaky` (`↻ N passed only on retry` en la consola, una insignia `FLAKY N×` en el reporte HTML, `flaky`/`attempts` en JSON y en el stream `run:end`) — para que arregles la causa raíz en lugar de blanquear un build rojo a verde.
- **Presupuesto de tiempo — `--all --max-wall <seconds>`.** Una barrera: cuando el reloj de pared de la suite supera el tope, Windup **deja de iniciar nuevos escenarios** (los en curso terminan — nada se cancela a mitad) y **sale con código distinto de cero**, así una suite desbocada hace fallar el build en vez de colgar el runner. Funciona en secuencial y con `--concurrency`. Imprime `⏱ --max-wall Ns exceeded — X/Y ran, Z not started`.
- **Sharding — `--all --shard i/n`.** Ejecuta el shard *i* de *n* (reparto round-robin) para repartir una suite grande entre runners de CI en paralelo (`--shard 1/4`, `--shard 2/4`, …), cada uno un job separado.
- **Etiquetas — `--all --tag <names>`.** Etiqueta escenarios (`"tags": ["smoke", "checkout"]`) y ejecuta un subconjunto: `--tag smoke,checkout` ejecuta cualquier escenario que lleve una de esas etiquetas. Ejecuta smoke en cada push y la suite completa cada noche — se compone con `--shard` y `--changed`.
- **Traza + captura de pantalla al fallar — `--trace`.** Cuando un escenario falla, Windup guarda una **traza de Playwright** (`.windup/reports/traces/<id>.zip` — ábrela en el visor de trazas de Playwright: instantáneas del DOM, red y consola por paso) más una **captura de pantalla** de página completa, y el informe HTML enlaza ambas desde la fila fallida. Ve exactamente qué pasó en CI en lugar de adivinar por los tiempos. (Se captura solo al fallar — una ejecución que pasa no guarda nada.)
- **Salida para GitHub Actions — `--github`** (se activa automáticamente cuando `GITHUB_ACTIONS=true`). Emite una anotación `::error::` por cada escenario fallido (mostrada en línea en el PR) y escribe un resumen de suite en Markdown + una tabla por escenario en la página del job (`$GITHUB_STEP_SUMMARY`) — los resultados aparecen sin abrir un artefacto.
- **Accesibilidad — `--a11y`.** Tras cada escenario, ejecuta una auditoría con [axe-core](https://github.com/dequelabs/axe-core) sobre la página final e informa las violaciones — una comprobación de accesibilidad gratuita sobre infraestructura que Windup ya tiene. Informativa (nunca hace fallar la ejecución); dependencia opcional opt-in (`npm i -D axe-core`).
- **`windup doctor`** es una verificación previa (preflight) — clave del LLM, navegador, los escenarios parsean, sin fragmentos huérfanos, mapa del sitio escaneado — para atrapar los típicos problemas de «se va a romper en CI» antes de que corra el pipeline.
- El código de salida es distinto de cero cuando cualquier escenario falla.
- `--concurrency <n>` ejecuta escenarios en paralelo sobre un único navegador caliente compartido (~2× más rápido en una suite mixta); `--browser firefox|webkit` ejecuta la suite en modo multinavegador.
- **Ejecuciones incrementales (`--changed` / `--since <ref>`).** Con `--all`, ejecuta solo los escenarios que un cambio afecta: `--changed` compara el árbol de trabajo contra `HEAD`, `--since main` (o cualquier ref de git) contra esa ref. Un escenario se selecciona cuando su propio archivo cambió, cuando no tiene un plan en caché, o cuando su plan visita una ruta cuya **fuente indexada** cambió (la atribución archivo→ruta del mapa del sitio). Es sólido pero grueso y **nunca un falso verde silencioso**: si el diff toca archivos que el mapa no puede atribuir a una ruta (código compartido, configuración), o no hay git/mapa del sitio, Windup ejecuta la suite completa e imprime por qué. Mantén la atribución al día con `windup scan`; usa `--all` a secas para una compuerta completa pre-merge/nocturna.
- `--reporter junit` emite JUnit XML (GitHub Actions, GitLab y Jenkins lo consumen de forma nativa); `--reporter json` emite un resumen legible por máquina; `--reporter html` emite una página autocontenida y amigable para humanos (sin JS/dependencias — súbela como artefacto de CI o ábrela localmente). Salida por defecto: `.windup/reports/`. La lista de acciones por escenario del informe HTML muestra el **tipo y el objetivo** de cada paso (`a4 · fill · otp`, `a2 · click · Add to cart`, `a1 · goto · →/checkout`) — el valor de un fill nunca se muestra (los secretos/OTP quedan fuera).
- `windup costs --json` reporta el gasto de IA para el seguimiento del pipeline.
- `--stream` emite **NDJSON** en stdout — un evento por hito (`run:start`, `planning`, `plan`, `action`, `replan`, `run:end`) — para que CI o un dashboard sigan la ejecución en vivo. El progreso humano (`--verbose`) va a stderr, manteniendo stdout como NDJSON puro.

## Pruebas no destructivas — quédate en el límite del efecto secundario

Una suite que se ejecuta en **cada push** nunca debe cobrar una tarjeta, enviar un email/OTP, crear una cuenta ni mutar estado persistente. La regla confiable: **prueba hasta el límite de un efecto secundario, y detente ahí.** Casi toda pantalla es cubrible de este modo — las comprobaciones valiosas se disparan *antes* de la llamada de red:

- **Validación del lado del cliente** — email/CPF/tarjeta inválidos, campos obligatorios, valores fuera de rango. El mensaje aparece *antes* de cualquier petición, así que afirmarlo es seguro.
- **Pantallas de navegación y de lectura** — listas, filtros, pestañas, vistas de detalle, estados vacíos.
- **Estado del lado del cliente vía [`seed`](/scenarios/)** — cantidades/eliminación/límites del carrito (localStorage), un dispositivo POS (sessionStorage) — alcanzado sin un ida y vuelta al servidor.
- **Estados de error por tokens/slugs falsos** — `/order/BOGUS` → "no encontrado", un enlace inválido → "expirado". Totalmente determinista, sin necesidad de datos de seed.
- **Diálogos de confirmación — ábrelos y *cancélalos*.** Afirma que aparece el diálogo "¿Eliminar?", luego descártalo (un `confirm` nativo vía `"dialog": "dismiss"`; un modal haciendo clic en Cancelar). Verificas la UI de guarda sin realizar la acción destructiva.

Mantén fuera de CI: pago real, envíos de OTP/email/WhatsApp, creación de cuenta/empresa, guardar configuración que persiste (**cuidado con los toggles de un solo clic que guardan sin paso de confirmación**), un check-in que consume un voucher, y — lo más peligroso de todo — **cambiar la contraseña de la cuenta de prueba**. Windup no te impedirá escribir tal paso, así que la disciplina vive en los escenarios: cada uno se detiene antes de la acción irreversible. `setup`/`teardown` existen para las escrituras que genuinamente debes ejercitar — hazlas contra un fixture desechable, nunca datos de producción.

## Ejemplo: GitHub Actions

```yaml
- run: npm ci && npx playwright install chromium
- run: npx windup run --all --base-url http://localhost:8080 --reporter junit --report-file reports/windup.xml
  env:
    GOOGLE_GENERATIVE_AI_API_KEY: ${{ secrets.GEMINI_KEY }}
- uses: dorny/test-reporter@v1
  if: always()
  with: { name: windup, path: reports/windup.xml, reporter: java-junit }
```
