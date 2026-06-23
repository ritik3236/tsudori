import { http } from "@/lib/http"
import type { InstituteOption, InstituteProfile } from "@/features/institute/types"
import type { InstituteUpdateInput } from "@/features/institute/schema"

export const instituteApi = {
  update: (data: InstituteUpdateInput) =>
    http.patch<InstituteProfile>("/api/institute", data),
  /** All institutes — super-admin only (the API 403s otherwise). */
  listAll: () => http.get<InstituteOption[]>("/api/institutes"),
}
