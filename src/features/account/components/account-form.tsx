"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"

import { authClient } from "@/lib/auth/client"
import { ProfilePhoto } from "@/features/account/components/profile-photo"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PasswordInput } from "@/components/ui/password-input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"

const MIN_PASSWORD_LENGTH = 8

const nameSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(120),
})
type NameValues = z.infer<typeof nameSchema>

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password."),
    newPassword: z
      .string()
      .min(MIN_PASSWORD_LENGTH, `Use at least ${MIN_PASSWORD_LENGTH} characters.`)
      .max(128, "That password is too long."),
    confirmPassword: z.string(),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    message: "Passwords don't match.",
    path: ["confirmPassword"],
  })
type PasswordValues = z.infer<typeof passwordSchema>

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
  const [savingPw, setSavingPw] = useState(false)

  const nameForm = useForm<NameValues>({
    resolver: zodResolver(nameSchema),
    defaultValues: { name },
  })
  const pwForm = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
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

  async function onChangePassword(v: PasswordValues) {
    setSavingPw(true)
    try {
      const { error } = await authClient.changePassword({
        currentPassword: v.currentPassword,
        newPassword: v.newPassword,
        revokeOtherSessions: false,
      })
      if (error) {
        toast.error(messageOf(error, "Couldn't change your password."))
        return
      }
      toast.success("Password changed.")
      pwForm.reset()
    } catch (e) {
      toast.error(messageOf(e, "Couldn't change your password."))
    } finally {
      setSavingPw(false)
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
        <CardContent>
          <Form {...pwForm}>
            <form
              onSubmit={pwForm.handleSubmit(onChangePassword)}
              className="space-y-4"
            >
              <FormField
                control={pwForm.control}
                name="currentPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current password</FormLabel>
                    <FormControl>
                      <PasswordInput autoComplete="current-password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={pwForm.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New password</FormLabel>
                    <FormControl>
                      <PasswordInput autoComplete="new-password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={pwForm.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm new password</FormLabel>
                    <FormControl>
                      <PasswordInput autoComplete="new-password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end">
                <Button type="submit" disabled={savingPw}>
                  {savingPw ? "Saving…" : "Change password"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
