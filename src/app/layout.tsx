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
import { ThemeProvider } from "@/components/providers/theme-provider"
import { Toaster } from "@/components/ui/sonner"
import { APP_NAME, APP_TAGLINE } from "@/lib/constants"
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
  return (
    <html
      lang="en"
      className={`${fontVars} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="bg-background text-foreground flex min-h-full flex-col">
        {/* Apply the saved font class before paint so there's no font flash. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{var f=localStorage.getItem('font'),m={inter:'font-inter',manrope:'font-manrope',jakarta:'font-jakarta',plex:'font-plex',editorial:'font-editorial'};if(f&&m[f])document.documentElement.classList.add(m[f])}catch(e){}",
          }}
        />
        <ThemeProvider>
          <FontProvider>
            <AuthUIProvider className="flex flex-1 flex-col">
              <QueryProvider>{children}</QueryProvider>
              <Toaster richColors position="top-right" />
            </AuthUIProvider>
          </FontProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
