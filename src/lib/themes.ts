// The theme registry — single source of truth for the next-themes provider and
// the header theme selector. Each theme's full token set lives in globals.css
// (light/dark on :root/.dark; the rest under `.theme-<value>`). `swatch` is the
// accent colour shown as a dot in the picker.

export type ThemeMeta = { value: string; label: string; swatch: string }

export const THEMES: ThemeMeta[] = [
  { value: "light", label: "Light", swatch: "#ffffff" },
  { value: "dark", label: "Dark", swatch: "#1c1c1c" },
  { value: "ocean", label: "Ocean Depths", swatch: "#2fa1a1" },
  { value: "arctic", label: "Arctic Frost", swatch: "#3f6aa3" },
  { value: "rose", label: "Desert Rose", swatch: "#b87d6d" },
  { value: "golden", label: "Golden Hour", swatch: "#bd7a18" },
  { value: "forest", label: "Forest Canopy", swatch: "#2f5e34" },
  { value: "minimal", label: "Modern Minimalist", swatch: "#708090" },
]

export const THEME_VALUES = THEMES.map((t) => t.value)

// next-themes applies value[theme] as the <html> class. light/dark keep their
// bare class (matches :root/.dark); the rest get a `theme-` prefix so the class
// can't collide with a utility class.
//
// These MUST be written as literal strings (not `theme-${value}`) so Tailwind v4's
// scanner sees each class name in source — otherwise Lightning CSS prunes the
// matching `.theme-*` rule from globals.css (a selector "in no scanned source").
export const THEME_CLASS_MAP: Record<string, string> = {
  light: "light",
  dark: "dark",
  ocean: "theme-ocean",
  arctic: "theme-arctic",
  rose: "theme-rose",
  golden: "theme-golden",
  forest: "theme-forest",
  minimal: "theme-minimal",
}

// Themes with a dark background. Used to map our themes to light/dark for libs
// that only understand those two (e.g. sonner). Keep in sync with the `dark`
// custom-variant in globals.css.
export const DARK_THEME_VALUES = ["dark", "ocean"]
