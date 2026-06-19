"use client"

import { useState, type ComponentProps } from "react"
import { useRouter } from "next/navigation"
import { Plus } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useCreateTicket } from "@/features/tickets/hooks"
import { TicketForm } from "@/features/tickets/components/ticket-form"

// Floating action button: bottom-right, clearing the mobile bottom-nav. Mirrors
// the fee "Record payment" FAB so the create affordance is consistent.
const FAB_CLASS =
  "fixed right-4 bottom-[calc(env(safe-area-inset-bottom)+4.75rem)] z-40 rounded-full shadow-lg lg:right-6 lg:bottom-6"

type NewTicketButtonProps = {
  label?: string
  variant?: ComponentProps<typeof Button>["variant"]
  size?: ComponentProps<typeof Button>["size"]
  floating?: boolean
  className?: string
}

export function NewTicketButton({
  label = "New ticket",
  variant = "default",
  size = "default",
  floating = false,
  className,
}: NewTicketButtonProps) {
  const [open, setOpen] = useState(false)
  const create = useCreateTicket()
  const router = useRouter()

  return (
    <>
      <Button
        variant={variant}
        // Floating FABs match the canonical "Add class" FAB: size="sm".
        size={floating ? "sm" : size}
        className={cn(floating && FAB_CLASS, className)}
        onClick={() => setOpen(true)}
      >
        <Plus className="size-4" /> {label}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New ticket</DialogTitle>
            <DialogDescription>
              Raise a bug, feature request, or question for the Tsudori team.
            </DialogDescription>
          </DialogHeader>
          <TicketForm
            // Remount on open so the form re-reads fresh defaults each time.
            key={String(open)}
            submitting={create.isPending}
            onCancel={() => setOpen(false)}
            onSubmit={(values) =>
              create.mutate(values, {
                onSuccess: (ticket) => {
                  setOpen(false)
                  router.push(`/tickets/${ticket.id}`)
                },
              })
            }
          />
        </DialogContent>
      </Dialog>
    </>
  )
}
