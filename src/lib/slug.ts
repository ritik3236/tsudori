/**
 * URL-safe slug from a display name: lowercase, collapse runs of non-alphanumerics
 * to a single hyphen, trim, and cap the length. Returns "" for an all-non-ASCII /
 * punctuation name — callers should fall back (e.g. "institute") and add a
 * uniqueness suffix.
 */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "") // re-trim if the slice landed mid-hyphen
}
