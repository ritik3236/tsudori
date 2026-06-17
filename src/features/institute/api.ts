import { http } from "@/lib/http"
import type { InstituteProfile } from "@/features/institute/types"
import type { InstituteUpdateInput } from "@/features/institute/schema"

export const instituteApi = {
  update: (data: InstituteUpdateInput) =>
    http.patch<InstituteProfile>("/api/institute", data),
}
