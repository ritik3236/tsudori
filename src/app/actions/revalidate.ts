"use server"

import { revalidatePath } from "next/cache"

// Purges the server/route cache for every path so a manual refresh re-pulls fresh
// server-rendered data. "layout" at "/" cascades to all nested routes and the
// client RSC cache (see next/cache revalidatePath docs).
export async function revalidateAllPaths() {
  revalidatePath("/", "layout")
}
