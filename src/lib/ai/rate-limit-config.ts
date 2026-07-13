const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/**
 * Operational knobs, not versioned business content — plain env vars, same
 * precedent as AI_MODEL in ./config.ts. Defaults are deliberately generous
 * for normal use while still capping runaway cost.
 */
export const AI_RATE_LIMITS = {
  fillProfile: {
    limit: Number(process.env.RATE_LIMIT_FILL_PROFILE_PER_HOUR ?? 10),
    windowMs: HOUR_MS,
  },
  prefillAssessment: {
    limit: Number(process.env.RATE_LIMIT_PREFILL_ASSESSMENT_PER_HOUR ?? 10),
    windowMs: HOUR_MS,
  },
  assistantMessage: {
    limit: Number(process.env.RATE_LIMIT_ASSISTANT_MESSAGES_PER_DAY ?? 100),
    windowMs: DAY_MS,
  },
} as const;
