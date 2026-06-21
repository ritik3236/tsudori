import { NextResponse } from "next/server"
import { z } from "zod"

import { AppError, ValidationError } from "@/lib/errors"

// Thin helpers so route handlers stay declarative: parse → call service → return.
// All error translation to HTTP lives here, mirrored from the AppError hierarchy.

export function ok<T>(data: T, init?: ResponseInit): NextResponse {
  return NextResponse.json({ data }, init)
}

export function created<T>(data: T): NextResponse {
  return NextResponse.json({ data }, { status: 201 })
}

export function noContent(): NextResponse {
  return new NextResponse(null, { status: 204 })
}

/** Maps thrown errors to a consistent JSON error envelope + status code. */
export function handleRouteError(error: unknown): NextResponse {
  if (error instanceof ValidationError) {
    return NextResponse.json(
      { error: { code: error.code, message: error.message, details: error.details } },
      { status: error.status }
    )
  }
  if (error instanceof AppError) {
    return NextResponse.json(
      { error: { code: error.code, message: error.message } },
      { status: error.status }
    )
  }
  if (error instanceof z.ZodError) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "The submitted data is invalid.",
          details: z.flattenError(error).fieldErrors,
        },
      },
      { status: 422 }
    )
  }

  console.error("[api] unhandled error:", error)
  return NextResponse.json(
    { error: { code: "INTERNAL_ERROR", message: "Something went wrong." } },
    { status: 500 }
  )
}

/**
 * Wraps a route handler with the shared error boundary. Keeps every handler's
 * happy path clean while guaranteeing a consistent error envelope.
 */
export function route<Ctx = unknown>(
  handler: (req: Request, ctx: Ctx) => Promise<Response>
): (req: Request, ctx: Ctx) => Promise<Response> {
  return async (req, ctx) => {
    try {
      return await handler(req, ctx)
    } catch (error) {
      return handleRouteError(error)
    }
  }
}

/** Parses+validates a JSON body, throwing ValidationError on failure. */
export async function parseJson<T extends z.ZodType>(
  req: Request,
  schema: T
): Promise<z.infer<T>> {
  // Require an explicit JSON content-type. Our own client always sends it
  // (src/lib/http.ts), so this only rejects forged cross-site "simple request"
  // POSTs (text/plain / form-encoded bodies) that try to dodge the SameSite
  // cookie — app-level CSRF defense-in-depth that doesn't depend on the auth
  // cookie's SameSite attribute alone.
  if (!(req.headers.get("content-type") ?? "").includes("application/json")) {
    throw new ValidationError("Request body must be sent as application/json.")
  }
  let raw: unknown
  try {
    raw = await req.json()
  } catch {
    throw new ValidationError("Request body must be valid JSON.")
  }
  const result = schema.safeParse(raw)
  if (!result.success) {
    throw new ValidationError(
      "The submitted data is invalid.",
      z.flattenError(result.error).fieldErrors
    )
  }
  return result.data
}

/** Parses+validates URLSearchParams against a schema. */
export function parseQuery<T extends z.ZodType>(
  searchParams: URLSearchParams,
  schema: T
): z.infer<T> {
  const obj = Object.fromEntries(searchParams.entries())
  const result = schema.safeParse(obj)
  if (!result.success) {
    throw new ValidationError(
      "Invalid query parameters.",
      z.flattenError(result.error).fieldErrors
    )
  }
  return result.data
}
