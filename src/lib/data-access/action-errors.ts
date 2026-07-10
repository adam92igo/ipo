import {
  InvalidAnswerError,
  MissingAnswersError,
} from "@/engines/scoring";
import { NotApplicableError } from "@/engines/valuation";
import {
  ForbiddenError,
  InvalidStateError,
  NotFoundError,
  RateLimitExceededError,
  UnauthenticatedError,
} from "./errors";

/** Rounds up to whole minutes/hours — good enough for a "try again in" message. */
function formatRetryAfter(ms: number): string {
  const minutes = Math.max(1, Math.ceil(ms / 60_000));
  if (minutes < 60) return minutes === 1 ? "1 minute" : `${minutes} minutes`;
  const hours = Math.ceil(minutes / 60);
  return hours === 1 ? "1 hour" : `${hours} hours`;
}

/**
 * Single mapping from data-access/engine errors to user-facing copy, so every
 * server action reports failures consistently.
 */
export function actionErrorMessage(error: unknown): string {
  if (error instanceof UnauthenticatedError) return "Your session has expired. Please sign in again.";
  if (error instanceof ForbiddenError) return "You don't have permission for this action.";
  if (error instanceof NotFoundError) return error.message;
  if (error instanceof InvalidStateError) return error.message;
  if (error instanceof RateLimitExceededError)
    return `Your organization has reached its AI usage limit. Try again in ${formatRetryAfter(error.retryAfterMs)}.`;
  if (error instanceof MissingAnswersError)
    return `Please answer every question first (${error.missingQuestionIds.length} remaining).`;
  if (error instanceof InvalidAnswerError) return "This answer is not valid for the question.";
  if (error instanceof NotApplicableError)
    return `Valuation not possible yet — ${error.reason}.`;
  return "Something went wrong. Please try again.";
}
