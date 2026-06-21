import { auth } from "@/lib/auth/server"

// Catch-all proxy for all Neon Auth API calls (sign in, OAuth callbacks,
// session, email verification, password reset). The client SDK and UI talk to
// these routes, which forward to the Neon Auth server.
const handlers = auth.handler()

export const GET = handlers.GET

// Public self-signup is disabled — joining is invite-only (/invite/<token>). The
// upstream sign-up endpoint is still reachable through this proxy, so block it
// here. Invite acceptance signs the user up via auth.signUp.email() on the SERVER
// (src/app/api/invitations/accept), which does NOT route through this proxy, so
// the invite flow is unaffected.
export async function POST(
  request: Request,
  context: { params: Promise<{ path: string[] }> }
) {
  if (new URL(request.url).pathname.includes("/sign-up")) {
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
  return handlers.POST(request, context)
}
