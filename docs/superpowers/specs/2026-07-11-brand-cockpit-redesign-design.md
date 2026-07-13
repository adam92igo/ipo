# IPO Compass Brand Cockpit Redesign

## Purpose

Redesign IPO Compass as a distinctive IPO-preparation cockpit rather than a generic SaaS dashboard. The product must answer “Where are we?” immediately, then show what drives that position and what should happen next.

The redesign preserves every existing module and all underlying business logic. It changes the information hierarchy, navigation, typography, visual language, and presentation components without changing scoring, valuation, roadmap, tenancy, or AI behavior.

## Confirmed Direction

The approved design combines these decisions:

- A trajectory-led cockpit is the main product metaphor.
- The overview prioritizes current position over periodic reporting.
- The primary navigation moves from a dark left sidebar to a light horizontal command bar.
- The supplied IPO Compass logo is cropped to its symbol, given a transparent background, and shown in its original navy and gold colors.
- The central cockpit uses the logo's compass and ascent vocabulary, but the navigation remains quiet and avoids decorative compass icons, bearings, route dots, or aviation-themed labels.
- The interface remains professional and data-dense while avoiding generic rounded SaaS cards.

## Product Constraints

- UI copy remains English.
- Amounts remain EUR.
- France-only positioning and French-market references remain visible where relevant.
- The overview may summarize assessment, valuation, and roadmap data, but detailed assumptions and records remain on their existing module pages.
- No changes are allowed in deterministic engines or versioned business content as part of this redesign.
- No AI-generated values may appear in scoring, valuation, roadmap generation, or cockpit metrics.
- Existing tenant isolation and organization-scoped data-access rules remain unchanged.
- The redesign introduces no new production dependency unless a required font cannot be delivered through `next/font/google`.

## Brand System

### Logo

The source logo combines a navy compass ring, a navy-and-gold needle, and ascending navy bars. The application uses two assets derived from that source:

1. `ipo-compass-mark.png`: tightly cropped symbol with a transparent background for the header and authentication screens.
2. The existing full lockup remains available for large brand moments outside compact navigation, but is not required in the dashboard shell.

The symbol must never be placed inside a white square on a dark background. The approved header is light so the original navy and gold artwork remains legible without recoloring. The enclosed white ring at the needle pivot remains opaque white.

### Palette

| Token | Hex | Role |
| --- | --- | --- |
| Compass navy | `#062B4B` | Primary text, trajectory panels, strong actions |
| Bearing blue | `#0A416D` | Charts, category bars, interactive emphasis |
| Direction gold | `#D1A13A` | Active navigation, current bearing, progress milestones |
| Instrument ice | `#EDF3F5` | Application background |
| Panel white | `#FFFFFF` | Data surfaces and forms |
| Ink | `#0B2435` | Body text |
| Muted steel | `#657985` | Secondary copy and metadata |
| Divider | `#C9D6DC` | Panel borders and structural rules |
| Positive | `#287B68` | Completed and improving states |
| Attention | `#C65335` | Critical risks and destructive states |

Gold is directional, not decorative. It marks the active section, current milestone, important delta, or route correction. It must not be used as a general card accent.

### Typography

- **Barlow Condensed** (`600`, `700`, `800`) carries page titles, module navigation, important figures, and compact panel headings. Its semi-condensed proportions create the instrument-panel character that was missing from Inter.
- **Source Sans 3** (`400`, `500`, `600`, `700`) carries body copy, questions, form values, helper text, and long assistant responses.
- **IBM Plex Mono** (`500`, `600`) carries small labels, timestamps, config versions, dates, market references, compact statuses, and data provenance.

Typography must encode function. Mono text is never used for long prose. Barlow Condensed is never used for questionnaire body copy or assistant responses.

### Geometry

- Primary data panels use restrained `0–4px` radii or a single clipped top-right corner.
- Circular geometry is reserved for the readiness bearing, chart points, avatars, and status indicators.
- Structural rules, scales, and section dividers replace decorative shadows.
- Shadows are shallow and used only to separate the application shell from the page or an overlay from the shell.
- A subtle 28–30px grid may appear in the workspace background at very low opacity.

The signature visual element is the **Route to market** trajectory: a navy horizontal instrument strip that places the current readiness position between completed and future preparation stages.

## Application Shell

### Horizontal command bar

The desktop shell uses a light 80–84px top navigation bar:

