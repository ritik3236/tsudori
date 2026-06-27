"use client"

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react"

// Browser voice-to-text via the Web Speech API (free, on-device, no server round
// trip). The API isn't in TS's lib.dom, so we model only the slice we use; the
// browser supplies the implementation behind SpeechRecognition or the
// webkit-prefixed variant. Feature-detected — callers hide the affordance when
// `supported` is false (Firefox, older Safari).

type SpeechAlternative = { transcript: string }
type SpeechResult = ArrayLike<SpeechAlternative> & { isFinal: boolean }
type SpeechResultEvent = { resultIndex: number; results: ArrayLike<SpeechResult> }
type SpeechErrorEvent = { error: string }

type Recognition = {
  lang: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  start: () => void
  stop: () => void
  abort: () => void
  onstart: (() => void) | null
  onresult: ((e: SpeechResultEvent) => void) | null
  onerror: ((e: SpeechErrorEvent) => void) | null
  onend: (() => void) | null
}
type RecognitionCtor = new () => Recognition

function getRecognitionCtor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null
  const w = window as unknown as {
    SpeechRecognition?: RecognitionCtor
    webkitSpeechRecognition?: RecognitionCtor
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

// Static client capability — read via useSyncExternalStore so it's SSR-safe
// (false on the server, real value on the client) without a setState-in-effect.
const subscribe = () => () => {}
const getSupportedSnapshot = () => getRecognitionCtor() != null

export type UseSpeechInputOptions = {
  /** BCP-47 language tag for recognition. Defaults to Indian English. */
  lang?: string
  /** Called with the running transcript (interim + final) as the user speaks. */
  onTranscript: (text: string) => void
  /** Notified on a recognition error (e.g. "not-allowed", "no-speech"). */
  onError?: (error: string) => void
}

export function useSpeechInput({
  lang = "en-IN",
  onTranscript,
  onError,
}: UseSpeechInputOptions) {
  const [listening, setListening] = useState(false)
  const supported = useSyncExternalStore(subscribe, getSupportedSnapshot, () => false)
  const recognitionRef = useRef<Recognition | null>(null)

  // Latest callbacks/lang held in refs so start() stays referentially stable and
  // the event handlers read fresh values. Written in an effect, not during render.
  const onTranscriptRef = useRef(onTranscript)
  const onErrorRef = useRef(onError)
  const langRef = useRef(lang)
  useEffect(() => {
    onTranscriptRef.current = onTranscript
    onErrorRef.current = onError
    langRef.current = lang
  })

  const stop = useCallback(() => {
    recognitionRef.current?.stop()
  }, [])

  const start = useCallback(() => {
    if (recognitionRef.current) return
    const Ctor = getRecognitionCtor()
    if (!Ctor) return
    const rec = new Ctor()
    rec.lang = langRef.current
    rec.continuous = false
    rec.interimResults = true
    rec.maxAlternatives = 1
    let finalText = ""
    rec.onstart = () => setListening(true)
    rec.onresult = (e) => {
      let interim = ""
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const phrase = e.results[i][0]?.transcript ?? ""
        if (e.results[i].isFinal) finalText += phrase
        else interim += phrase
      }
      onTranscriptRef.current((finalText + interim).replace(/\s+/g, " ").trim())
    }
    rec.onerror = (e) => onErrorRef.current?.(e.error)
    rec.onend = () => {
      setListening(false)
      recognitionRef.current = null
    }
    recognitionRef.current = rec
    try {
      rec.start()
    } catch {
      // start() throws if invoked while already running — reset and let onend recover.
      recognitionRef.current = null
    }
  }, [])

  const toggle = useCallback(() => {
    if (recognitionRef.current) stop()
    else start()
  }, [start, stop])

  // Abort any in-flight recognition on unmount.
  useEffect(() => () => recognitionRef.current?.abort(), [])

  return { listening, supported, toggle, start, stop }
}
