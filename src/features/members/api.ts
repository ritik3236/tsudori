import { http } from "@/lib/http"
import type { MemberListItem, RoleOption } from "@/features/members/types"
import type {
  BanMemberInput,
  MemberUpdateInput,
  ResetPasswordInput,
} from "@/features/members/schema"

export const membersApi = {
  list: () => http.get<MemberListItem[]>("/api/members"),
  roles: () => http.get<RoleOption[]>("/api/members/roles"),
  updateRole: (userId: string, data: MemberUpdateInput) =>
    http.patch<MemberListItem>(`/api/members/${userId}`, data),
  remove: (userId: string, reason?: string) =>
    http.delete<void>(
      `/api/members/${userId}${reason ? `?reason=${encodeURIComponent(reason)}` : ""}`
    ),
  restore: (userId: string) => http.post<MemberListItem>(`/api/members/${userId}`),
  ban: (userId: string, data: BanMemberInput) =>
    http.post<MemberListItem>(`/api/members/${userId}/ban`, data),
  unban: (userId: string) =>
    http.delete<MemberListItem>(`/api/members/${userId}/ban`),
  resetPassword: (userId: string, data: ResetPasswordInput) =>
    http.post<void>(`/api/members/${userId}/password`, data),
}
