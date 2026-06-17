"use client"

import { useEffect, useRef, useState } from "react"

import { authClient } from "@/lib/auth/client"
import { InfinityLoader } from "@/components/shared/infinity-loader"

// Shown ONLY when the session transitions unauthenticated → authenticated while
// on an auth page — i.e. a real sign-in just happened and the provider is about
// to redirect to /dashboard. We cover the screen with the loader so that
// login → dashboard transition isn't a frozen form; it stays until the dashboard
// route mounts and this (auth) layout unmounts.
//
// We require the *transition* (not just "currently authed") so that an already
// signed-in user landing on an auth view — or any other /auth/* page — isn't
// covered by a loader that would never clear (there'd be no redirect to end it).
export function LoginRedirectOverlay() {
  const { data, isPending } = authClient.useSession()
  const authed = Boolean(data?.user)

  const sawUnauthed = useRef(false)
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (!isPending && !authed) sawUnauthed.current = true
    if (authed && sawUnauthed.current) setShow(true)
  }, [authed, isPending])

  if (!show) return null

  return (
    <div className="bg-background fixed inset-0 z-50 flex items-center justify-center">
      <InfinityLoader />
    </div>
  )
}
