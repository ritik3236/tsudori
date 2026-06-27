import type { MetadataRoute } from "next"

import { APP_NAME, APP_TAGLINE } from "@/lib/constants"

// Web App Manifest — drives "Add to Home Screen", the Android TWA splash/launcher,
// and Chrome's installability prompt. Next serves this at /manifest.webmanifest and
// injects the <link rel="manifest"> tag automatically; no layout change needed.
//
// PNG launcher icons (192/512, plus full-bleed maskable variants) are what Android,
// the TWA splash, and PWABuilder consume; the SVG is kept as a crisp vector extra.
// Regenerate the PNGs from the SVGs in public/icons/ if the mark ever changes.
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: `${APP_NAME} — ${APP_TAGLINE}`,
    short_name: APP_NAME,
    description: "Manage students, attendance, and fees for your institute.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    // Mobile-first shell (fixed bottom nav, safe-area padding) — lock to portrait.
    orientation: "portrait",
    background_color: "#ffffff", // splash backdrop — matches the default light theme
    theme_color: "#2fa1a1", // brand teal — Android status bar + TWA toolbar
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icons/icon-maskable-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      // Note: no SVG icon entry — PWABuilder's validator rejects SVG manifest icons
      // (reports them as "doesn't exist" even when fetchable), which blocks packaging.
      // The PNGs above satisfy installability; the SVGs in public/icons/ stay as sources.
    ],
  }
}
