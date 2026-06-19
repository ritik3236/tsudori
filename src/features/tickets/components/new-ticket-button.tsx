"use client"

import { useState, type ComponentProps } from "react"
import { useRouter } from "next/navigation"
import { Plus } from "lucide-react"

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

type NewTicketButtonProps = {
  label?: string
  variant?: ComponentProps<typeof Button>["variant"]
  size?: ComponentProps<typeof Button>["size"]
  className?: string
}

export function NewTicketButton({
  label = "New ticket",
  variant = "default",
  size = "default",
  className,
}: NewTicketButtonProps) {
  const [open, setOpen] = useState(false)
  const create = useCreateTicket()
  const router = useRouter()

  return (
    <>
      <Button
        variant={variant}
        size={size}
        className={className}
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
