# IPO Compass

IPO Compass is a SaaS platform that guides French SMEs through IPO readiness.
It runs a weighted diagnostic questionnaire, computes a deterministic valuation
(DCF, sector comparables, market multiples), derives a prioritised roadmap from
the assessment results, and offers AI-assisted company profiling and an IPO
process assistant.

The product is **France-only by design**, not a placeholder for future
countries: the questionnaire is built around Euronext Growth/Access admission
rules, the registry lookup is Pappers (French SIREN), sector valuation ranges
are French-market multiples, and the roadmap cites French regulations (Code de
commerce, AMF). Supporting a second country would mean a second questionnaire,
valuation reference set, registry integration and roadmap rule set — out of
scope on purpose, to go deep on one market rather than shallow on many. UI
copy is in English; amounts are in EUR.

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

Prerequisites: Node 22.13+, Docker, and a GitHub account added as a
collaborator on this repo (it's private — ask the repo owner for access
before cloning).

```bash
git clone git@github.com:adam92igo/ipo.git
cd ipo
corepack enable              # lets pnpm auto-use the exact version pinned
                              # in package.json's "packageManager" — no
                              # separate pnpm install needed
cp .env.example .env         # then set BETTER_AUTH_SECRET (openssl rand -base64 32)
docker compose up -d         # PostgreSQL 17 (+ a separate test database)
pnpm install
pnpm db:migrate               # apply Drizzle migrations
pnpm dev                      # http://localhost:3000
```

If `pnpm install` fails immediately with an engine error, your Node version
is too old (`node --version` — needs 22.13+); this project sets
`engine-strict` on purpose so that fails loudly instead of surfacing as a
confusing runtime error later.

There is no seed script: this is a multi-tenant app where each user creates
their own organization on first sign-in. Open `http://localhost:3000/sign-up`,
create an account, create your organization on the onboarding screen, then add
a company to unlock the assessment, valuation and roadmap modules. (Want
realistic pre-filled data to click through instead? See "Demo environment"
below.)

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

### Contributing

Direct pushes to `main` are blocked by a repository ruleset — work on a
branch and open a pull request; all 6 CI checks (see below) must pass before
it can be merged. See [CLAUDE.md](CLAUDE.md) for the full architecture and
workflow conventions.

## Demo environment

A separate, disposable environment for showing the product (investors, sales)
without touching your dev data: its own database (`ipo_compass_demo`) and its
own port (`3200`), so it can run alongside `pnpm dev` without conflicting.

Each organization owns exactly one company — that's the real product's
tenancy model (see "Non-negotiable invariants" in [CLAUDE.md](CLAUDE.md)) — so
the demo uses **3 separate logins**, one per readiness stage, rather than one
account managing several companies:

| Login | Company | Stage |
|---|---|---|
| `demo-ready@ipocompass.local` | Solstice Technologies SAS (Software) | Investment-ready (~97%) |
| `demo-progress@ipocompass.local` | Ardennes Composites SAS (Industrials) | Mid-journey (~49%) |
| `demo-early@ipocompass.local` | Bellevue Retail SAS (Consumer Retail) | Just started (assessment in progress) |

One-time setup:

```bash
# 1. Add to .env:
DEMO_DATABASE_URL=postgresql://ipo:ipo_dev_password@localhost:5432/ipo_compass_demo
DEMO_ACCOUNT_EMAIL_READY=demo-ready@ipocompass.local
DEMO_ACCOUNT_EMAIL_MID=demo-progress@ipocompass.local
DEMO_ACCOUNT_EMAIL_EARLY=demo-early@ipocompass.local

# 2. Start the demo server (creates + migrates the demo database on first run)
pnpm demo

# 3. Open http://localhost:3200/sign-up and sign up 3 times, once per email
#    above, creating an organization on the onboarding screen each time (use
#    the same password for all 3 if you want one to remember for the pitch).

# 4. Populate the 3 organizations with their fictional company
pnpm demo:seed
```

`pnpm demo:seed` is idempotent: it wipes and recreates each organization's
seeded company every time (never the accounts or organizations), so before a
pitch just run it again to reset to a pristine state. It reuses the real
scoring, valuation and roadmap engines — nothing is hand-fabricated, so the
numbers you see are exactly what those engines compute for the seeded
answers/financials. The demo server also raises the AI rate limits (see
above) so a live walkthrough can't accidentally trip them, and shares
whatever `ANTHROPIC_API_KEY` / `PAPPERS_API_KEY` are in `.env` — set them if
you want to demo the AI modules live, or leave them unset to show the
degraded-mode banner instead.

During a pitch, log out and back in between companies to move from stage to
stage — that's the same flow a prospect goes through, which makes it a more
honest demo than one account switching between several companies.

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
