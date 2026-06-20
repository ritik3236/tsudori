"use server"

import { requireUser } from "@/lib/auth"
import { getTenantContext, requirePermission } from "@/lib/tenant"
import { PERMISSIONS } from "@/lib/rbac"
import { saveUserAppearance, saveInstituteAppearance } from "@/features/appearance/service"
import { THEME_VALUES } from "@/lib/themes"
import { FONT_VALUES } from "@/lib/fonts"

// Validate against the known theme/font sets so a stray value can't be persisted.
function clean(input: { theme?: string; font?: string }) {
  const data: { theme?: string; font?: string } = {}
  if (input.theme && THEME_VALUES.includes(input.theme)) data.theme = input.theme
  if (input.font && FONT_VALUES.includes(input.font)) data.font = input.font
  return data
}

/** Persist the signed-in user's appearance (theme and/or font). No permission
 *  gate — it's the caller's own preference. Fire-and-forget from the client. */
export async function saveMyAppearance(input: {
  theme?: string
  font?: string
}): Promise<void> {
  const user = await requireUser()
  const data = clean(input)
  if (Object.keys(data).length > 0) await saveUserAppearance(user.id, data)
}

/** Set the institute's default theme/font — what members who haven't picked
 *  their own inherit. Gated on institute:manage. */
export async function saveInstituteAppearanceAction(input: {
  theme?: string
  font?: string
}): Promise<void> {
  const ctx = await getTenantContext()
  requirePermission(ctx, PERMISSIONS.INSTITUTE_MANAGE)
  const data = clean(input)
  if (Object.keys(data).length > 0) await saveInstituteAppearance(ctx.institute.id, data)
}
