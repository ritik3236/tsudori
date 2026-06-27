"use client"

import { useEffect } from "react"

// Registers the offline service worker (public/sw.js). Production-only: in dev the
// Turbopack HMR pipeline and a service worker fight over caching, so we skip it there.
// Renders nothing — it's a mount-time side effect.
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return
    if (!("serviceWorker" in navigator)) return

    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Offline fallback is a progressive enhancement — ignore registration errors.
      })
    }

    if (document.readyState === "complete") register()
    else window.addEventListener("load", register, { once: true })
  }, [])

  return null
}
