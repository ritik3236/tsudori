"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"

import { ApiError, http } from "@/lib/http"
import {
  acceptInviteFormSchema,
  type AcceptInviteFormValues,
} from "@/features/invitations/schema"
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

type Props = {
  token: string
  email: string
  instituteName: string
  roleName: string
}

export function AcceptInviteForm({ token, email, instituteName, roleName }: Props) {
  const [submitting, setSubmitting] = useState(false)
  const form = useForm<AcceptInviteFormValues>({
    resolver: zodResolver(acceptInviteFormSchema),
    defaultValues: { name: "", password: "", confirmPassword: "" },
  })

  async function onSubmit(v: AcceptInviteFormValues) {
    setSubmitting(true)
    try {
      await http.post("/api/invitations/accept", {
        token,
        name: v.name,
        password: v.password,
      })
      toast.success(`Welcome to ${instituteName}!`)
      // Full navigation so the new session cookie is picked up cleanly.
      window.location.assign("/dashboard")
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Couldn't accept the invite.")
      setSubmitting(false)
    }
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="space-y-1">
        <CardTitle>Join {instituteName}</CardTitle>
        <p className="text-muted-foreground text-sm">
          You&apos;ve been invited as <span className="font-medium">{roleName}</span>.
          Set a password to create your account.
        </p>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <span className="text-sm font-medium">Email</span>
              <Input value={email} disabled readOnly />
            </div>
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Your name</FormLabel>
                  <FormControl>
                    <Input autoComplete="name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <PasswordInput autoComplete="new-password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm password</FormLabel>
                  <FormControl>
                    <PasswordInput autoComplete="new-password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Creating…" : "Create account & join"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
