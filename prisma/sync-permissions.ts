// Deploy-time RBAC catalog sync. Upserts every permission declared in
// src/lib/rbac.ts into the Permission table, so the role editor and any non-"*"
// roles can always reference newly-added capabilities — no manual re-seed.
//
// Runs as the first step of `pnpm build` (see package.json), i.e. on every Vercel
// deploy. It is:
//   • ADDITIVE + idempotent — upsert by key; never deletes a permission.
//   • grant-free — it does NOT touch RolePermission. Full-access roles
//     (INSTITUTE_ADMIN/SUPER_ADMIN) resolve to ALL_PERMISSIONS at runtime
//     (see isFullAccessRole in rbac.ts); custom roles are admin-managed.
//   • TOLERANT — a missing DIRECT_URL/DATABASE_URL or an unreachable DB logs a
//     warning and exits 0, so a transient DB hiccup can never fail a deploy.
//
// Mirrors seed.ts's humanize() so descriptions/modules match a full re-seed exactly.
import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { config as loadEnv } from "dotenv"

import { ALL_PERMISSIONS, permissionModule, type Permission } from "../src/lib/rbac"

// Loads .env for local runs; a no-op on Vercel (no .env file — it injects real env
// vars, which take precedence since dotenv doesn't override existing process.env).
loadEnv()

function humanize(permission: Permission): string {
  const [moduleName, action] = permission.split(":")
  const verb = action.charAt(0).toUpperCase() + action.slice(1)
  return `${verb} ${moduleName}`
}

async function main() {
  const url = process.env.DIRECT_URL || process.env.DATABASE_URL
  if (!url) {
    console.warn("[sync-permissions] No DIRECT_URL/DATABASE_URL set — skipping (build continues).")
    return
  }
  const prisma = new PrismaClient({ adapter: new PrismaPg(url) })
  try {
    for (const key of ALL_PERMISSIONS) {
      await prisma.permission.upsert({
        where: { key },
        create: { key, module: permissionModule(key), description: humanize(key) },
        update: { module: permissionModule(key), description: humanize(key) },
      })
    }
    console.log(`[sync-permissions] ✓ ${ALL_PERMISSIONS.length} permissions in sync`)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((e) => {
  // Never block a deploy on this — Layer 1 (runtime full-access resolution) already
  // covers admins; a missed catalog sync self-heals on the next successful deploy.
  console.warn("[sync-permissions] WARNING: sync failed, build continues:", e?.message ?? e)
})
