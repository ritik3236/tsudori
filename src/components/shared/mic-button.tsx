"use client"

import { useRef } from "react"
import { Mic } from "lucide-react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { useSpeechInput } from "@/lib/use-speech-input"

type MicButtonProps = {
  /** Current field text — snapshotted when listening starts so speech appends. */
  value: string
  /** Receives the updated text (existing value + dictated transcript). */
  onChange: (value: string) => void
  className?: string
}

/**
 * Voice-to-text affordance for a text field. Snapshots the field's current value
 * when listening starts, then appends the live transcript — so dictating doesn't
 * wipe what's already typed. Feature-detected: renders nothing where the Web
 * Speech API is unavailable (Firefox, older Safari).
 */
export function MicButton({ value, onChange, className }: MicButtonProps) {
  const baseRef = useRef("")
  const voice = useSpeechInput({
    onTranscript: (text) =>
      onChange(baseRef.current ? `${baseRef.current} ${text}` : text),
    onError: (err) => {
      if (err === "not-allowed" || err === "service-not-allowed") {
        toast.error("Microphone access is blocked — enable it in your browser settings.")
      } else if (err === "no-speech") {
        toast("Didn't catch that. Try again.")
      }
    },
  })

  if (!voice.supported) return null

  const toggle = () => {
    if (voice.listening) {
      voice.stop()
    } else {
      baseRef.current = value.trim()
      voice.start()
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={voice.listening ? "Stop voice input" : "Start voice input"}
      aria-pressed={voice.listening}
      className={cn(
        "flex size-7 items-center justify-center rounded-full transition-colors",
        voice.listening
          ? "bg-red-500/15 text-red-600 dark:text-red-400"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
        className
      )}
    >
      <Mic className={cn("size-4", voice.listening && "animate-pulse")} />
    </button>
  )
}
