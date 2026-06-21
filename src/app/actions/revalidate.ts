"use server"

import { revalidatePath } from "next/cache"

import { requireUser } from "@/lib/auth"

// Purges the server/route cache for every path so a manual refresh re-pulls fresh
// server-rendered data. "layout" at "/" cascades to all nested routes and the
// client RSC cache (see next/cache revalidatePath docs).
export async function revalidateAllPaths() {
  // Self-authorize: server-action POSTs skip the auth proxy (see src/proxy.ts),
  // so each action must guard itself. requireUser throws when unauthenticated.
  await requireUser()
  revalidatePath("/", "layout")
}
