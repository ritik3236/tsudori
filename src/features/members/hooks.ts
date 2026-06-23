"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { ApiError } from "@/lib/http"
import { membersApi } from "@/features/members/api"
import type { ResetPasswordInput } from "@/features/members/schema"

export const memberKeys = {
  all: ["members"] as const,
  lists: () => [...memberKeys.all, "list"] as const,
  roles: () => [...memberKeys.all, "roles"] as const,
}

function reportError(error: unknown, fallback: string) {
  toast.error(error instanceof ApiError ? error.message : fallback)
}

// When a member action returns 404 the list is stale (someone else removed the
// membership). Refreshing here makes the ghost row disappear automatically.
function invalidateOnNotFound(error: unknown, qc: ReturnType<typeof useQueryClient>) {
  if (error instanceof ApiError && error.status === 404) {
    qc.invalidateQueries({ queryKey: memberKeys.lists() })
  }
}

export function useMembers() {
  return useQuery({
    queryKey: memberKeys.lists(),
    queryFn: () => membersApi.list(),
  })
}

export function useAssignableRoles() {
  return useQuery({
    queryKey: memberKeys.roles(),
    queryFn: () => membersApi.roles(),
    staleTime: 5 * 60_000,
  })
}

export function useUpdateMemberRole(userId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ roleId, reason }: { roleId: string; reason?: string }) =>
      membersApi.updateRole(userId, { roleId, reason }),
    onSuccess: (member) => {
      qc.invalidateQueries({ queryKey: memberKeys.lists() })
      toast.success(`Role changed to ${member.roleName}.`)
    },
    onError: (e) => {
      invalidateOnNotFound(e, qc)
      reportError(e, "Couldn't change the role.")
    },
  })
}

export function useRemoveMember() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, reason }: { userId: string; reason?: string }) =>
      membersApi.remove(userId, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: memberKeys.lists() })
      toast.success("Member removed.")
    },
    onError: (e) => {
      invalidateOnNotFound(e, qc)
      reportError(e, "Couldn't remove the member.")
    },
  })
}

export function useRestoreMember() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (userId: string) => membersApi.restore(userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: memberKeys.lists() })
      toast.success("Member restored.")
    },
    onError: (e) => {
      invalidateOnNotFound(e, qc)
      reportError(e, "Couldn't restore the member.")
    },
  })
}

export function useBanMember(userId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (reason?: string) => membersApi.ban(userId, { reason }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: memberKeys.lists() })
      toast.success("Member banned.")
    },
    onError: (e) => {
      invalidateOnNotFound(e, qc)
      reportError(e, "Couldn't ban the member.")
    },
  })
}

export function useUnbanMember(userId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => membersApi.unban(userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: memberKeys.lists() })
      toast.success("Member unbanned.")
    },
    onError: (e) => {
      invalidateOnNotFound(e, qc)
      reportError(e, "Couldn't unban the member.")
    },
  })
}

export function useResetMemberPassword(userId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: ResetPasswordInput) => membersApi.resetPassword(userId, data),
    onSuccess: () => toast.success("Password reset."),
    onError: (e) => {
      invalidateOnNotFound(e, qc)
      reportError(e, "Couldn't reset the password.")
    },
  })
}
