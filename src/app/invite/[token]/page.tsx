import type { Metadata } from "next"
import Link from "next/link"
import { GraduationCap, MailX } from "lucide-react"

import { APP_NAME, APP_TAGLINE } from "@/lib/constants"
import { getInvitationPreview } from "@/features/invitations/service"
import { AcceptInviteForm } from "@/features/invitations/components/accept-invite-form"

export const metadata: Metadata = { title: "Accept invite" }

// PUBLIC route (not under the dashboard or the auth-redirect matcher) — the
// invitee isn't signed in yet. A valid token renders the accept form; an
// invalid/expired one shows a friendly dead-end.
export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const preview = await getInvitationPreview(token)

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 px-4 py-12">
      <Link href="/" className="flex items-center gap-2.5">
        <span className="bg-primary text-primary-foreground flex size-9 items-center justify-center rounded-lg">
          <GraduationCap className="size-5" />
        </span>
        <span className="flex flex-col leading-none">
          <span className="text-lg font-semibold tracking-tight">{APP_NAME}</span>
          <span className="text-muted-foreground text-xs">{APP_TAGLINE}</span>
        </span>
      </Link>

      {preview ? (
        <AcceptInviteForm
          token={token}
          email={preview.email}
          instituteName={preview.instituteName}
          roleName={preview.roleName}
        />
      ) : (
        <div className="bg-card w-full max-w-sm space-y-3 rounded-2xl border p-8 text-center">
          <span className="bg-muted text-muted-foreground mx-auto flex size-12 items-center justify-center rounded-full">
            <MailX className="size-6" />
          </span>
          <h1 className="text-lg font-semibold">Invite not valid</h1>
          <p className="text-muted-foreground text-sm">
            This invite link is invalid, has already been used, or has expired. Ask
            an admin to send you a new one.
          </p>
        </div>
      )}
    </div>
  )
}
