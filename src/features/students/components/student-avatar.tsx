"use client"

import { useState } from "react"

import { cn } from "@/lib/utils"

// Soft tints (dark text on a light tint — WCAG AA), picked deterministically per
// student so a roster has colour and each row a scannable anchor, instead of a
// flat grey wall of text.
const AVATAR_TONES = [
  "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300",
  "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300",
  "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
  "bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300",
]

function avatarTone(seed: string) {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  return AVATAR_TONES[h % AVATAR_TONES.length]
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  const first = parts[0]?.[0] ?? ""
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : ""
  return (first + last).toUpperCase() || "?"
}

/**
 * Profile photo with an initials fallback (no photo OR a broken URL). A plain
 * <img> — not the Avatar primitive — so a cached blob image always paints.
 * Shared by the per-institute roster and the cross-tenant platform student list.
 */
export function StudentAvatar({
  photoUrl,
  seed,
  name,
  className,
}: {
  photoUrl: string | null
  seed: string
  name: string
  className?: string
}) {
  const [broken, setBroken] = useState(false)
  if (photoUrl && !broken) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={photoUrl}
        alt=""
        loading="lazy"
        decoding="async"
        className={cn("size-9 shrink-0 rounded-full border object-cover", className)}
        onError={() => setBroken(true)}
      />
    )
  }
  return (
    <span
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
        avatarTone(seed),
        className
      )}
    >
      {initials(name)}
    </span>
  )
}
