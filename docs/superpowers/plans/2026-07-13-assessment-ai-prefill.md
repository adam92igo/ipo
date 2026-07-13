# Assessment AI Prefill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add AI suggestions for public-evidence-supported IPO readiness questionnaire answers.

**Architecture:** Add a server-only AI prefill service in `src/lib/ai/assessment-prefill.ts`, expose it through a server action in the assessment route, and render an explicit review/apply panel in the existing client assessment form.

**Tech Stack:** Next.js server actions, TypeScript, Zod, existing Anthropic/Gemini provider abstraction, existing assessment data-access layer.

## Global Constraints

- AI returns suggestions only; users apply them explicitly.
- Existing answers are not overwritten.
- Scoring, valuation, and roadmap engines remain deterministic.
- API keys stay in `.env`.
- UI copy remains English.

---

### Task 1: AI Suggestion Service

**Files:**
- Create: `src/lib/ai/assessment-prefill.ts`
- Modify: `src/lib/ai/model.ts`
- Modify: `src/lib/ai/ai.test.ts`

**Interfaces:**
- Produces: `prefillAssessmentAnswers(input)`, `parseAssessmentPrefillText(text)`, `buildAssessmentPrefillPrompt(input)`

- [ ] Add failing tests for prompt source constraints and suggestion filtering.
- [ ] Implement schema, prompt builder, parser, and provider-specific JSON generation.
- [ ] Validate suggestions against questionnaire answers and remove already answered questions.

### Task 2: Server Action

**Files:**
- Modify: `src/app/(dashboard)/companies/[companyId]/assessment/actions.ts`
- Modify: `src/lib/ai/rate-limit-config.ts`
- Modify: `src/db/schema/app.ts`

**Interfaces:**
- Produces: `prefillAssessmentAction({ companyId, answers })`

- [ ] Add AI usage feature enum value for assessment prefill.
- [ ] Add rate-limit config for assessment prefill.
- [ ] Implement server action with org context, company lookup, questionnaire loading, and action-error handling.

### Task 3: Assessment Form UI

**Files:**
- Modify: `src/app/(dashboard)/companies/[companyId]/assessment/assessment-form.tsx`

**Interfaces:**
- Consumes: `prefillAssessmentAction`

- [ ] Add `Prefill with AI` button.
- [ ] Show suggestions with answer label, confidence, rationale, and source labels.
- [ ] Add explicit `Apply suggested answers` action using the existing answer save path.
- [ ] Keep existing manual answering and completion behavior unchanged.
