# IPO Compass Brand Cockpit Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the generic indigo/sidebar interface with the approved navy-and-gold, trajectory-led IPO cockpit while preserving every existing workflow and deterministic business result.

**Architecture:** Introduce a presentation-only brand layer and a horizontal authenticated shell, then assemble one organization-scoped cockpit snapshot through the existing data-access boundary. Pure helpers derive display states and the five-stage trajectory; server pages pass those results into focused visual components. Existing engines, database schema, versioned configs, actions, and API routes remain unchanged.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, Tailwind v4, shadcn/Radix primitives, Drizzle ORM, PostgreSQL 17, Vitest, Playwright.

## Global Constraints

- UI copy remains English.
- Amounts remain EUR.
- France-only positioning and French-market references remain visible where relevant.
- No scoring, valuation, roadmap, questionnaire, config-version, database-schema, AI, or tenancy behavior changes.
- All business reads remain in `src/lib/data-access/` and require an `OrgContext`; routes and components never run raw Drizzle queries.
- No client input may contain an `organizationId`.
- Gold `#D1A13A` is reserved for active direction, milestones, important deltas, and route corrections.
- The transparent approved mark in `docs/superpowers/specs/assets/ipo-compass-mark.png` is the only source for the compact application logo.
- Barlow Condensed is used for display/navigation/data figures, Source Sans 3 for body/forms/chat, and IBM Plex Mono for utility metadata.
- Missing data renders an explicit state and next action; it never renders as a fake zero.
- Text and controls meet WCAG AA, selection never relies on color alone, focus remains visible, and reduced-motion preferences are respected.
- Do not add dark mode or a production dependency.

---

## File Map

### Create

- `public/brand/ipo-compass-mark.png` — production copy of the approved transparent mark.
- `src/components/brand/brand-mark.tsx` — accessible compact logo rendering.
- `src/components/brand/brand-mark.test.tsx` — server-render contract for the mark.
- `src/components/layout/app-header.tsx` — desktop and mobile authenticated navigation.
- `src/components/layout/page-heading.tsx` — shared page title, description, metadata, and action layout.
- `src/components/layout/instrument-panel.tsx` — clipped-corner presentation surface.
- `src/lib/navigation.ts` and `src/lib/navigation.test.ts` — company-aware module hrefs and active-route matching.
- `src/lib/cockpit.ts` and `src/lib/cockpit.test.ts` — pure trajectory and availability mapping.
- `src/lib/data-access/cockpit.ts` and `src/lib/data-access/cockpit.integration.test.ts` — organization-scoped overview snapshot assembly.
- `src/components/cockpit/readiness-bearing.tsx` — readable score instrument.
- `src/components/cockpit/market-trajectory.tsx` — accessible five-stage trajectory.
- `src/components/cockpit/metric-scale.tsx` — low/mid/high range instrument.
- `src/components/cockpit/priority-signal-list.tsx` — compact roadmap/assessment priorities.
- `src/components/cockpit/snapshot-state.tsx` — directed missing/in-progress state.
- `src/components/cockpit/cockpit-components.test.tsx` — static-render accessibility contracts.

### Modify

- `src/app/layout.tsx` — approved font families and metadata.
- `src/app/globals.css` — tokens, typography, grid background, focus, and reduced-motion rules.
- `src/components/ui/button.tsx`, `card.tsx`, `badge.tsx`, `input.tsx`, `textarea.tsx`, `select.tsx`, `dialog.tsx`, `tabs.tsx` — brand geometry and focus treatment without API changes.
- `src/app/(dashboard)/layout.tsx` — horizontal shell and company-aware navigation.
- `src/app/(dashboard)/dashboard/page.tsx` — cockpit overview.
- `src/app/(dashboard)/companies/page.tsx` — single-company profile/empty state treatment.
- `src/app/(dashboard)/companies/[companyId]/assessment/assessment-form.tsx` — branded progress, section index, and answer controls.
- `src/app/(dashboard)/companies/[companyId]/results/page.tsx` — readiness bearing and signal lists.
- `src/components/charts/radar-chart.tsx`, `score-gauge.tsx`, `valuation-range-chart.tsx` — approved colors and text equivalents.
- `src/app/(dashboard)/companies/[companyId]/valuation/page.tsx` and `financials-manager.tsx` — valuation instrument styling.
- `src/app/(dashboard)/companies/[companyId]/roadmap/page.tsx` and `roadmap-view.tsx` — ordered route styling.
- `src/app/(dashboard)/assistant/page.tsx` and `assistant-chat.tsx` — cockpit shell treatment with neutral conversation typography.
- `src/app/(auth)/layout.tsx`, `sign-in/page.tsx`, `sign-up/page.tsx`, and `src/app/onboarding/page.tsx` — brand-led entry experience.
- `e2e/smoke.spec.ts` — shell navigation, cockpit, mobile menu, and existing full-journey coverage.

### Delete after migration

- `src/components/app-sidebar.tsx` — no consumer remains after the horizontal shell ships.

---

### Task 1: Brand assets, fonts, tokens, and shared visual primitives

**Files:**
- Create: `public/brand/ipo-compass-mark.png`
- Create: `src/components/brand/brand-mark.tsx`
- Create: `src/components/brand/brand-mark.test.tsx`
- Create: `src/components/layout/page-heading.tsx`
- Create: `src/components/layout/instrument-panel.tsx`
- Modify: `src/app/layout.tsx`
- Modify: `src/app/globals.css`
- Modify: `src/components/ui/button.tsx`
- Modify: `src/components/ui/card.tsx`
- Modify: `src/components/ui/badge.tsx`
- Modify: `src/components/ui/input.tsx`
- Modify: `src/components/ui/textarea.tsx`
- Modify: `src/components/ui/select.tsx`
- Modify: `src/components/ui/dialog.tsx`
- Modify: `src/components/ui/tabs.tsx`

**Interfaces:**
- Produces: `BrandMark({ className?, priority?, decorative? })`, `PageHeading`, and `InstrumentPanel` for all later tasks.
- Preserves: every existing shadcn component prop and variant name.

- [ ] **Step 1: Write the brand-mark rendering test**

