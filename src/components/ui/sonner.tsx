"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import {
  CircleCheckIcon,
  InfoIcon,
  TriangleAlertIcon,
  OctagonXIcon,
  Loader2Icon,
} from "lucide-react"

import { DARK_THEME_VALUES } from "@/lib/themes"

// The Neon Auth UI provider mounts its own bare sonner <Toaster/> that can't be
// disabled via props, and sonner renders every toast in ALL mounted toasters —
// so toasts appeared twice. Our Toaster carries the `toaster` class; this rule
// hides any *other* (unmarked) sonner toaster, so toasts show once, in ours.
// Rendered as an inline <style> because Tailwind v4's Lightning CSS drops this
// rule when it's placed in globals.css (its selector appears in no scanned source).
const SUPPRESS_DUPLICATE_TOASTER =
  "ol[data-sonner-toaster]:not(.toaster){display:none !important}"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme } = useTheme()

  // sonner only understands light/dark/system; map our custom themes to one of
  // those so its base styles (incl. the toast background) actually apply. A raw
  // value like "ocean" matches no [data-theme] rule, leaving the toast with no
  // background — i.e. transparent. Dark-surface themes → dark, the rest → light.
  const sonnerTheme: ToasterProps["theme"] =
    theme && DARK_THEME_VALUES.includes(theme) ? "dark" : "light"

  return (
    <>
      <style href="suppress-duplicate-toaster" precedence="high">
        {SUPPRESS_DUPLICATE_TOASTER}
      </style>
      <Sonner
        theme={sonnerTheme}
        closeButton
        className="toaster group"
        icons={{
          success: <CircleCheckIcon className="size-4" />,
          info: <InfoIcon className="size-4" />,
          warning: <TriangleAlertIcon className="size-4" />,
          error: <OctagonXIcon className="size-4" />,
          loading: <Loader2Icon className="size-4 animate-spin" />,
        }}
        style={
          {
            "--normal-bg": "var(--popover)",
            "--normal-text": "var(--popover-foreground)",
            "--normal-border": "var(--border)",
            "--border-radius": "var(--radius)",
            // Close button to the top-right corner (toasts sit top-right) via
            // sonner's own vars — its high-specificity selector ignores plain
            // utility classes, so this is the override that actually applies.
            "--toast-close-button-start": "unset",
            "--toast-close-button-end": "0",
            "--toast-close-button-transform": "translate(35%, -35%)",
          } as React.CSSProperties
        }
        toastOptions={{
          classNames: {
            toast: "cn-toast",
          },
        }}
        {...props}
      />
    </>
  )
}

export { Toaster }
