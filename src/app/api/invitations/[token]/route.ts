import { ok, route } from "@/lib/api"
import { NotFoundError } from "@/lib/errors"
import { getInvitationPreview } from "@/features/invitations/service"

type RouteContext = { params: Promise<{ token: string }> }

// PUBLIC — the invitee isn't signed in yet. Returns just enough to render the
// accept page (who invited them, which institute, which role). Reveals nothing
// to anyone who doesn't already hold the token.
export const GET = route<RouteContext>(async (_req, { params }) => {
  const { token } = await params
  const preview = await getInvitationPreview(token)
  if (!preview) throw new NotFoundError("This invite is invalid or has expired.")
  return ok(preview)
})
