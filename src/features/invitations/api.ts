import { http } from "@/lib/http"
import type { InviteCreateInput } from "@/features/invitations/schema"

export const invitationsApi = {
  create: (data: InviteCreateInput) =>
    http.post<{ token: string }>("/api/invitations", data),
}
