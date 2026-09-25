"use client"

import { useEffect, useRef } from "react"

// Public Cloudflare Turnstile site key. Supabase checks the token server-side when CAPTCHA
// protection is enabled; leave this unset only for local testing with CAPTCHA disabled.
export const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? ""

interface TurnstileApi {
  render: (element: HTMLElement, options: Record<string, unknown>) => string
  reset: (widgetId: string) => void
  remove: (widgetId: string) => void
}

declare global {
  interface Window {
    turnstile?: TurnstileApi
  }
}

let scriptPromise: Promise<void> | null = null

function loadTurnstile() {
  scriptPromise ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement("script")
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => {
      scriptPromise = null
      reject(new Error("CAPTCHA could not load. Refresh to try again."))
    }
    document.head.append(script)
  })
  return scriptPromise
}

interface TurnstileProps {
  onToken: (token: string) => void
  onError: (message: string) => void
  // Change this after every auth attempt; each token can be used only once.
  resetKey: number
}

export function Turnstile({ onToken, onError, resetKey }: TurnstileProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetRef = useRef<string | null>(null)
  const callbacks = useRef({ onToken, onError })
  callbacks.current = { onToken, onError }

  useEffect(() => {
    if (!TURNSTILE_SITE_KEY) return
    let cancelled = false
    loadTurnstile()
      .then(() => {
        if (cancelled || !containerRef.current || !window.turnstile) return
        widgetRef.current = window.turnstile.render(containerRef.current, {
          sitekey: TURNSTILE_SITE_KEY,
          theme: "dark",
          callback: (token: string) => callbacks.current.onToken(token),
          "expired-callback": () => callbacks.current.onToken(""),
          "error-callback": () => {
            callbacks.current.onToken("")
            callbacks.current.onError("CAPTCHA failed. Please retry.")
          },
        })
      })
      .catch((error: Error) => callbacks.current.onError(error.message))
    return () => {
      cancelled = true
      if (widgetRef.current && window.turnstile) window.turnstile.remove(widgetRef.current)
      widgetRef.current = null
    }
  }, [])

  useEffect(() => {
    if (resetKey === 0 || !widgetRef.current || !window.turnstile) return
    window.turnstile.reset(widgetRef.current)
    callbacks.current.onToken("")
  }, [resetKey])

  if (!TURNSTILE_SITE_KEY) return null
  return <div ref={containerRef} className="form-group" />
}