- Left: transparent logo mark, `IPO COMPASS` wordmark, and the existing “NAVIGATE · PREPARE · GO PUBLIC” tagline at utility size.
- Center/right: `Overview`, `Diagnostic`, `Valuation`, `Roadmap`, and `Assistant`.
- Far right: company identity, country/workspace metadata, and user menu.
- Active state: navy label plus a 4px gold underline.

The obsolete `Companies` navigation item is removed because one organization owns exactly one company. The company profile remains reachable through the company identity/user area and contextual actions.

Navigation labels remain plain. They do not contain compass icons, bearings, route numbers as the only label, or decorative progress nodes. Optional `00–04` utility indices may appear on wide screens but disappear before navigation labels do.

### Responsive navigation

- At medium widths, utility indices, tagline, and company metadata hide first.
- When the five module labels no longer fit comfortably, navigation collapses behind one accessible menu trigger while the logo remains visible.
- Mobile navigation opens in a sheet with plain text labels and the same gold active indicator.
- The main content has no horizontal scroll at 320px viewport width.

## Overview Cockpit

### Header

The header identifies the company and explains the page in one sentence. A compact status on the right states when the snapshot was assembled. It must not imply live market data; wording uses “Data snapshot” rather than “Live.”

### Primary position panel

The first data surface contains three regions:

1. **Readiness index** — frozen global score, trend only when a comparable previous completed assessment exists, and a textual classification.
2. **Indicative equity range** — low/high range, midpoint, method count, and clear link to valuation assumptions.
3. **Points of attention** — count of unresolved critical/high roadmap items or, before roadmap generation, the count of assessment weaknesses. The label explains which category currently limits readiness.

Missing data never becomes a fake zero. If no assessment or valuation exists, the relevant region shows a directed empty state and its next action.

### Route to market

The trajectory converts existing deterministic data into a presentation layer. It does not create a new readiness engine.

The initial stages are:

1. Foundation
2. Financial control
3. Governance
4. Equity story
5. Market ready

Stage presentation is derived from existing category scores, completion state, and configured thresholds through a pure UI mapping function. This mapping affects labels and display only; it never changes the stored global score or engine outputs. The exact mapping and tests belong in the implementation plan.

The strip shows completed, current, and future states with gold, white/gold, and muted steel respectively. The current stage label is always available as text, so meaning never relies on color alone.

### Secondary panels

- **Readiness bearings:** category scores in compact bars plus a small profile visualization. The results page retains the full radar and threshold explanation.
- **Course corrections:** the three highest-priority unfinished roadmap items. Before roadmap generation, show the top rules-based priority actions from the completed assessment. Each item links to its detailed module.
- **Valuation confidence:** method availability, financial history coverage, reference version, and skipped method count.
- **Data freshness:** assessment date, latest financial year, valuation run date, and roadmap source assessment.

The overview is a summary, not a replacement for detailed pages. Every panel has one explicit module link.

## Module Treatment

### Diagnostic

- Keep the category-by-category workflow and autosave behavior.
- Replace pill tabs with a horizontal or wrapping section index using gold active rules and explicit completion marks.
- Keep questions in highly readable Source Sans 3 with generous vertical separation.
- Answer controls use squared instrument-style selections with clear selected, hover, focus, saving, and error states.
- Global progress remains visible without competing with the current section.

### Results

- Preserve global score, category scores, strengths, weaknesses, and priority actions.
- Use the readiness bearing as the primary score visualization and retain the radar as supporting evidence.
- Present strengths and weaknesses as structured signal lists rather than two generic cards.
- Keep assessment date and questionnaire version visible in mono metadata.

### Valuation

- Preserve financial history editing, three method results, aggregated range, assumptions, and skipped methods.
- Make the valuation range the main instrument, with low/mid/high coordinates and method bands.
- Use aligned tabular numerals for financial inputs and outputs.
- Confidence and reference metadata are always visible near the range; the disclaimer remains explicit.

### Roadmap

- Preserve deterministic ordering and status mutation.
- Present items as a route sequence without decorative compass imagery.
- Priority, category, duration, and status remain visible at a glance.
- Completed items reduce visual emphasis but retain readable contrast and are not hidden.

### IPO Assistant

- Use the same shell and typography.
- Keep conversation text spacious and neutral; the cockpit geometry is limited to the context selector, composer, and empty-state suggestions.
- Company context and the deterministic-data disclaimer remain visible.
- Streaming, rate-limit, and unavailable-AI states retain their current behavior and gain explicit recovery guidance.

### Authentication and onboarding

