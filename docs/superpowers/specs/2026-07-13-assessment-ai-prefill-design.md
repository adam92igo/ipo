# Assessment AI Prefill Design

## Goal

Let users prefill only the IPO readiness questionnaire answers that can be supported by public evidence, while leaving internal or uncertain questions for manual completion.

## Product Behavior

- The assessment page shows a `Prefill with AI` action.
- AI uses public and user-visible company context: company profile, Pappers registry data, and the official website text.
- AI returns suggestions, not saved answers.
- The UI shows suggested answers with confidence, rationale, and sources.
- Applying suggestions is explicit. The user can review first.
- Existing answers are never overwritten by AI suggestions.
- Questions without enough public evidence remain unanswered.

## Safety Rules

- The scoring, valuation, and roadmap engines remain deterministic and unchanged.
- AI must not infer internal governance, finance, reporting, or compliance practices without public evidence.
- Every suggested answer is server-validated against the versioned questionnaire before it can be shown.
- Invalid, unknown, already-answered, or low-confidence suggestions are discarded.
- The final readiness score is computed only by the existing scoring engine after user-validated answers are saved.

## Sources

V1 uses:

- saved company profile fields,
- Pappers registry search by company name when configured,
- official website text when a public website URL exists.

No LinkedIn scraping and no broad web search.

## UX

The assessment form receives an AI suggestion panel above the section tabs. The panel shows counts and a compact list of suggested questions. Applying suggestions saves them through the same answer-saving path as manual user answers, preserving tenant isolation and validation.

## Testing

Unit tests cover prompt construction, Gemini JSON parsing, invalid-answer rejection, filtering of answered questions, and confidence thresholding. Existing full validation commands must pass.
