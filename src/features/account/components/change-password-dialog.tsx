"use client"

import { useState, type ComponentProps } from "react"
import { KeyRound } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ChangePasswordForm } from "@/features/account/components/change-password-form"

// Opens the shared ChangePasswordForm in a modal. Used on BOTH the profile and
// security pages (option A) so the password flow is identical everywhere — the
// trigger button is the only thing that varies per caller.
export function ChangePasswordDialog({
  label = "Change password",
  variant = "outline",
  size,
  className,
}: {
  label?: string
  variant?: ComponentProps<typeof Button>["variant"]
  size?: ComponentProps<typeof Button>["size"]
  className?: string
}) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button
        variant={variant}
        size={size}
        className={className}
        onClick={() => setOpen(true)}
      >
        <KeyRound className="size-4" /> {label}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Change password</DialogTitle>
            <DialogDescription>
              Update your password, and optionally sign out of your other devices.
            </DialogDescription>
          </DialogHeader>
          <ChangePasswordForm
            // Remount on open so the fields reset each time.
            key={String(open)}
            onCancel={() => setOpen(false)}
            onSuccess={() => setOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  )
}
