# Gemini AI Provider Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Gemini as an optional provider for IPO Compass AI-only modules.

**Architecture:** Keep provider selection and client creation in `src/lib/ai/config.ts`; add provider-neutral model helpers in `src/lib/ai/model.ts`; update profile fill and assistant route to call those helpers.

**Tech Stack:** Next.js 15, TypeScript, Zod, Anthropic SDK, Google Gen AI SDK.

## Global Constraints

- AI must remain limited to module 5 only.
- Scoring, valuation, and roadmap engines must remain pure and deterministic.
- API keys must stay in `.env` and never be committed.
- UI copy remains English.

---

### Task 1: Provider Config

**Files:**
- Modify: `src/lib/ai/config.ts`
- Modify: `src/lib/ai/ai.test.ts`
- Modify: `.env.example`

**Interfaces:**
- Produces: `getAiProvider()`, `getAiSetupMessage()`, `isAiConfigured()`

- [ ] Write failing unit tests for `AI_PROVIDER=auto`, explicit Gemini, and provider-neutral setup copy.
- [ ] Run `pnpm vitest run src/lib/ai/ai.test.ts` and confirm the new tests fail.
- [ ] Implement provider parsing and setup message helpers.
- [ ] Add `GEMINI_API_KEY`, `GEMINI_MODEL`, and `AI_PROVIDER` documentation to `.env.example`.
- [ ] Re-run the AI tests and confirm they pass.

### Task 2: Provider-Neutral Model Helpers

**Files:**
- Create: `src/lib/ai/model.ts`
- Modify: `src/lib/ai/profile-fill.ts`
- Modify: `src/app/api/assistant/route.ts`

**Interfaces:**
- Produces: `generateCompanyProfileSuggestion(input)`, `streamAssistantText(input)`

- [ ] Write failing tests for Gemini JSON extraction and schema validation.
- [ ] Run `pnpm vitest run src/lib/ai/ai.test.ts` and confirm failure.
- [ ] Implement Anthropic and Gemini branches in `src/lib/ai/model.ts`.
- [ ] Replace direct Anthropic calls in profile fill and assistant route.
- [ ] Re-run AI tests and confirm they pass.

### Task 3: Local Secret Configuration and Verification

**Files:**
- Modify untracked local `.env` only.
- Modify: `package.json`
- Modify: `pnpm-lock.yaml`

**Interfaces:**
- Consumes: `GEMINI_API_KEY` and `AI_PROVIDER=gemini`

- [ ] Install `@google/genai`.
- [ ] Add Gemini variables to local `.env` without staging `.env`.
- [ ] Run `pnpm typecheck`.
- [ ] Run `pnpm lint`.
- [ ] Run `pnpm test`.
- [ ] Run `pnpm build`.
