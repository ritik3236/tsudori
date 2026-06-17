"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { ApiError } from "@/lib/http"
import { roleKeys, rolesApi } from "@/features/roles/api"
import type { UpdateRolePermissionsInput } from "@/features/roles/schema"

export { roleKeys }

function reportError(error: unknown, fallback: string) {
  toast.error(error instanceof ApiError ? error.message : fallback)
}

export function useRolesData() {
  return useQuery({
    queryKey: roleKeys.data(),
    queryFn: () => rolesApi.get(),
  })
}

export function useUpdateRolePermissions(roleId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: UpdateRolePermissionsInput) =>
      rolesApi.updatePermissions(roleId, data),
    onSuccess: (role) => {
      qc.invalidateQueries({ queryKey: roleKeys.all })
      toast.success(`Permissions updated for ${role.name}.`)
    },
    onError: (e) => reportError(e, "Couldn't update permissions."),
  })
}
