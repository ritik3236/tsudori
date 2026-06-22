import { auth } from "@/lib/auth/server"
import { prisma } from "@/lib/prisma"
import { recordAudit, AUDIT_ACTIONS, type AuditAction } from "@/features/audit/service"

// Catch-all proxy for all Neon Auth API calls (sign in, OAuth callbacks,
// session, email verification, password reset). The client SDK and UI talk to
// these routes, which forward to the Neon Auth server.
const handlers = auth.handler()

export const GET = handlers.GET

// Approximate "City, CC" from Vercel's edge geo headers — free and present on
// every request in production. Absent locally / off-Vercel, so it's simply
// omitted there. The city header is URL-encoded by Vercel (spaces/unicode).
function readLocation(request: Request): string | null {
  const rawCity = request.headers.get("x-vercel-ip-city")
  let city: string | null = null
  if (rawCity) {
    try {
      city = decodeURIComponent(rawCity)
    } catch {
      city = rawCity
    }
  }
  const country = request.headers.get("x-vercel-ip-country")
  const parts = [city, country].filter(Boolean)
  return parts.length ? parts.join(", ") : null
}

// Append an account/security event to the activity log. The audit log is
// per-institute, so it's scoped to the user's active institute (their first
// active membership); skipped if they have none yet. Wrapped so a logging
// failure can never break the auth flow itself.
async function logAuthEvent(
  userId: string,
  action: AuditAction,
  request: Request
) {
  try {
    const membership = await prisma.membership.findFirst({
      where: { userId, status: "ACTIVE" },
      orderBy: { createdAt: "asc" },
      select: { instituteId: true },
    })
    if (!membership) return
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null
    const location = readLocation(request)
    await recordAudit(prisma, {
      instituteId: membership.instituteId,
      actorId: userId,
      action,
      entityType: "User",
      entityId: userId,
      metadata: {
        ...(ip ? { ip } : {}),
        ...(location ? { location } : {}),
      },
    })
  } catch {
    // Activity logging is best-effort — never let it break sign-in/out.
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ path: string[] }> }
) {
  const { pathname } = new URL(request.url)

  // Public self-signup is disabled — joining is invite-only (/invite/<token>).
  // The upstream sign-up endpoint is still reachable through this proxy, so block
  // it here. Invite acceptance signs the user up via auth.signUp.email() on the
  // SERVER (src/app/api/invitations/accept), which does NOT route through this
  // proxy, so the invite flow is unaffected.
  if (pathname.includes("/sign-up")) {
    return Response.json(
      {
        error: {
          code: "SIGNUP_DISABLED",
          message: "Public sign-up is disabled. You need an invite to join.",
        },
      },
      { status: 403 }
    )
  }

  // sign-out / change-password clear or rotate the session — capture WHO is
  // acting before the upstream call, while the session cookie is still valid.
  // Best-effort: getSession() can throw on a cold upstream, and capturing the
  // actor must NEVER block the sign-out / password change itself.
  let priorUserId: string | null = null
  if (pathname.includes("/sign-out") || pathname.includes("/change-password")) {
    try {
      const { data } = await auth.getSession()
      priorUserId = data?.user?.id ?? null
    } catch {
      // couldn't read the actor — skip logging, let the auth flow proceed
    }
  }

  const response = await handlers.POST(request, context)

  // Log account/security events on success only.
  if (response.ok) {
    if (pathname.includes("/sign-in")) {
      const body = await response
        .clone()
        .json()
        .catch(() => null)
      const userId = body?.user?.id
      if (typeof userId === "string") {
        await logAuthEvent(userId, AUDIT_ACTIONS.AUTH_SIGN_IN, request)
      }
    } else if (pathname.includes("/sign-out") && priorUserId) {
      await logAuthEvent(priorUserId, AUDIT_ACTIONS.AUTH_SIGN_OUT, request)
    } else if (pathname.includes("/change-password") && priorUserId) {
      await logAuthEvent(priorUserId, AUDIT_ACTIONS.AUTH_PASSWORD_CHANGE, request)
    }
  }

  return response
}
