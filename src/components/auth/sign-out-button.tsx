"use client"

import type { ComponentProps } from "react"
import { useRouter } from "next/navigation"

import { authClient } from "@/lib/auth/client"
import { Button } from "@/components/ui/button"

// Signs the user out via the Neon Auth client, then returns to the landing page.
// Mirrors Clerk's <SignOutButton> usage: pass Button props + children.
export function SignOutButton(props: ComponentProps<typeof Button>) {
  const router = useRouter()

  return (
    <Button
      {...props}
      onClick={async (event) => {
        props.onClick?.(event)
        await authClient.signOut()
        router.push("/")
        router.refresh()
      }}
    />
  )
}
