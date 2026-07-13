# Gemini AI Provider Design

## Goal

Allow IPO Compass AI modules to run with Gemini as an alternative to Anthropic while preserving deterministic scoring, valuation, and roadmap engines.

## Scope

- Add provider selection for AI-only features.
- Support `AI_PROVIDER=anthropic`, `AI_PROVIDER=gemini`, and `AI_PROVIDER=auto`.
- Keep Anthropic as the existing compatible path.
- Use Gemini only when configured through environment variables.
- Validate Gemini structured profile-fill output with the existing Zod schema before returning it.
- Do not store API keys in tracked files.

## Environment

- `AI_PROVIDER`: `auto`, `anthropic`, or `gemini`; defaults to `auto`.
- `ANTHROPIC_API_KEY`: existing Anthropic key.
- `AI_MODEL`: existing Anthropic model override; defaults to `claude-sonnet-5`.
- `GEMINI_API_KEY`: Gemini API key.
- `GEMINI_MODEL`: Gemini model override; defaults to `gemini-2.0-flash`.

## Architecture

`src/lib/ai/config.ts` owns provider detection and client creation. `src/lib/ai/model.ts` exposes provider-neutral helpers for generating assistant text and structured company-profile suggestions. Existing routes and server actions call those helpers instead of directly instantiating provider SDK clients.

Provider selection in `auto` prefers Anthropic when `ANTHROPIC_API_KEY` exists, then Gemini when `GEMINI_API_KEY` exists. This avoids surprising deployments that already rely on Anthropic.

## Error Handling

If no selected provider is configured, the UI continues to show the existing offline state with a provider-neutral setup message. If Gemini returns malformed JSON for profile fill, the server rejects it with the existing "usable profile suggestion" error path.

## Testing

Unit tests cover provider selection, provider-specific setup messages, and Gemini JSON extraction/validation. Existing prompt tests remain unchanged.
