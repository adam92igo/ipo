# IPO Compass

IPO Compass is a SaaS platform that guides European SMEs through IPO readiness.
It runs a weighted diagnostic questionnaire, computes a deterministic valuation
(DCF, sector comparables, market multiples), derives a prioritised roadmap from
the assessment results, and offers AI-assisted company profiling and an IPO
process assistant. MVP scope: France-first content (Pappers company registry,
Euronext Paris), English UI.

## Modules

1. **Foundations** — multi-tenant auth (better-auth, `organization` plugin: one
   organization owns N companies, roles `owner` / `admin` / `member`), business
   schema, dashboard shell.
2. **Diagnostic engine** — a weighted questionnaire (100+ questions across
   Governance, Finance, Growth, Compliance, Reporting), multi-step form with
   progress autosave, category scores, radar restitution.
3. **Valuation** — DCF (Gordon-Shapiro terminal value), sector EV/EBITDA and
   EV/Revenue comparables, aggregated min–max equity range with documented
   assumptions.
4. **Roadmap** — a rules engine that turns assessment weaknesses into a
   prioritised, ordered action plan (no AI).
5. **AI modules** — "Fill with AI" company-profile pre-fill (official website +
   Pappers registry only — no LinkedIn scraping) and a contextual IPO
   assistant that can read a company's frozen score, weaknesses, roadmap and
   valuation range. Degrades gracefully (banner, no network calls) when
   `ANTHROPIC_API_KEY` / `PAPPERS_API_KEY` are unset.

## Stack

- Next.js 15 (App Router) + TypeScript + Tailwind v4 + shadcn/ui
- PostgreSQL 17 (Docker) + Drizzle ORM (node-postgres)
- better-auth with the `organization` plugin
- Anthropic API (`claude-sonnet-5`) for the AI modules only
- Vitest (unit + integration) and Playwright (end-to-end)

## Architecture

- **Tenant isolation.** Every business table carries `organization_id`. All
  reads and writes go through `src/lib/data-access/`, which resolves the
  organization from the session (`requireOrgContext`) — the org id is never
  accepted from client input, and no route/component runs a raw Drizzle query.
- **Deterministic engines.** `src/engines/` (scoring, valuation, roadmap) are
  pure functions: no I/O, no framework imports, no `Date.now()`, no AI. They
  are developed test-first and are the only place readiness scores, valuation
  figures and roadmap rankings are computed.
- **AI, kept separate.** `src/lib/ai/` holds all Anthropic/Pappers integration
  code. AI never touches scoring, valuation or roadmap generation — it only
  suggests profile fields (never auto-saved) and answers questions using a
  read-only snapshot of already-computed data.
- **Versioned content.** Business content — the questionnaire, valuation
  reference ranges, roadmap rules — lives in `config/*.vN.json`, never
  hardcoded and never in the database. Every assessment, valuation run and
  roadmap item stores the config version it was computed with, so a released
  version file must never change in place: a SHA-256 pin test
  (`src/lib/config-immutability.test.ts`) fails the build if you edit one —
  ship a new `vN+1` file instead.

## Getting started

Prerequisites: Node 20+, pnpm, Docker.

```bash
cp .env.example .env        # then set BETTER_AUTH_SECRET (openssl rand -base64 32)
docker compose up -d        # PostgreSQL 17 (+ a separate test database)
pnpm install
pnpm db:migrate             # apply Drizzle migrations
pnpm dev                    # http://localhost:3000
```

There is no seed script: this is a multi-tenant app where each user creates
their own organization on first sign-in. Open `http://localhost:3000/sign-up`,
create an account, create your organization on the onboarding screen, then add
a company to unlock the assessment, valuation and roadmap modules.

To enable the AI modules, add to `.env` and restart the dev server:

```bash
ANTHROPIC_API_KEY=sk-ant-...
PAPPERS_API_KEY=...          # optional — registry pre-fill only
```

Without these keys the app runs normally; the AI Assistant page shows a setup
notice and the "Fill with AI" button is hidden.

## Commands

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Dev server (Turbopack) |
| `pnpm build` / `pnpm start` | Production build / server |
| `pnpm test` | Vitest — unit + integration (integration tests need Docker Postgres) |
| `pnpm test:watch` | Vitest in watch mode |
| `pnpm test:e2e` | Playwright smoke test — full journey against the test database |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm lint` | ESLint |
| `pnpm db:generate` / `pnpm db:migrate` | Drizzle Kit migrations (never edit generated SQL by hand) |
| `pnpm auth:schema` | Regenerate `src/db/schema/auth.ts` from the better-auth config |

## Project structure

```
config/                      Versioned business content (questionnaire, valuation refs, roadmap rules)
drizzle/                      Generated SQL migrations
e2e/                          Playwright end-to-end smoke test
src/
  app/                        Next.js routes: (auth), (dashboard), onboarding, api
  components/                 Shared UI (shadcn primitives + app components)
  db/                         Drizzle schema (auth.ts is generated — do not hand-edit)
  engines/                    Pure deterministic engines: scoring, valuation, roadmap
  lib/
    ai/                       Anthropic + Pappers integration (AI modules only)
    data-access/              The only layer allowed to query business tables
    questionnaire.ts, valuation-refs.ts, roadmap-rules.ts   Versioned config loaders
```

## A note on the valuation content

`config/valuation-refs.v2.json` documents, per sector, a `source`, `asOf` date
and `confidence` level for its EV/EBITDA and EV/Revenue ranges and WACC
building blocks. Several sectors (energy, consumer goods, business services)
are marked `confidence: "low"` because no dedicated French SME-specific
dataset was found during research — they are directionally reasonable proxies
derived from broader market benchmarks (Damodaran industry multiples, the
Argos Index mid-market survey), not verified figures. Anything below `medium`
confidence should be reviewed by a valuation professional before being used
in front of a client. The app itself always shows these as an indicative
range with method-level assumptions, never as a single precise number.
