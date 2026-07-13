function messageOf(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error && "message" in error) {
    const value = (error as { message?: unknown }).message;
    if (typeof value === "string") return value;
  }
  return "";
}

function statusOf(error: unknown): number | null {
  if (typeof error !== "object" || !error || !("status" in error)) return null;
  const value = (error as { status?: unknown }).status;
  return typeof value === "number" ? value : null;
}

function providerMessage(error: unknown): string {
  const raw = messageOf(error);
  try {
    const parsed = JSON.parse(raw) as { error?: { message?: string } };
    return parsed.error?.message ?? raw;
  } catch {
    return raw;
  }
}

export function aiProviderErrorMessage(error: unknown): string | null {
  const status = statusOf(error);
  const message = providerMessage(error);
  const lower = message.toLowerCase();

  if (
    status === 429 ||
    lower.includes("resource_exhausted") ||
    lower.includes("quota exceeded")
  ) {
    return "Gemini quota is exhausted for the selected model. Check Google AI Studio billing/quotas, wait for the quota window to reset, or set GEMINI_MODEL to a model with available quota.";
  }

  if (
    status === 401 ||
    status === 403 ||
    lower.includes("api key not valid") ||
    lower.includes("permission denied")
  ) {
    return "The configured AI API key was rejected. Regenerate the key, update .env, then restart the server.";
  }

  return null;
}
