export const APP_NAME = "Tsudori"
export const APP_TAGLINE = "Education Management Platform"

// Canonical production origin. Used as the metadata base so OG/social-share and
// canonical URLs resolve to tsudori.com instead of the per-deploy *.vercel.app host.
export const APP_URL = "https://tsudori.com"

export const DEFAULT_PAGE_SIZE = 20
export const MAX_PAGE_SIZE = 100

// Short month names for display (index 0 = Jan).
export const MONTHS_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const

// Sentinel for an "All" option in filter selects (means "no filter applied").
export const FILTER_ALL = "all"

// Sentinel for the "All classes" aggregate view in attendance (distinct from
// FILTER_ALL — it selects a real combined-class dataset, not "no filter").
export const ALL_CLASSES = "__all__"

// Rotating avatar tints, indexed by list position, for initials avatars.
export const AVATAR_TINTS = [
  "bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-200",
  "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200",
  "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-200",
  "bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-200",
  "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-200",
] as const
