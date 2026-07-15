---
title: Environments
description: Run the same scenarios across dev, staging and CI. The plan cache is environment-portable — keyed by URL path, not host.
---

# Environments (dev / staging / CI)

The start URL origin comes from, in precedence order:

1. `--base-url` flag
2. `WINDUP_BASE_URL` env
3. `baseUrl` in `windup.config.ts`
4. an absolute `start_url` in the scenario

An explicit override rebases even absolute scenario URLs (path and query are preserved).

The plan cache is **environment-portable**: cache identity uses the start URL *path*, not host/port. A plan generated against `localhost:8080` replays on staging or CI with zero LLM calls.

```bash
npx windup run checkout --base-url https://staging.example.com
WINDUP_BASE_URL=http://localhost:8080 npx windup run --all
```
