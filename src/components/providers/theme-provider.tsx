"use client"

import { ThemeProvider as NextThemesProvider } from "next-themes"

import { THEME_CLASS_MAP, THEME_VALUES } from "@/lib/themes"

// Wraps next-themes for the whole app. `attribute="class"` + the value map put
// the right class on <html>; the token sets in globals.css do the rest. System
// mode is off — the picker offers an explicit flat list (Light, Dark, + tinted).
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
      themes={THEME_VALUES}
      value={THEME_CLASS_MAP}
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  )
}
