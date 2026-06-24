"use client"

import { createContext, useContext, useEffect, useState } from "react"

import { FONT_CLASS_MAP, FONT_VALUES } from "@/lib/fonts"

// Font is a second, independent axis from theme — next-themes only manages one,
// so this is a small custom provider: it stores the choice in localStorage and
// toggles the `.font-*` class on <html>. Device-local (not synced per user); an
// inline script in layout.tsx applies the stored class before paint (no flash).

type FontContextValue = { font: string; setFont: (f: string) => void }

const FontContext = createContext<FontContextValue>({ font: "geist", setFont: () => {} })

export const useFont = () => useContext(FontContext)

function applyFontClass(font: string) {
  const el = document.documentElement
  for (const v of FONT_VALUES) {
    const c = FONT_CLASS_MAP[v]
    if (c) el.classList.remove(c)
  }
  const cls = FONT_CLASS_MAP[font]
  if (cls) el.classList.add(cls)
}

export function FontProvider({
  children,
  initialFont = "geist",
}: {
  children: React.ReactNode
  // Server-resolved effective font; used when the device has no saved choice.
  initialFont?: string
}) {
  // Lazy init from storage on the client so the active state matches the class
  // the inline script already applied — avoids a font flash on mount. Falls back
  // to the server-resolved font (so a fresh device shows the user/institute pick).
  const [font, setFontState] = useState<string>(() => {
    if (typeof window === "undefined") return initialFont
    const stored = window.localStorage.getItem("font")
    return stored && FONT_VALUES.includes(stored) ? stored : initialFont
  })

  useEffect(() => {
    applyFontClass(font)
  }, [font])

  const setFont = (f: string) => {
    setFontState(f)
    try {
      window.localStorage.setItem("font", f)
    } catch {
      // private mode / storage disabled — the class still applies for this session
    }
  }

  return <FontContext.Provider value={{ font, setFont }}>{children}</FontContext.Provider>
}
