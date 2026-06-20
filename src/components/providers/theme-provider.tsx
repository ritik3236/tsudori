"use client"

import { ThemeProvider as NextThemesProvider } from "next-themes"

import { THEME_CLASS_MAP, THEME_VALUES } from "@/lib/themes"

// Wraps next-themes for the whole app. `attribute="class"` + the value map put
// the right class on <html>; the token sets in globals.css do the rest. System
// mode is off — the picker offers an explicit flat list (Light, Dark, + tinted).
export function ThemeProvider({
  children,
  defaultTheme = "light",
}: {
  children: React.ReactNode
  // Server-resolved effective theme (user → institute → app default). next-themes
  // uses it when the device has no saved choice, so a fresh device lands here.
  defaultTheme?: string
}) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme={defaultTheme}
      enableSystem={false}
      themes={THEME_VALUES}
      value={THEME_CLASS_MAP}
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  )
}
