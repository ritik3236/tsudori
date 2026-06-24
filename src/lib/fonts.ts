// Font registry — single source for the FontProvider, the nav font picker, and
// the Settings → Appearance page. Each `.font-*` class (globals.css) remaps
// --font-sans/--font-heading to the next/font variables loaded in layout.tsx.
// `stack` is used to render each option's label in its own typeface.

export type FontMeta = { value: string; label: string; stack: string; note?: string }

export const FONTS: FontMeta[] = [
  { value: "geist", label: "Geist", stack: "var(--font-geist), sans-serif" },
  { value: "inter", label: "Inter", stack: "var(--font-inter), sans-serif" },
  { value: "manrope", label: "Manrope", stack: "var(--font-manrope), sans-serif" },
  { value: "jakarta", label: "Plus Jakarta Sans", stack: "var(--font-jakarta), sans-serif" },
  { value: "plex", label: "IBM Plex Sans", stack: "var(--font-plex), sans-serif" },
  {
    value: "editorial",
    label: "Editorial",
    stack: "var(--font-fraunces), serif",
    note: "Fraunces headings · Inter body",
  },
]

export const FONT_VALUES = FONTS.map((f) => f.value)

// App default — the SSR fallback only. The actual font is device-local
// (localStorage), not synced per user or institute.
export const DEFAULT_FONT = "geist"

// geist is the default (:root), so it carries no class. The rest map to a
// `.font-*` class. MUST be literal strings so Tailwind's scanner keeps the rules
// — see [tailwind-v4-prunes-dynamic-classes]; classes are safelisted in globals.css.
export const FONT_CLASS_MAP: Record<string, string> = {
  geist: "",
  inter: "font-inter",
  manrope: "font-manrope",
  jakarta: "font-jakarta",
  plex: "font-plex",
  editorial: "font-editorial",
}
