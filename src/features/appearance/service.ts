import "server-only"

import { prisma } from "@/lib/prisma"

// Appearance (theme + font) persistence. Per-user prefs live in UserPreference;
// the institute default lives in the generic Setting table under key "appearance".
// Either field may be null → the resolver falls back (user → institute → app).

export type Appearance = { theme: string | null; font: string | null }

const INSTITUTE_APPEARANCE_KEY = "appearance"

export async function getUserAppearance(userId: string): Promise<Appearance | null> {
  return prisma.userPreference.findUnique({
    where: { userId },
    select: { theme: true, font: true },
  })
}

export async function saveUserAppearance(
  userId: string,
  data: { theme?: string; font?: string }
): Promise<void> {
  await prisma.userPreference.upsert({
    where: { userId },
    create: { userId, theme: data.theme ?? null, font: data.font ?? null },
    update: data, // only the provided keys change; the other stays
  })
}

export async function getInstituteAppearance(
  instituteId: string
): Promise<Appearance | null> {
  const row = await prisma.setting.findUnique({
    where: { instituteId_key: { instituteId, key: INSTITUTE_APPEARANCE_KEY } },
    select: { value: true },
  })
  if (!row) return null
  const v = row.value as { theme?: string | null; font?: string | null } | null
  return { theme: v?.theme ?? null, font: v?.font ?? null }
}

export async function saveInstituteAppearance(
  instituteId: string,
  data: { theme?: string; font?: string }
): Promise<void> {
  const current = (await getInstituteAppearance(instituteId)) ?? { theme: null, font: null }
  const next = {
    theme: data.theme ?? current.theme ?? null,
    font: data.font ?? current.font ?? null,
  }
  await prisma.setting.upsert({
    where: { instituteId_key: { instituteId, key: INSTITUTE_APPEARANCE_KEY } },
    create: { instituteId, key: INSTITUTE_APPEARANCE_KEY, value: next },
    update: { value: next },
  })
}
