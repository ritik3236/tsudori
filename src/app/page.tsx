import Link from "next/link"
import { redirect } from "next/navigation"
import { ArrowRight, CalendarCheck, GraduationCap, IndianRupee, Users } from "lucide-react"

import { auth } from "@/lib/auth/server"
import { Button } from "@/components/ui/button"
import { APP_NAME, APP_TAGLINE } from "@/lib/constants"

const HIGHLIGHTS = [
  { icon: Users, title: "Students", desc: "Profiles, classes, and admissions in one place." },
  { icon: CalendarCheck, title: "Attendance", desc: "Daily and bulk marking with monthly reports." },
  { icon: IndianRupee, title: "Fees", desc: "Collect payments, track dues, print receipts." },
]

// Reads the session (cookie-dependent), so it must render dynamically.
export const dynamic = "force-dynamic"

export default async function LandingPage() {
  // getSession can re-mint the session_data cookie when it's cold (stale/expired),
  // but a Server Component render may not write cookies — that throws on the rare
  // cold-session hit to "/". Swallow it and fall through to the public landing
  // (the user can sign in from here); the middleware refreshes the cookie on the
  // gated routes. NB: keep redirect() OUTSIDE the try — it signals via a throw.
  let session: Awaited<ReturnType<typeof auth.getSession>>["data"] = null
  try {
    session = (await auth.getSession()).data
  } catch {
    session = null
  }
  if (session?.user) redirect("/dashboard")

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col px-6">
      <header className="flex items-center justify-between py-6">
        <div className="flex items-center gap-2.5">
          <span className="bg-primary text-primary-foreground flex size-9 items-center justify-center rounded-lg">
            <GraduationCap className="size-5" />
          </span>
          <span className="text-lg font-semibold tracking-tight">{APP_NAME}</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" render={<Link href="/auth/sign-in">Sign in</Link>} />
          <Button render={<Link href="/auth/sign-up">Get started</Link>} />
        </div>
      </header>

      <section className="flex flex-1 flex-col items-center justify-center gap-8 py-16 text-center">
        <div className="space-y-4">
          <p className="text-muted-foreground text-sm font-medium tracking-wide uppercase">
            {APP_TAGLINE}
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
            Run your tuition or coaching center, end to end.
          </h1>
          <p className="text-muted-foreground mx-auto max-w-xl text-lg text-balance">
            Students, attendance, and fees in one clean dashboard — built to grow
            into a full education management platform.
          </p>
        </div>
        <Button
          size="lg"
          render={
            <Link href="/auth/sign-up">
              Start free <ArrowRight className="size-4" />
            </Link>
          }
        />

        <div className="mt-8 grid w-full gap-4 sm:grid-cols-3">
          {HIGHLIGHTS.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="bg-card flex flex-col items-start gap-2 rounded-xl border p-5 text-left"
            >
              <Icon className="text-muted-foreground size-5" />
              <h3 className="font-medium">{title}</h3>
              <p className="text-muted-foreground text-sm">{desc}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}
