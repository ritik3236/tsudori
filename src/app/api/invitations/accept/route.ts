import { noContent, parseJson, route } from "@/lib/api"
import { auth } from "@/lib/auth/server"
import { AppError, ConflictError } from "@/lib/errors"
import { acceptInviteSchema } from "@/features/invitations/schema"
import { acceptInvitation, getInvitationEmail } from "@/features/invitations/service"

// PUBLIC — the invitee accepting their invite. Creates their login via public
// sign-up (which signs THEM in — correct here, it's their own browser) for the
// email the invite was issued to, then links the membership and consumes the
// token. There is no caller session to clobber.
export const POST = route(async (req) => {
  const { token, name, password } = await parseJson(req, acceptInviteSchema)

  // Email is taken from the invite, never the client — the invitee can't redirect
  // the invite to a different address.
  const email = await getInvitationEmail(token)

  // If someone is already signed in, don't blindly sign up a new account and
  // silently swap their session. If they're already the invited person, just
  // link the membership (this also lets an existing user accept without the
  // sign-up dead-end). If they're a different account, make them sign out first.
  const { data: current } = await auth.getSession()
  if (current?.user) {
    if (current.user.email.toLowerCase() === email.toLowerCase()) {
      await acceptInvitation(token, current.user.id)
      return noContent()
    }
    throw new ConflictError(
      "You're signed in as a different account. Sign out, then open the invite link again."
    )
  }

  const { data, error } = await auth.signUp.email({ email, name, password })
  if (error) {
    if (/exist/i.test(error.message || "")) {
      throw new ConflictError(
        "An account already exists for this email — sign in instead."
      )
    }
    throw new AppError(
      error.message || "Couldn't create your account.",
      typeof error.status === "number" ? error.status : 502,
      "AUTH_ERROR"
    )
  }

  await acceptInvitation(token, data.user.id)
  return noContent()
})
