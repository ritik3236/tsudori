"use client"

import { useMutation } from "@tanstack/react-query"

import { invitationsApi } from "@/features/invitations/api"

export function useCreateInvitation() {
  return useMutation({ mutationFn: invitationsApi.create })
}
