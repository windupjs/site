---
title: CI / CD
description: Ejecuta toda la suite en un navegador caliente, haz fallar el build ante cualquier escenario fallido y emite informes JUnit, JSON o HTML autocontenido.
---

# CI / CD

```bash
npx windup run --all --reporter junit --report-file reports/windup.xml
```

- `--all` ejecuta cada escenario del directorio (un navegador caliente para toda la suite).
- **Resumen de la suite y agrupación por módulo.** `--all` imprime una línea de suite — tasa de aprobación, tasa de acierto de caché, replanificaciones, llamadas al LLM, coste, tiempo total — más un desglose por **módulo** (carpeta). El informe HTML agrupa los escenarios por módulo (con recuadros de acierto de caché / replanificación); JUnit emite un `<testsuite>` por módulo; JSON lleva el resumen completo (`by_module`, `flaky`) y un `module` por caso.
- **Puntuación de flakiness.** `--repeat <n>` se agrega por escenario — uno que pasa en algunas pero no en todas sus ejecuciones se lista como flaky (`passed X/N`), de modo que la flakiness dependiente de datos aparece antes de que hagas commit de un verde.
- El código de salida es distinto de cero cuando cualquier escenario falla.
- `--concurrency <n>` ejecuta escenarios en paralelo sobre un único navegador caliente compartido (~2× más rápido en una suite mixta); `--browser firefox|webkit` ejecuta la suite en modo multinavegador.
- `--reporter junit` emite JUnit XML (GitHub Actions, GitLab y Jenkins lo consumen de forma nativa); `--reporter json` emite un resumen legible por máquina; `--reporter html` emite una página autocontenida y amigable para humanos (sin JS/dependencias — súbela como artefacto de CI o ábrela localmente). Salida por defecto: `.windup/reports/`.
- `windup costs --json` reporta el gasto de IA para el seguimiento del pipeline.
- `--stream` emite **NDJSON** en stdout — un evento por hito (`run:start`, `planning`, `plan`, `action`, `replan`, `run:end`) — para que CI o un dashboard sigan la ejecución en vivo. El progreso humano (`--verbose`) va a stderr, manteniendo stdout como NDJSON puro.

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
