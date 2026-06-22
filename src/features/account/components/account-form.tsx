"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"

import { authClient } from "@/lib/auth/client"
import { ProfilePhoto } from "@/features/account/components/profile-photo"
import { ChangePasswordDialog } from "@/features/account/components/change-password-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"

const nameSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(120),
})
type NameValues = z.infer<typeof nameSchema>

function messageOf(error: unknown, fallback: string): string {
  if (error && typeof error === "object" && "message" in error) {
    const m = (error as { message?: unknown }).message
    if (typeof m === "string" && m) return m
  }
  return fallback
}

export function AccountForm({
  name,
  email,
  image,
}: {
  name: string
  email: string
  image: string | null
}) {
  const router = useRouter()
  const [savingName, setSavingName] = useState(false)

  const nameForm = useForm<NameValues>({
    resolver: zodResolver(nameSchema),
    defaultValues: { name },
  })

  async function onSaveName(v: NameValues) {
    setSavingName(true)
    try {
      const { error } = await authClient.updateUser({ name: v.name })
      if (error) {
        toast.error(messageOf(error, "Couldn't update your name."))
        return
      }
      toast.success("Name updated.")
      nameForm.reset({ name: v.name })
      router.refresh() // refresh the shell (avatar/initials use the name)
    } catch (e) {
      toast.error(messageOf(e, "Couldn't update your name."))
    } finally {
      setSavingName(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4">
            <ProfilePhoto name={name} imageUrl={image} />
            <div>
              <p className="text-sm font-medium">Profile picture</p>
              <p className="text-muted-foreground text-xs">
                Tap the photo to upload or change it.
              </p>
            </div>
          </div>
          <Form {...nameForm}>
            <form onSubmit={nameForm.handleSubmit(onSaveName)} className="space-y-4">
              <div className="space-y-2">
                <span className="text-sm font-medium">Email</span>
                <Input value={email} disabled readOnly />
                <p className="text-muted-foreground text-xs">
                  Your sign-in email can&apos;t be changed here.
                </p>
              </div>
              <FormField
                control={nameForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end">
                <Button type="submit" disabled={savingName || !nameForm.formState.isDirty}>
                  {savingName ? "Saving…" : "Save name"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Password</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-muted-foreground text-sm">
            Change your account password, and optionally sign out of your other
            devices.
          </p>
          <ChangePasswordDialog />
        </CardContent>
      </Card>
    </div>
  )
}
