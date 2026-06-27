import type { Metadata, Viewport } from "next"
import {
  Geist,
  Geist_Mono,
  Inter,
  Manrope,
  Plus_Jakarta_Sans,
  IBM_Plex_Sans,
  Fraunces,
} from "next/font/google"

import { AuthUIProvider } from "@/components/providers/auth-provider"
import { FontProvider } from "@/components/providers/font-provider"
import { QueryProvider } from "@/components/providers/query-provider"
import { ServiceWorkerRegister } from "@/components/providers/service-worker-register"
import { ThemeProvider } from "@/components/providers/theme-provider"
import { Toaster } from "@/components/ui/sonner"
import { cn } from "@/lib/utils"
import { APP_NAME, APP_TAGLINE } from "@/lib/constants"
import { DEFAULT_FONT, FONT_CLASS_MAP } from "@/lib/fonts"
import { DEFAULT_THEME } from "@/lib/themes"
import "./globals.css"

// Geist is the default; the rest are optional picker fonts — not preloaded, so
// the browser only fetches one once the user selects it. Each exposes its own
// CSS variable; the `.font-*` classes in globals.css remap --font-sans to it.
const geistSans = Geist({ variable: "--font-geist", subsets: ["latin"] })
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] })
const inter = Inter({ variable: "--font-inter", subsets: ["latin"], preload: false })
const manrope = Manrope({ variable: "--font-manrope", subsets: ["latin"], preload: false })
const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  preload: false,
})
const plex = IBM_Plex_Sans({
  variable: "--font-plex",
  weight: ["400", "500", "600"],
  subsets: ["latin"],
  preload: false,
})
const fraunces = Fraunces({ variable: "--font-fraunces", subsets: ["latin"], preload: false })

const fontVars = [
  geistSans.variable,
  geistMono.variable,
  inter.variable,
  manrope.variable,
  jakarta.variable,
  plex.variable,
  fraunces.variable,
].join(" ")

export const metadata: Metadata = {
  title: {
    default: `${APP_NAME} — ${APP_TAGLINE}`,
    template: `%s · ${APP_NAME}`,
  },
  description: "Manage students, attendance, and fees for your institute.",
}

// Mobile-first: let content extend into the notch/home-indicator area so the
// fixed bottom nav can pad itself with env(safe-area-inset-*). `viewport-fit:cover`
// is what makes those env() insets resolve to non-zero values.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  // Theme and font are device-local (next-themes + FontProvider, both
  // localStorage-backed), not synced per user — every login on a device shares the
  // same look. The server renders the app defaults; the inline script below and the
  // providers swap in any saved choice before paint.
  const theme = DEFAULT_THEME
  const font = DEFAULT_FONT

  return (
    <html
      lang="en"
      className={cn(fontVars, FONT_CLASS_MAP[font], "h-full antialiased")}
      suppressHydrationWarning
    >
      <body className="bg-background text-foreground flex min-h-full flex-col">
        {/* A returning device's saved font overrides the server-rendered class;
            a fresh device keeps the server one — no flash either way. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{var f=localStorage.getItem('font'),m={geist:'',inter:'font-inter',manrope:'font-manrope',jakarta:'font-jakarta',plex:'font-plex',editorial:'font-editorial'};if(f&&(f in m)){var c=document.documentElement.classList;Object.keys(m).forEach(function(k){if(m[k])c.remove(m[k])});if(m[f])c.add(m[f])}}catch(e){}",
          }}
        />
        <ThemeProvider defaultTheme={theme}>
          <FontProvider initialFont={font}>
            <AuthUIProvider className="flex flex-1 flex-col">
              <QueryProvider>{children}</QueryProvider>
              <Toaster richColors position="top-right" />
              <ServiceWorkerRegister />
            </AuthUIProvider>
          </FontProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
