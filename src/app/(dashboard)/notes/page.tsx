import type { Metadata } from "next"
import { dehydrate, HydrationBoundary } from "@tanstack/react-query"

import { can, getTenantContext } from "@/lib/tenant"
import { PERMISSIONS } from "@/lib/rbac"
import { makeServerQueryClient } from "@/lib/query"
import { noteKeys } from "@/features/notes/api"
import { listNotes } from "@/features/notes/service"
import { NotesBoard } from "@/features/notes/components/notes-board"

export const metadata: Metadata = { title: "Notes" }

export default async function NotesPage() {
  // Open to any institute member — no module permission gate.
  const ctx = await getTenantContext()
  const isAdmin = can(ctx, PERMISSIONS.INSTITUTE_MANAGE)

  const qc = makeServerQueryClient()
  await qc.prefetchQuery({
    queryKey: noteKeys.lists(),
    queryFn: () => listNotes(ctx.institute.id, ctx.user.id, isAdmin),
  })

  return (
    <HydrationBoundary state={dehydrate(qc)}>
      <NotesBoard />
    </HydrationBoundary>
  )
}
