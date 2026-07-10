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

Prerequisites: Node 22.13+ (required by pnpm 11), pnpm, Docker.

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

### AI rate limits

Both AI endpoints are rate-limited per organization (a sliding window over an
event log in Postgres — see `src/lib/data-access/rate-limit.ts`), not per IP,
so one member's usage counts against their whole organization and never
affects other tenants. Defaults, overridable in `.env`:

```bash
RATE_LIMIT_FILL_PROFILE_PER_HOUR=10        # "Fill with AI" calls per organization per hour
RATE_LIMIT_ASSISTANT_MESSAGES_PER_DAY=100  # assistant user-turns per organization per day
```

The assistant is metered by the number of user turns in each request, not by
request count — a request that carries many turns costs proportionally more,
so a single oversized call can't buy unlimited chat past the limit. Exceeding
either limit returns an explicit error (HTTP 429 with a `Retry-After` header
for the assistant API; a `{ ok: false, error }` result for the "Fill with AI"
server action) surfaced in the UI the same way as any other AI error.

## Demo environment

A separate, disposable environment for showing the product (investors, sales)
without touching your dev data: its own database (`ipo_compass_demo`) and its
own port (`3200`), so it can run alongside `pnpm dev` without conflicting.

One-time setup:

```bash
# 1. Add to .env:
DEMO_DATABASE_URL=postgresql://ipo:ipo_dev_password@localhost:5432/ipo_compass_demo
DEMO_ACCOUNT_EMAIL=demo@ipocompass.local   # the email you'll sign up with below

# 2. Start the demo server (creates + migrates the demo database on first run)
pnpm demo

# 3. Open http://localhost:3200/sign-up, sign up with DEMO_ACCOUNT_EMAIL, and
#    create an organization on the onboarding screen.

# 4. Populate it with 3 fictional companies at different readiness stages
pnpm demo:seed
```

`pnpm demo:seed` is idempotent: it wipes and recreates the seeded companies
every time (never the account or organization), so before a pitch just run
it again to reset to a pristine state. It reuses the real scoring, valuation
and roadmap engines — nothing is hand-fabricated, so the numbers you see are
exactly what those engines compute for the seeded answers/financials. The
demo server also raises the AI rate limits (see above) so a live walkthrough
can't accidentally trip them, and shares whatever `ANTHROPIC_API_KEY` /
`PAPPERS_API_KEY` are in `.env` — set them if you want to demo the AI modules
live, or leave them unset to show the degraded-mode banner instead.

## Commands

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Dev server (Turbopack) |
| `pnpm build` / `pnpm start` | Production build / server |
| `pnpm test` | Vitest — unit + integration (integration tests need Docker Postgres) |
| `pnpm test:watch` | Vitest in watch mode |
| `pnpm test:e2e` | Playwright smoke test — full journey against the test database |
| `pnpm demo` | Demo server on port 3200, against a separate demo database |
| `pnpm demo:seed` | (Re)populate the demo database with 3 fictional companies |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm lint` | ESLint |
| `pnpm db:generate` / `pnpm db:migrate` | Drizzle Kit migrations (never edit generated SQL by hand) |
| `pnpm auth:schema` | Regenerate `src/db/schema/auth.ts` from the better-auth config |

## CI

Every push to `main` and every pull request runs `.github/workflows/ci.yml`:

| Job | What it checks |
| --- | --- |
| `typecheck` | `tsc --noEmit` |
| `lint` | ESLint |
| `test` | Vitest (unit + integration, Postgres service container) |
| `test-e2e` | Playwright smoke test (Postgres service container) |
| `semgrep` | `p/javascript`, `p/typescript`, `p/owasp-top-ten` — **fails on any WARNING-or-above finding**. (`p/nextjs` is skipped: on Semgrep's free tier it currently ships zero rules.) |
| `osv-scanner` | Scans `package.json` / `pnpm-lock.yaml` — **fails on any HIGH/CRITICAL (CVSS ≥ 7.0) known vulnerability** |

A repository ruleset on `main` requires all six checks to pass before a pull
request can be merged, and blocks force-pushes and branch deletion.

Note on the Semgrep gate: Semgrep's own severity taxonomy on the free
registry tier doesn't line up with what actually matters — real, high-impact
findings (e.g. a hardcoded JWT secret) are commonly tagged `WARNING`, not
`ERROR`, even though Semgrep's own CLI labels them "Blocking". An ERROR-only
gate would rarely trigger in practice, so the CI gate fails on WARNING or
above instead.

## Project structure

```
config/                      Versioned business content (questionnaire, valuation refs, roadmap rules)
drizzle/                      Generated SQL migrations
e2e/                          Playwright end-to-end smoke test
scripts/                      Standalone scripts (demo server + seed data)
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