- Use the full logo lockup for the larger brand moment and the mark for compact headers.
- Replace the generic indigo auth illustration with navy/gold trajectory geometry derived from the approved cockpit.
- Preserve all fields, validation, links, and organization creation behavior.

## Component Boundaries

Implementation should introduce focused presentation components rather than expanding route files:

- `BrandMark` — correct logo variant, size, and accessible name.
- `AppHeader` — desktop navigation, responsive trigger, company identity, and user menu.
- `PageHeading` — eyebrow, title, description, metadata/action region.
- `InstrumentPanel` — clipped-corner data surface with consistent heading and action slots.
- `ReadinessBearing` — accessible score/classification presentation.
- `MarketTrajectory` — stage list with completed/current/future states.
- `MetricScale` — accessible low/mid/high or percentage range.
- `PrioritySignalList` — compact ordered actions with priority metadata.
- `SnapshotState` — complete, partial, empty, and stale presentation.

Shared visual primitives must remain presentation-only. They receive data through props and do not query the database.

## Data Flow

The overview server component resolves the organization context exactly as it does today. An organization-scoped data-access function assembles the latest company snapshot from:

- the single company record;
- latest and latest-completed assessments;
- frozen category/global scores;
- latest valuation run and its stored results;
- current roadmap items;
- financial-history coverage.

The route passes this serializable snapshot into presentation components. No client-supplied organization ID is accepted. No raw Drizzle query is added to a route or component.

Where a panel lacks required data, the snapshot contains an explicit availability state rather than nullable values that UI components must infer independently.

## States and Error Handling

- **No company:** retain onboarding/create-company direction and do not render an empty cockpit shell.
- **No assessment:** readiness panel explains that the diagnostic is the first coordinate and links to it.
- **Assessment in progress:** show answered/total progress; do not display a provisional global score as final.
- **No valuation:** show whether financial history is missing or a valuation run is simply pending.
- **No roadmap:** use top assessment priority actions when possible and invite roadmap generation.
- **AI unavailable:** keep the existing explicit configuration notice and disable only AI-dependent actions.
- **Mutation failure:** preserve optimistic rollback where it exists and show a specific toast or inline error with a retry action.
- **Stale/mismatched config:** frozen stored results remain authoritative; config mismatch explanations remain visible.

## Accessibility and Motion

- Text and interactive controls meet WCAG AA contrast against their actual surfaces.
- Gold is never the only indicator of selection, progress, priority, or completion.
- Every navigation and form control has a visible keyboard focus state.
- The trajectory is represented as an ordered list in the accessibility tree.
- Charts retain text equivalents or adjacent numeric values.
- Motion is limited to one orchestrated cockpit entrance and small state transitions. `prefers-reduced-motion` disables non-essential motion.
- All screens remain usable at 200% browser zoom.

## Verification Strategy

- Unit-test the pure trajectory presentation mapping and snapshot availability states.
- Component-test navigation labels, active state, responsive menu semantics, readiness text equivalents, and empty states.
- Extend Playwright coverage to verify the single-company navigation path: overview → diagnostic → results → valuation → roadmap → assistant.
- Capture desktop and mobile screenshots for visual review of authentication, overview, assessment, results, valuation, roadmap, and assistant.
- Run `pnpm typecheck`, `pnpm lint`, `pnpm test`, and `pnpm test:e2e` before completion.
- Check focus order, reduced motion, 320px layout, 200% zoom, and contrast manually during visual QA.

## Non-goals

- Redesigning or replacing the supplied logo artwork.
- Changing questionnaire content, thresholds, or versions.
- Changing valuation formulas, references, or aggregation.
- Changing roadmap rules or prioritization.
- Adding new analytics, notifications, export formats, countries, or company switching.
- Adding dark mode in this redesign.

## Acceptance Criteria

The redesign is complete when:

1. The approved light horizontal navigation replaces the dashboard sidebar on every authenticated page.
2. The transparent compact logo integrates without a white square and remains recognizable at navigation size.
3. Barlow Condensed, Source Sans 3, and IBM Plex Mono are applied consistently by role.
4. The overview answers “Where are we?” with readiness, valuation, attention points, and trajectory above the fold on a typical desktop viewport.
5. All existing information and actions remain available on their detailed pages.
6. Missing and partial data states give a clear next action and never present fake values.
7. Desktop, tablet, and mobile navigation are keyboard accessible and visually coherent.
8. Existing deterministic engine and data-access tests remain unchanged and passing, with new presentation tests added.
9. The implemented screens visually match the approved brand-led cockpit composition.
