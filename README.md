# IPO Compass

SaaS platform that guides European SMEs through IPO readiness: weighted diagnostic
questionnaire, deterministic valuation, rules-based roadmap and AI-assisted company
profiling. See [CLAUDE.md](./CLAUDE.md) for architecture and invariants.

## Getting started

Prerequisites: Node 20+, pnpm, Docker.

```bash
cp .env.example .env        # then set BETTER_AUTH_SECRET (openssl rand -base64 32)
docker compose up -d        # PostgreSQL 17 (+ separate test database)
pnpm install
pnpm db:migrate             # apply Drizzle migrations
pnpm dev                    # http://localhost:3000
```

## Scripts

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Dev server (Turbopack) |
| `pnpm test` | Vitest — unit + integration (needs Docker Postgres) |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm lint` | ESLint |
| `pnpm db:generate` / `pnpm db:migrate` | Drizzle Kit migrations |
| `pnpm auth:schema` | Regenerate `src/db/schema/auth.ts` from the better-auth config |

## Module roadmap

1. **Foundations** — multi-tenant auth (better-auth organizations), schema, dashboard ✅
2. **Diagnostic engine** — weighted questionnaire, category scores, radar restitution (TDD)
3. **Valuation** — DCF, sector comparables, market multiples (TDD)
4. **Roadmap** — rules engine from assessment results
5. **AI modules** — profile pre-fill (official website + Pappers), IPO assistant
