import { http } from "@/lib/http"
import type { RolePermissions, RolesData } from "@/features/roles/types"
import type { UpdateRolePermissionsInput } from "@/features/roles/schema"

export const roleKeys = {
  all: ["roles"] as const,
  data: () => [...roleKeys.all, "data"] as const,
}

export const rolesApi = {
  get: () => http.get<RolesData>("/api/roles"),
  updatePermissions: (roleId: string, data: UpdateRolePermissionsInput) =>
    http.patch<RolePermissions>(`/api/roles/${roleId}/permissions`, data),
}