```tsx
// src/components/brand/brand-mark.test.tsx
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BrandMark } from "./brand-mark";

describe("BrandMark", () => {
  it("uses the approved transparent asset and accessible name", () => {
    const html = renderToStaticMarkup(<BrandMark />);
    expect(html).toContain('src="/brand/ipo-compass-mark.png"');
    expect(html).toContain('alt="IPO Compass"');
  });

  it("can be decorative when the adjacent wordmark names the brand", () => {
    const html = renderToStaticMarkup(<BrandMark decorative />);
    expect(html).toContain('alt=""');
  });
});
```

- [ ] **Step 2: Run the test and verify the missing module failure**

Run: `pnpm vitest run src/components/brand/brand-mark.test.tsx`

Expected: FAIL because `./brand-mark` does not exist.

- [ ] **Step 3: Install the approved asset and implement the brand primitives**

Run:

```bash
mkdir -p public/brand
cp docs/superpowers/specs/assets/ipo-compass-mark.png public/brand/ipo-compass-mark.png
```

Create `src/components/brand/brand-mark.tsx`:

```tsx
import Image from "next/image";
import { cn } from "@/lib/utils";

export function BrandMark({
  className,
  priority = false,
  decorative = false,
}: {
  className?: string;
  priority?: boolean;
  decorative?: boolean;
}) {
  return (
    <Image
      src="/brand/ipo-compass-mark.png"
      alt={decorative ? "" : "IPO Compass"}
      width={889}
      height={920}
      priority={priority}
      className={cn("h-auto w-12 object-contain", className)}
    />
  );
}
```

Create `src/components/layout/page-heading.tsx`:

```tsx
import { cn } from "@/lib/utils";

export function PageHeading({
  eyebrow,
  title,
  description,
  metadata,
  actions,
  className,
}: {
  eyebrow: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  metadata?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("flex flex-wrap items-end justify-between gap-4", className)}>
      <div className="min-w-0">
        <div className="font-utility text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {eyebrow}
        </div>
        <h1 className="mt-1 font-heading text-4xl font-extrabold uppercase leading-none tracking-tight text-primary md:text-5xl">
          {title}
        </h1>
        {description && <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{description}</p>}
      </div>
      {(metadata || actions) && (
        <div className="flex flex-wrap items-center gap-3">
          {metadata}
          {actions}
        </div>
      )}
    </header>
  );
}
```

Create `src/components/layout/instrument-panel.tsx`:

```tsx
import { cn } from "@/lib/utils";

export function InstrumentPanel({
  title,
  eyebrow,
  action,
  children,
  className,
}: {
  title?: React.ReactNode;
  eyebrow?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("instrument-panel", className)}>
      {(title || eyebrow || action) && (
        <header className="mb-4 flex items-start justify-between gap-4">
          <div>
            {eyebrow && <div className="instrument-label">{eyebrow}</div>}
            {title && <h2 className="font-heading text-xl font-extrabold uppercase tracking-wide">{title}</h2>}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}
```

- [ ] **Step 4: Replace the font setup and global tokens**

In `src/app/layout.tsx`, replace `Inter`/`Geist_Mono` with:

```tsx
import { Barlow_Condensed, IBM_Plex_Mono, Source_Sans_3 } from "next/font/google";

const sourceSans = Source_Sans_3({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const barlowCondensed = Barlow_Condensed({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-utility",
  subsets: ["latin"],
  weight: ["500", "600"],
  display: "swap",
});
```

Apply all three variables to `<html>`. In `src/app/globals.css`, map `--font-heading` and `--font-utility` in `@theme inline`, replace the light theme with the exact palette from the spec, set `--radius: 0.25rem`, and add:

