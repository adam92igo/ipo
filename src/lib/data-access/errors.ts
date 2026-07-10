export class UnauthenticatedError extends Error {
  constructor() {
    super("Not authenticated");
    this.name = "UnauthenticatedError";
  }
}

export class NoActiveOrganizationError extends Error {
  constructor() {
    super("No active organization on session");
    this.name = "NoActiveOrganizationError";
  }
}

export class ForbiddenError extends Error {
  constructor(message = "Insufficient role for this action") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export class NotFoundError extends Error {
  constructor(resource: string) {
    super(`${resource} not found`);
    this.name = "NotFoundError";
  }
}

export class InvalidStateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidStateError";
  }
}

export class CompanyAlreadyExistsError extends Error {
  constructor() {
    super("This organization already has a company");
    this.name = "CompanyAlreadyExistsError";
  }
}

export class RateLimitExceededError extends Error {
  readonly retryAfterMs: number;

  constructor(retryAfterMs: number) {
    super("Rate limit exceeded");
    this.name = "RateLimitExceededError";
    this.retryAfterMs = retryAfterMs;
  }
}
