// Domain error hierarchy. The API handler (src/lib/api.ts) maps each class to an
// HTTP status, so service/route code can `throw new NotFoundError(...)` and stay
// transport-agnostic.

export class AppError extends Error {
  readonly status: number
  readonly code: string

  constructor(message: string, status: number, code: string) {
    super(message)
    this.name = this.constructor.name
    this.status = status
    this.code = code
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "You must be signed in to do that.") {
    super(message, 401, "UNAUTHORIZED")
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "You don't have permission to do that.") {
    super(message, 403, "FORBIDDEN")
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Not found.") {
    super(message, 404, "NOT_FOUND")
  }
}

export class ConflictError extends AppError {
  constructor(message = "That conflicts with an existing record.") {
    super(message, 409, "CONFLICT")
  }
}

export class ValidationError extends AppError {
  readonly details?: unknown

  constructor(message = "The submitted data is invalid.", details?: unknown) {
    super(message, 422, "VALIDATION_ERROR")
    this.details = details
  }
}