```css
@layer components {
  .instrument-panel {
    position: relative;
    border: 1px solid var(--border);
    background: var(--card);
    padding: 1rem;
    clip-path: polygon(0 0, calc(100% - 0.875rem) 0, 100% 0.875rem, 100% 100%, 0 100%);
  }
  .instrument-panel::after {
    content: "";
    position: absolute;
    right: 0;
    top: 0;
    border-top: 0.875rem solid var(--border);
    border-left: 0.875rem solid transparent;
  }
  .instrument-label {
    font-family: var(--font-utility);
    font-size: 0.6875rem;
    font-weight: 600;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--muted-foreground);
  }
  .workspace-grid {
    background-color: var(--background);
    background-image:
      linear-gradient(rgb(6 43 75 / 0.03) 1px, transparent 1px),
      linear-gradient(90deg, rgb(6 43 75 / 0.03) 1px, transparent 1px);
    background-size: 29px 29px;
  }
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    scroll-behavior: auto !important;
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

Restyle the listed `src/components/ui/*` files through their existing CVA/class strings: squared `rounded-sm` geometry, navy primary, gold focus/active accents, visible `focus-visible:ring-2`, and no prop/variant removals.

- [ ] **Step 5: Run focused and static verification**

Run:

```bash
pnpm vitest run src/components/brand/brand-mark.test.tsx
pnpm typecheck
pnpm lint
```

Expected: all commands PASS.

- [ ] **Step 6: Commit the brand foundation**

```bash
git add public/brand src/components/brand src/components/layout src/app/layout.tsx src/app/globals.css src/components/ui
git commit -m "feat: add IPO Compass brand foundation"
```

---

### Task 2: Horizontal command navigation and authenticated shell

**Files:**
- Create: `src/lib/navigation.ts`
- Create: `src/lib/navigation.test.ts`
- Create: `src/components/layout/app-header.tsx`
- Modify: `src/app/(dashboard)/layout.tsx`
- Modify: `e2e/smoke.spec.ts`
- Delete: `src/components/app-sidebar.tsx`

**Interfaces:**
- Produces: `getDashboardNav(companyId: string | null): DashboardNavItem[]`.
- Produces: `AppHeader({ company, userName, userEmail, organizationName, role })`.
- Consumes: `BrandMark`, existing `UserMenu`, `Sheet`, and `listCompanies(ctx)`.

- [ ] **Step 1: Write navigation mapping tests**

```ts
// src/lib/navigation.test.ts
import { describe, expect, it } from "vitest";
import { getDashboardNav, isDashboardNavActive } from "./navigation";

describe("dashboard navigation", () => {
  it("routes company modules through the only company", () => {
    expect(getDashboardNav("company-1").map((item) => [item.label, item.href])).toEqual([
      ["Overview", "/dashboard"],
      ["Diagnostic", "/companies/company-1/assessment"],
      ["Valuation", "/companies/company-1/valuation"],
      ["Roadmap", "/companies/company-1/roadmap"],
      ["Assistant", "/assistant"],
    ]);
  });

  it("sends unavailable company modules to company setup", () => {
    expect(getDashboardNav(null).slice(1, 4).every((item) => item.href === "/companies")).toBe(true);
  });

  it("matches nested module routes without matching unrelated prefixes", () => {
    expect(isDashboardNavActive("/companies/company-1/results", "Diagnostic", "company-1")).toBe(true);
    expect(isDashboardNavActive("/assistant", "Assistant", "company-1")).toBe(true);
    expect(isDashboardNavActive("/companies/company-2/valuation", "Valuation", "company-1")).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test and verify failure**

Run: `pnpm vitest run src/lib/navigation.test.ts`

Expected: FAIL because `src/lib/navigation.ts` does not exist.

- [ ] **Step 3: Implement company-aware navigation**

```ts
// src/lib/navigation.ts
export type DashboardNavLabel = "Overview" | "Diagnostic" | "Valuation" | "Roadmap" | "Assistant";

export interface DashboardNavItem {
  index: string;
  label: DashboardNavLabel;
  href: string;
}

export function getDashboardNav(companyId: string | null): DashboardNavItem[] {
  const setup = "/companies";
  return [
    { index: "00", label: "Overview", href: "/dashboard" },
    { index: "01", label: "Diagnostic", href: companyId ? `/companies/${companyId}/assessment` : setup },
    { index: "02", label: "Valuation", href: companyId ? `/companies/${companyId}/valuation` : setup },
    { index: "03", label: "Roadmap", href: companyId ? `/companies/${companyId}/roadmap` : setup },
    { index: "04", label: "Assistant", href: "/assistant" },
  ];
}

export function isDashboardNavActive(
  pathname: string,
  label: DashboardNavLabel,
  companyId: string | null,
): boolean {
  if (label === "Overview") return pathname === "/dashboard";
  if (label === "Assistant") return pathname.startsWith("/assistant");
  if (!companyId) return pathname.startsWith("/companies");
  const base = `/companies/${companyId}`;
  if (label === "Diagnostic") return pathname.startsWith(`${base}/assessment`) || pathname.startsWith(`${base}/results`);
  if (label === "Valuation") return pathname.startsWith(`${base}/valuation`);
  return pathname.startsWith(`${base}/roadmap`);
}
```

- [ ] **Step 4: Implement the accessible header and mobile sheet**

Create a client `AppHeader` that:

- renders `BrandMark decorative` plus the text wordmark and tagline;
- renders the five `getDashboardNav(company?.id ?? null)` links on desktop;
- uses `isDashboardNavActive` and `aria-current="page"` for the active item;
- hides indices before labels at medium widths;
- exposes a button named `Open navigation` below the desktop breakpoint;
- renders the same five plain text links inside the existing `Sheet` primitive;
- renders company name/country and `UserMenu` at the far right;
- uses a 4px gold bottom rule for the active desktop link and a gold left rule in the mobile sheet.

Use this exact prop contract:

```ts
interface AppHeaderProps {
  company: { id: string; name: string; country: string } | null;
  organizationName: string;
  role: string;
  userName: string;
  userEmail: string;
}
```

- [ ] **Step 5: Replace the sidebar shell**

In `src/app/(dashboard)/layout.tsx`, resolve `const [company] = await listCompanies(ctx)`, render `AppHeader` above `<main className="workspace-grid flex-1 p-4 md:p-6 lg:p-8">`, and remove `SidebarProvider`, `SidebarInset`, `SidebarTrigger`, and `Separator`.

Delete `src/components/app-sidebar.tsx` only after `rg "AppSidebar|app-sidebar" src` returns no consumers.

- [ ] **Step 6: Add shell assertions to the E2E journey**

Immediately after company creation in `e2e/smoke.spec.ts`, add:

```ts
await page.goto("/dashboard");
await expect(page.getByRole("navigation", { name: "Primary navigation" })).toBeVisible();
for (const label of ["Overview", "Diagnostic", "Valuation", "Roadmap", "Assistant"]) {
  await expect(page.getByRole("link", { name: label, exact: true })).toBeVisible();
}
await expect(page.getByRole("link", { name: "Companies", exact: true })).toHaveCount(0);
```

- [ ] **Step 7: Verify and commit the shell**

Run:

```bash
pnpm vitest run src/lib/navigation.test.ts
pnpm typecheck
pnpm lint
```

Expected: PASS.

Commit:

```bash
git add src/lib/navigation.ts src/lib/navigation.test.ts src/components/layout/app-header.tsx 'src/app/(dashboard)/layout.tsx' src/components/app-sidebar.tsx e2e/smoke.spec.ts
git commit -m "feat: replace sidebar with command navigation"
```

---

### Task 3: Pure cockpit display model and trajectory mapping

**Files:**
- Create: `src/lib/cockpit.ts`
- Create: `src/lib/cockpit.test.ts`

**Interfaces:**
- Produces: `deriveMarketTrajectory(globalScore)` and explicit `SnapshotState` unions.
- Does not import DB, framework, config loader, or engine modules.

- [ ] **Step 1: Write boundary and availability tests**

```ts
// src/lib/cockpit.test.ts
import { describe, expect, it } from "vitest";
import { deriveMarketTrajectory, valuationState } from "./cockpit";

describe("deriveMarketTrajectory", () => {
  it.each([
    [null, "foundation"],
    [0, "foundation"],
    [39.99, "foundation"],
    [40, "financial_control"],
    [59.99, "financial_control"],
    [60, "governance"],
    [74.99, "governance"],
    [75, "equity_story"],
    [89.99, "equity_story"],
    [90, "market_ready"],
    [100, "market_ready"],
  ])("maps %s to %s", (score, expected) => {
    expect(deriveMarketTrajectory(score).current.id).toBe(expected);
  });

  it("marks every earlier stage completed and keeps labels textual", () => {
    const result = deriveMarketTrajectory(72);
    expect(result.stages.map((stage) => [stage.label, stage.state])).toEqual([
      ["Foundation", "completed"],
      ["Financial control", "completed"],
      ["Governance", "current"],
      ["Equity story", "future"],
      ["Market ready", "future"],
    ]);
  });
});

describe("valuationState", () => {
  it("distinguishes missing financials from a pending valuation run", () => {
    expect(valuationState(0, null)).toEqual({ kind: "missing_financials" });
    expect(valuationState(3, null)).toEqual({ kind: "ready_to_run" });
  });
});
```

- [ ] **Step 2: Run the tests and verify failure**

Run: `pnpm vitest run src/lib/cockpit.test.ts`

Expected: FAIL because `src/lib/cockpit.ts` does not exist.

- [ ] **Step 3: Implement the presentation-only model**

```ts
// src/lib/cockpit.ts
export type TrajectoryStageId =
  | "foundation"
  | "financial_control"
  | "governance"
  | "equity_story"
  | "market_ready";

export type TrajectoryStageState = "completed" | "current" | "future";

export interface TrajectoryStage {
  id: TrajectoryStageId;
  label: string;
  state: TrajectoryStageState;
}

const STAGES: Array<{ id: TrajectoryStageId; label: string; minimum: number }> = [
  { id: "foundation", label: "Foundation", minimum: 0 },
  { id: "financial_control", label: "Financial control", minimum: 40 },
  { id: "governance", label: "Governance", minimum: 60 },
  { id: "equity_story", label: "Equity story", minimum: 75 },
  { id: "market_ready", label: "Market ready", minimum: 90 },
];

export function deriveMarketTrajectory(globalScore: number | null) {
  const score = Math.max(0, Math.min(100, globalScore ?? 0));
  const currentIndex = STAGES.reduce(
    (selected, stage, index) => (score >= stage.minimum ? index : selected),
    0,
  );
  const stages: TrajectoryStage[] = STAGES.map((stage, index) => ({
    id: stage.id,
    label: stage.label,
    state: index < currentIndex ? "completed" : index === currentIndex ? "current" : "future",
  }));
  return { current: stages[currentIndex], stages };
}

export type AssessmentSnapshotState =
  | { kind: "missing" }
  | { kind: "in_progress"; answered: number; total: number }
  | { kind: "available"; score: number; completedAt: Date; questionnaireVersion: string; categoryScores: Record<string, number> };

export type ValuationSnapshotState =
  | { kind: "missing_financials" }
  | { kind: "ready_to_run" }
  | { kind: "available"; low: number; mid: number; high: number; methodCount: number; refsVersion: string; createdAt: Date };

export function valuationState(
  financialYearCount: number,
  available: Extract<ValuationSnapshotState, { kind: "available" }> | null,
): ValuationSnapshotState {
  if (available) return available;
  return financialYearCount === 0 ? { kind: "missing_financials" } : { kind: "ready_to_run" };
}
```

- [ ] **Step 4: Run focused and full pure tests**

Run:

```bash
pnpm vitest run src/lib/cockpit.test.ts
pnpm test -- src/engines/scoring src/engines/valuation src/engines/roadmap
```

Expected: PASS and no engine snapshot/result changes.

- [ ] **Step 5: Commit**

```bash
git add src/lib/cockpit.ts src/lib/cockpit.test.ts
git commit -m "feat: define cockpit presentation model"
```

---

### Task 4: Organization-scoped cockpit snapshot

**Files:**
- Create: `src/lib/data-access/cockpit.ts`
- Create: `src/lib/data-access/cockpit.integration.test.ts`

**Interfaces:**
- Consumes: existing company, assessment, answer, valuation, financial, and roadmap data-access functions.
- Produces: `getCockpitSnapshot(ctx: OrgContext): Promise<CockpitSnapshot>`.
- Produces no writes and accepts no client-provided organization ID.

- [ ] **Step 1: Write integration tests for empty, available, and cross-tenant states**

Create `src/lib/data-access/cockpit.integration.test.ts` with these imports and deterministic fixture helpers:

```ts
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { getQuestionnaire, CURRENT_QUESTIONNAIRE_VERSION } from "../questionnaire";
import { migrateTestDb, seedOrgWithUser, truncateAll } from "../../test/db";
import { completeAssessment, getOrCreateActiveAssessment, saveAnswer } from "./assessments";
import { createCompany } from "./companies";
import { upsertFinancialYear } from "./financials";
import { generateRoadmapForAssessment } from "./roadmap";
import { runValuation } from "./valuations";
import { getCockpitSnapshot } from "./cockpit";

const questionnaire = getQuestionnaire(CURRENT_QUESTIONNAIRE_VERSION);

function completeAnswers(): Record<string, boolean | number | string> {
  const values: Record<string, boolean | number | string> = {};
  for (const category of questionnaire.categories) {
    for (const question of category.questions) {
      if (question.type === "yes_no") values[question.id] = true;
      else if (question.type === "scale_0_4") values[question.id] = 4;
      else values[question.id] = [...question.choices!].sort((a, b) => b.value - a.value)[0].id;
    }
  }
  values["com-01"] = false;
  values["com-02"] = "never";
  return values;
}

async function seedCompletedCockpit() {
  const ctx = await seedOrgWithUser("owner");
  const company = await createCompany(ctx, { name: "Tenant A SAS", sector: "Software", country: "FR" });
  const assessment = await getOrCreateActiveAssessment(ctx, company.id);
  for (const [questionId, value] of Object.entries(completeAnswers())) {
    await saveAnswer(ctx, assessment.id, questionId, value);
  }
  await completeAssessment(ctx, assessment.id);
  for (const fiscalYear of [2023, 2024, 2025]) {
    await upsertFinancialYear(ctx, company.id, {
      fiscalYear,
      revenue: 5_000_000 + (fiscalYear - 2023) * 500_000,
      ebitda: 1_000_000,
      netIncome: 600_000,
      netDebt: 200_000,
      freeCashFlow: 700_000,
    });
  }
  await runValuation(ctx, company.id);
  await generateRoadmapForAssessment(ctx, assessment.id);
  return { ctx, company };
}
```

Use `beforeAll(migrateTestDb)` and `beforeEach(truncateAll)`, then assert these exact contracts in three tests:

```ts
expect(await getCockpitSnapshot(ownerCtxWithoutCompany)).toEqual({ kind: "no_company" });

const empty = await getCockpitSnapshot(ownerCtxWithCompany);
expect(empty.kind).toBe("company");
if (empty.kind === "company") {
  expect(empty.assessment).toEqual({ kind: "missing" });
  expect(empty.valuation).toEqual({ kind: "missing_financials" });
  expect(empty.priorities).toEqual([]);
  expect(empty.trajectory.current.id).toBe("foundation");
}

const populated = await getCockpitSnapshot(ownerCtxWithCompletedData);
expect(populated.kind).toBe("company");
if (populated.kind === "company") {
  expect(populated.company.id).toBe(ownerCompany.id);
  expect(populated.assessment.kind).toBe("available");
  expect(populated.valuation.kind).toBe("available");
  expect(populated.priorities.every((item) => item.status !== "done")).toBe(true);
  expect(populated.priorities).toHaveLength(3);
}

const tenantA = await seedCompletedCockpit();
const secondTenantCtx = await seedOrgWithUser("owner");
const otherTenant = await getCockpitSnapshot(secondTenantCtx);
expect(otherTenant).toEqual({ kind: "no_company" });
expect(JSON.stringify(otherTenant)).not.toContain(tenantA.company.id);
expect(JSON.stringify(otherTenant)).not.toContain(tenantA.company.name);
```

The cross-tenant assertion should compare against the second tenant's own state and never expose the first tenant company name, id, scores, valuation, or priorities.

- [ ] **Step 2: Run the integration test and verify failure**

Run: `pnpm vitest run src/lib/data-access/cockpit.integration.test.ts`

Expected: FAIL because `getCockpitSnapshot` does not exist.

- [ ] **Step 3: Implement the snapshot types and read path**

Create this public contract in `src/lib/data-access/cockpit.ts`:

```ts
export type CockpitPriority = {
  id: string;
  title: string;
  category: string;
  priority: "critical" | "high" | "medium" | "low";
  estimatedWeeks: number | null;
  status: "todo" | "in_progress";
  source: "roadmap" | "assessment";
};

export type CockpitSnapshot =
  | { kind: "no_company" }
  | {
      kind: "company";
      company: Pick<Company, "id" | "name" | "country" | "sector">;
      assessment: AssessmentSnapshotState;
      valuation: ValuationSnapshotState;
      priorities: CockpitPriority[];
      attentionCount: number;
      limitingCategory: string | null;
      financialYearCount: number;
      latestFinancialYear: number | null;
      trajectory: ReturnType<typeof deriveMarketTrajectory>;
    };

export async function getCockpitSnapshot(ctx: OrgContext): Promise<CockpitSnapshot>;
```

Implementation sequence:

1. Call `listCompanies(ctx)` and return `{ kind: "no_company" }` when empty.
2. For the one company, fetch latest assessment, latest completed assessment, financials, and latest valuation run in parallel.
3. If a completed assessment exists, fetch its roadmap items and answers in parallel.
4. Use roadmap items first: exclude `done`, preserve database order, take three.
5. When no roadmap items exist, use `rankPriorityActions(getQuestionnaire(version), answers)`, take three, and map them with `source: "assessment"`, `status: "todo"`, `estimatedWeeks: null`, and `priority: "high"`.
6. Count every unresolved roadmap item whose priority is `critical` or `high`; when no roadmap exists, count assessment weaknesses from `classifyCategories`.
7. Find `limitingCategory` from the lowest frozen category score and return its questionnaire label.
8. Convert the latest stored `ValuationRunResults` into `ValuationSnapshotState`; never rerun an engine during a read.
9. Use `getProgress` only for an in-progress assessment and its stored answers; never expose a provisional global score.

- [ ] **Step 4: Verify tenant isolation and regressions**

Run:

```bash
pnpm vitest run src/lib/data-access/cockpit.integration.test.ts
pnpm vitest run src/lib/data-access/org-context.test.ts src/lib/data-access/companies.integration.test.ts src/lib/data-access/assessments.integration.test.ts src/lib/data-access/roadmap.integration.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/data-access/cockpit.ts src/lib/data-access/cockpit.integration.test.ts
git commit -m "feat: assemble tenant-scoped cockpit snapshot"
```

---

### Task 5: Overview cockpit components and page

**Files:**
- Create: `src/components/cockpit/readiness-bearing.tsx`
- Create: `src/components/cockpit/market-trajectory.tsx`
- Create: `src/components/cockpit/metric-scale.tsx`
- Create: `src/components/cockpit/priority-signal-list.tsx`
- Create: `src/components/cockpit/snapshot-state.tsx`
- Create: `src/components/cockpit/cockpit-components.test.tsx`
- Modify: `src/app/(dashboard)/dashboard/page.tsx`
- Modify: `e2e/smoke.spec.ts`

**Interfaces:**
- Consumes: `CockpitSnapshot`, `TrajectoryStage[]`, `formatEurCompact`, brand primitives.
- Produces: an overview that has no I/O outside the server page.

- [ ] **Step 1: Write static-render accessibility tests**

```tsx
// src/components/cockpit/cockpit-components.test.tsx
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ReadinessBearing } from "./readiness-bearing";
import { MarketTrajectory } from "./market-trajectory";
import { MetricScale } from "./metric-scale";

describe("cockpit components", () => {
  it("renders the readiness score as text, not only graphics", () => {
    const html = renderToStaticMarkup(<ReadinessBearing score={72} label="Advancing" />);
    expect(html).toContain("72%");
    expect(html).toContain("Advancing");
    expect(html).toContain('aria-label="IPO readiness: 72%, Advancing"');
  });

  it("renders the trajectory as an ordered list with textual states", () => {
    const stages = [
      { id: "foundation" as const, label: "Foundation", state: "completed" as const },
      { id: "financial_control" as const, label: "Financial control", state: "current" as const },
      { id: "governance" as const, label: "Governance", state: "future" as const },
    ];
    const html = renderToStaticMarkup(<MarketTrajectory stages={stages} />);
    expect(html).toContain("<ol");
    expect(html).toContain("Foundation — completed");
    expect(html).toContain("Financial control — current");
  });

  it("labels low, midpoint, and high values", () => {
    const html = renderToStaticMarkup(<MetricScale low={18_400_000} mid={21_500_000} high={24_700_000} />);
    expect(html).toContain("Low");
    expect(html).toContain("Midpoint");
    expect(html).toContain("High");
  });
});
```

- [ ] **Step 2: Run the tests and verify failure**

Run: `pnpm vitest run src/components/cockpit/cockpit-components.test.tsx`

Expected: FAIL because the cockpit components do not exist.

- [ ] **Step 3: Implement the five focused cockpit components**

Implement these exact prop contracts:

```ts
ReadinessBearing({ score, label, delta? }: { score: number; label: string; delta?: number | null })
MarketTrajectory({ stages }: { stages: TrajectoryStage[] })
MetricScale({ low, mid, high }: { low: number; mid: number; high: number })
PrioritySignalList({ companyId, items }: { companyId: string; items: CockpitPriority[] })
SnapshotState({ title, description, action }: { title: string; description: string; action: React.ReactNode })
```

Requirements:

- `ReadinessBearing` uses CSS geometry and adjacent text; no canvas and no third-party chart dependency.
- `MarketTrajectory` is an `<ol>`; each item includes visually hidden `${label} — ${state}` text.
- `MetricScale` uses `formatEurCompact` and sets midpoint position as `(mid-low)/(high-low)`, clamped to `0–100`; equal ranges center at `50%`.
- `PrioritySignalList` links roadmap-sourced items to `/companies/${companyId}/roadmap` and assessment-sourced items to `/companies/${companyId}/results`.
- `SnapshotState` is direction-first copy, not a mood illustration.

- [ ] **Step 4: Replace the generic dashboard with the snapshot-driven cockpit**

`src/app/(dashboard)/dashboard/page.tsx` must:

1. Resolve `ctx`, then call only `getCockpitSnapshot(ctx)` for business data.
2. Render the existing no-company call to action when `kind === "no_company"`.
3. Render `PageHeading` with company name and data-snapshot metadata.
4. Render the three-region primary panel in this order: readiness, valuation, attention.
5. Render `MarketTrajectory` immediately below the primary metrics.
6. Render readiness category bars, three priorities, valuation confidence, and data freshness beneath the trajectory.
7. Use real frozen scores and stored valuation results only.
8. Keep every empty/in-progress path explicit and linked to its module.

- [ ] **Step 5: Extend the E2E cockpit assertions**

After the completed assessment and valuation/roadmap generation, navigate back to `/dashboard` and assert:

```ts
await page.goto("/dashboard");
await expect(page.getByText("Readiness index")).toBeVisible();
await expect(page.getByText("Route to market")).toBeVisible();
await expect(page.getByText("Indicative equity value")).toBeVisible();
await expect(page.getByRole("list", { name: "Route to market" })).toBeVisible();
await expect(page.getByText("Smoke Test SAS")).toBeVisible();
```

- [ ] **Step 6: Verify and commit**

Run:

```bash
pnpm vitest run src/components/cockpit/cockpit-components.test.tsx src/lib/cockpit.test.ts
pnpm typecheck
pnpm lint
```

Expected: PASS.

Commit:

```bash
git add src/components/cockpit 'src/app/(dashboard)/dashboard/page.tsx' e2e/smoke.spec.ts
git commit -m "feat: build the IPO position cockpit"
```

---

### Task 6: Diagnostic and results visual migration

**Files:**
- Modify: `src/app/(dashboard)/companies/[companyId]/assessment/assessment-form.tsx`
- Modify: `src/app/(dashboard)/companies/[companyId]/results/page.tsx`
- Modify: `src/components/charts/radar-chart.tsx`
- Modify: `src/components/charts/score-gauge.tsx`
- Modify: `e2e/smoke.spec.ts`

**Interfaces:**
- Preserves: `AssessmentForm` props and every action invocation.
- Consumes: `PageHeading`, `InstrumentPanel`, and `ReadinessBearing`.

- [ ] **Step 1: Add E2E contracts for the redesigned diagnostic**

Before answering questions in `e2e/smoke.spec.ts`, assert:

```ts
await expect(page.getByRole("progressbar", { name: "Assessment completion" })).toHaveAttribute("aria-valuenow", "0");
await expect(page.getByRole("navigation", { name: "Assessment sections" })).toBeVisible();
await expect(page.getByRole("button", { name: "Governance section" })).toHaveAttribute("aria-current", "step");
```

On results, replace the old `Global score` assertion with:

```ts
await expect(page.getByLabel(/IPO readiness: \d+%/)).toBeVisible();
await expect(page.getByText("Readiness signals")).toBeVisible();
```

- [ ] **Step 2: Run the E2E test and confirm the new semantic contracts fail**

Run: `pnpm test:e2e -- --grep "IPO readiness journey"`

Expected: FAIL on the missing progressbar/section-navigation semantics before any implementation change.

- [ ] **Step 3: Restyle the assessment without changing behavior**

In `assessment-form.tsx`:

- replace the local page header with `PageHeading`;
- give the global progress wrapper `role="progressbar"`, `aria-label="Assessment completion"`, `aria-valuemin={0}`, `aria-valuemax={total}`, and `aria-valuenow={answered}`;
- wrap category controls in `<nav aria-label="Assessment sections">`;
- name each category button `${c.label} section` and apply `aria-current={i === step ? "step" : undefined}`;
- replace pill styling with an uppercase Barlow section index, gold bottom rule for current, check icon plus text for complete;
- wrap questions in `InstrumentPanel` while retaining every `handleAnswer`, optimistic rollback, and completion path unchanged;
- make answer options square, keep `aria-pressed`, and add `focus-visible:ring-2 focus-visible:ring-ring`.

- [ ] **Step 4: Restyle results as evidence beneath the readiness bearing**

In `results/page.tsx`:

- use `PageHeading` and `ReadinessBearing`;
- title the combined category/radar region `Readiness signals`;
- keep the full radar and every numeric category score;
- render strengths and weaknesses as two ruled signal lists rather than nested muted cards;
- render priority actions through the same ordered visual language as `PrioritySignalList` but preserve assessment-specific labels;
- keep questionnaire version, assessment date, thresholds, mismatch fallback, reassess, and roadmap links visible.

Update the three chart components to use `--color-primary`, `--color-direction`, `--color-attention`, and `--color-positive`; do not hardcode obsolete indigo values.

- [ ] **Step 5: Verify engines and E2E**

Run:

```bash
pnpm vitest run src/engines/scoring/scoring.test.ts src/lib/questionnaire.test.ts
pnpm test:e2e -- --grep "IPO readiness journey"
pnpm typecheck
pnpm lint
```

Expected: PASS; the journey still completes all 102 questions and reaches results.

- [ ] **Step 6: Commit**

```bash
git add 'src/app/(dashboard)/companies/[companyId]/assessment/assessment-form.tsx' 'src/app/(dashboard)/companies/[companyId]/results/page.tsx' src/components/charts e2e/smoke.spec.ts
git commit -m "feat: restyle diagnostic and readiness results"
```

---

### Task 7: Valuation and roadmap instrument migration

**Files:**
- Modify: `src/app/(dashboard)/companies/[companyId]/valuation/page.tsx`
- Modify: `src/app/(dashboard)/companies/[companyId]/valuation/financials-manager.tsx`
- Modify: `src/components/charts/valuation-range-chart.tsx`
- Modify: `src/app/(dashboard)/companies/[companyId]/roadmap/page.tsx`
- Modify: `src/app/(dashboard)/companies/[companyId]/roadmap/roadmap-view.tsx`
- Modify: `e2e/smoke.spec.ts`

**Interfaces:**
- Preserves: financial actions, `RunValuationButton`, roadmap generation, and status-update actions.
- Consumes: `PageHeading`, `InstrumentPanel`, and `MetricScale`.

- [ ] **Step 1: Add failing E2E contracts for valuation and roadmap**

After valuation completes, add:

```ts
await expect(page.getByRole("region", { name: "Indicative equity range" })).toBeVisible();
await expect(page.getByText("Low")).toBeVisible();
await expect(page.getByText("Midpoint")).toBeVisible();
await expect(page.getByText("High")).toBeVisible();
```

After roadmap generation, add:

```ts
await expect(page.getByRole("list", { name: "IPO preparation roadmap" })).toBeVisible();
await expect(page.getByText(/Rules v\d/)).toBeVisible();
```

- [ ] **Step 2: Run E2E and verify the semantic contracts fail**

Run: `pnpm test:e2e -- --grep "IPO readiness journey"`

Expected: FAIL because the named region/list do not exist yet.

- [ ] **Step 3: Migrate valuation presentation**

- use `PageHeading` for company and disclaimer;
- keep the financial history editor first when no run exists, and place it below the range once results exist;
- wrap the aggregate range in `<section aria-label="Indicative equity range">` and render `MetricScale` plus the textual range;
- keep method cards, every assumption, skipped-method reason, sector label, refs version, and note;
- align input/output numerals with `font-utility tabular-nums`;
- update `valuation-range-chart.tsx` to navy/gold/steel tokens while retaining its accessible text and data.

- [ ] **Step 4: Migrate roadmap presentation**

- use `PageHeading` and preserve the generate/refresh action;
- render roadmap items inside `<ol aria-label="IPO preparation roadmap">`;
- make `RoadmapItemCard` render an `<li>`-compatible item surface with visible sequence, title, description, priority, category, duration, and status select;
- use gold only for current/high-direction emphasis, attention red for critical, and positive green for done;
- keep completed items readable at AA contrast and do not hide them;
- keep exact rules version, assessment date, and duration disclaimer.

- [ ] **Step 5: Verify deterministic results and journey**

Run:

```bash
pnpm vitest run src/engines/valuation/valuation.test.ts src/engines/roadmap/roadmap.test.ts src/lib/data-access/financials.integration.test.ts src/lib/data-access/roadmap.integration.test.ts
pnpm test:e2e -- --grep "IPO readiness journey"
pnpm typecheck
pnpm lint
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add 'src/app/(dashboard)/companies/[companyId]/valuation' src/components/charts/valuation-range-chart.tsx 'src/app/(dashboard)/companies/[companyId]/roadmap' e2e/smoke.spec.ts
git commit -m "feat: restyle valuation and roadmap instruments"
```

---

### Task 8: Assistant, company profile, authentication, and onboarding migration

**Files:**
- Modify: `src/app/(dashboard)/assistant/page.tsx`
- Modify: `src/app/(dashboard)/assistant/assistant-chat.tsx`
- Modify: `src/app/(dashboard)/companies/page.tsx`
- Modify: `src/app/(dashboard)/companies/create-company-dialog.tsx`
- Modify: `src/app/(auth)/layout.tsx`
- Modify: `src/app/(auth)/sign-in/page.tsx`
- Modify: `src/app/(auth)/sign-up/page.tsx`
- Modify: `src/app/onboarding/page.tsx`
- Modify: `e2e/smoke.spec.ts`

**Interfaces:**
- Preserves: auth actions, organization creation, company creation/AI fill, chat streaming, rate-limit errors, and degraded AI mode.
- Consumes: `BrandMark`, `PageHeading`, and `InstrumentPanel`.

- [ ] **Step 1: Add entry and degraded-assistant E2E contracts**

At sign-up, assert:

```ts
await expect(page.getByRole("img", { name: "IPO Compass" })).toBeVisible();
await expect(page.getByText("Navigate. Prepare. Go public.")).toBeVisible();
```

At the degraded assistant page, retain the existing API-call assertion and add:

```ts
await expect(page.getByRole("heading", { name: "IPO Assistant" })).toBeVisible();
await expect(page.getByText("Deterministic scores and valuations remain unchanged.")).toBeVisible();
```

- [ ] **Step 2: Run E2E and verify the new copy/asset assertions fail**

Run: `pnpm test:e2e -- --grep "IPO readiness journey"`

Expected: FAIL on the new brand copy or assistant disclaimer.

- [ ] **Step 3: Migrate authentication and onboarding**

- replace the Lucide compass in `src/app/(auth)/layout.tsx` with the full-size `BrandMark` and text wordmark;
- replace the generic indigo arc with navy/gold trajectory lines and one clipped panel; no illustration dependency;
- use the exact visible line `Navigate. Prepare. Go public.`;
- preserve sign-in/sign-up headings, labels, validation, submit state, and cross-links;
- apply the same brand header to onboarding while keeping organization creation behavior unchanged.

- [ ] **Step 4: Migrate company and assistant surfaces**

- treat `/companies` as the one-company profile/setup page, not a company index;
- keep the create-company dialog, AI-fill behavior, country, website, SIREN, headcount, and role gating;
- use `PageHeading` and an `InstrumentPanel` profile surface;
- use `PageHeading` on assistant and keep Source Sans 3 for all chat content;
- keep suggestions and composer neutral, with instrument styling limited to context/status controls;
- preserve the exact streaming loop, 12-turn bound, error rendering, and no-AI fallback;
- add the visible disclaimer `Deterministic scores and valuations remain unchanged.` beside the existing educational guidance.

- [ ] **Step 5: Verify auth, AI, and full journey**

Run:

```bash
pnpm vitest run src/lib/ai/ai.test.ts src/lib/rate-limit/window.test.ts src/lib/data-access/org-context.test.ts
pnpm test:e2e -- --grep "IPO readiness journey"
pnpm typecheck
pnpm lint
```

Expected: PASS and zero `/api/assistant` calls in degraded mode.

- [ ] **Step 6: Commit**

```bash
git add 'src/app/(dashboard)/assistant' 'src/app/(dashboard)/companies/page.tsx' 'src/app/(dashboard)/companies/create-company-dialog.tsx' 'src/app/(auth)' src/app/onboarding/page.tsx e2e/smoke.spec.ts
git commit -m "feat: extend the brand across product entry points"
```

---

### Task 9: Responsive navigation, accessibility, visual QA, and full verification

**Files:**
- Modify: `e2e/smoke.spec.ts`
- Potential corrective scope, only when a Step 2 or Step 4 check demonstrates a defect: `src/components/layout/app-header.tsx`, `src/app/globals.css`, and the page/component that fails its named route check

**Interfaces:**
- Verifies: 320px layout, mobile navigation, keyboard focus, reduced motion, full journey, and build quality.
- Produces no new business behavior.

- [ ] **Step 1: Add mobile navigation checks to the existing authenticated journey**

At the end of `e2e/smoke.spec.ts`, add:

```ts
await page.setViewportSize({ width: 390, height: 844 });
await page.goto("/dashboard");
const menuButton = page.getByRole("button", { name: "Open navigation" });
await expect(menuButton).toBeVisible();
await menuButton.click();
await expect(page.getByRole("dialog").getByRole("link", { name: "Overview", exact: true })).toBeVisible();
await expect(page.getByRole("dialog").getByRole("link", { name: "Diagnostic", exact: true })).toBeVisible();
const documentWidth = await page.evaluate(() => document.documentElement.scrollWidth);
expect(documentWidth).toBeLessThanOrEqual(390);
```

- [ ] **Step 2: Run E2E and fix only demonstrated responsive defects**

Run: `pnpm test:e2e -- --grep "IPO readiness journey"`

Expected: PASS after fixing any actual overflow, inaccessible sheet, ambiguous labels, or hidden controls found by the test. Do not introduce unrelated layout changes.

- [ ] **Step 3: Run automated quality gates**

Run in this order:

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm test:e2e
pnpm build
```

Expected: all commands exit `0`.

- [ ] **Step 4: Perform browser visual QA at the approved breakpoints**

Start the disposable demo with `pnpm demo`, then inspect these exact routes at `1440×900`, `1024×768`, `390×844`, and `320×800`:

- `/sign-in`
- `/dashboard`
- `/companies`
- `/companies/<demo-company-id>/assessment`
- `/companies/<demo-company-id>/results`
- `/companies/<demo-company-id>/valuation`
- `/companies/<demo-company-id>/roadmap`
- `/assistant`

For each route verify:

- logo has no white square and remains crisp;
- primary navigation is quiet, readable, and active state is text plus gold rule;
- no horizontal overflow;
- clipped corners do not cut text, focus rings, menus, or dialogs;
- gold is not used as a general decoration;
- headings, body copy, and metadata use their assigned font roles;
- empty/degraded states state the next action;
- reduced-motion mode removes entrance/transition motion;
- 200% zoom preserves every action and label.

Fix only issues that violate the approved spec, then rerun the closest automated command.

- [ ] **Step 5: Confirm no architectural boundary changed**

Run:

```bash
git diff main...HEAD -- src/engines config src/db/schema
rg -n "db\.|from \"@/db|organizationId" 'src/app' src/components
```

Expected:

- first command prints no changes;
- second command shows no newly introduced raw database query or client-supplied organization ID.

- [ ] **Step 6: Commit final QA fixes**

If QA produced tracked changes:

```bash
git add src e2e public/brand
git commit -m "fix: polish responsive cockpit experience"
```

If there are no changes, do not create an empty commit.

- [ ] **Step 7: Final branch verification**

Run:

```bash
git status --short
git log --oneline main..HEAD
```

Expected: only the user's pre-existing untracked files (`AGENTS.md` and `.superpowers/`) may remain; all redesign work is committed on `codex/brand-cockpit-redesign`.

---

## Completion Handoff

After all tasks pass, invoke `superpowers:verification-before-completion`, then `superpowers:requesting-code-review`, and finally `superpowers:finishing-a-development-branch`. Follow the repository workflow: push `codex/brand-cockpit-redesign`, open a PR, wait for all six required checks, then merge only after the user authorizes publication and integration.
