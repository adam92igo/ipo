import {
  InvalidAnswerError,
  MissingAnswersError,
} from "@/engines/scoring";
import { NotApplicableError } from "@/engines/valuation";
import {
  ForbiddenError,
  InvalidStateError,
  NotFoundError,
  UnauthenticatedError,
} from "./errors";

/**
 * Single mapping from data-access/engine errors to user-facing copy, so every
 * server action reports failures consistently.
 */
export function actionErrorMessage(error: unknown): string {
  if (error instanceof UnauthenticatedError) return "Your session has expired. Please sign in again.";
  if (error instanceof ForbiddenError) return "You don't have permission for this action.";
  if (error instanceof NotFoundError) return error.message;
  if (error instanceof InvalidStateError) return error.message;
  if (error instanceof MissingAnswersError)
    return `Please answer every question first (${error.missingQuestionIds.length} remaining).`;
  if (error instanceof InvalidAnswerError) return "This answer is not valid for the question.";
  if (error instanceof NotApplicableError)
    return `Valuation not possible yet — ${error.reason}.`;
  return "Something went wrong. Please try again.";
}
