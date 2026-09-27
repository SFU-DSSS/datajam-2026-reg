"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Turnstile, TURNSTILE_SITE_KEY } from "@/components/turnstile"
import { Button } from "@/components/ui/button"
import { TerminalInput } from "./form-fields"
import { StatusLine, type Status } from "./status-line"

export function PasswordForm({ reset }: { reset: boolean }) {
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<Status>(null)
  const [captchaToken, setCaptchaToken] = useState("")
  const [captchaResetKey, setCaptchaResetKey] = useState(0)
  const [ready, setReady] = useState(!reset)
  const [complete, setComplete] = useState(false)
  useEffect(() => {
    if (new URLSearchParams(window.location.search).has("expired")) setStatus({ kind: "error", text: "That link could not be verified. Request a new reset link, or sign in after confirming your email." })
    if (reset) createClient().auth.getUser().then(({ data: { user }, error }) => {
      setReady(!!user && !error)
      if (!user || error) setStatus({ kind: "error", text: "Sign in or request a new password reset link first." })
    }).catch(() => setStatus({ kind: "error", text: "Could not verify your session. Request a new reset link." }))
  }, [reset])
  return <form className="flex flex-col gap-5" onSubmit={async (e) => {
    e.preventDefault()
    const data = new FormData(e.currentTarget)
    setBusy(true); setStatus(null)
    try {
      const supabase = createClient()
      if (reset) {
        const password = String(data.get("password"))
        if (password !== data.get("confirm")) throw new Error("Passwords do not match.")
        const { error } = await supabase.auth.updateUser({ password })
        if (error) throw error
        setComplete(true)
        setStatus({ kind: "ok", text: "Password updated. You can return to your dashboard." })
      } else {
        if (TURNSTILE_SITE_KEY && !captchaToken) throw new Error("Complete the CAPTCHA first.")
        const { error } = await supabase.auth.resetPasswordForEmail(String(data.get("email")), { captchaToken, redirectTo: `${window.location.origin}/auth/callback?next=/auth/reset-password` })
        if (error) throw error
        setStatus({ kind: "ok", text: "If an account matches that email, a reset link will arrive shortly. Open it in this browser." })
      }
    } catch (error) { setStatus({ kind: "error", text: error instanceof Error ? error.message : "Request failed. Please try again." }) }
    finally { setBusy(false); setCaptchaResetKey((k) => k + 1) }
  }}>
    {reset ? <>{["password", "confirm"].map((name) => <label key={name} className="flex flex-col gap-2 text-sm">{name === "password" ? "New password" : "Confirm password"}<TerminalInput aria-label={name === "password" ? "New password" : "Confirm password"} name={name} type="password" autoComplete="new-password" minLength={8} required disabled={busy || complete} /></label>)}</> : <label className="flex flex-col gap-2 text-sm">Login email<TerminalInput aria-label="Login email" name="email" type="email" autoComplete="email" required disabled={busy} /></label>}
    {!reset && <Turnstile onToken={setCaptchaToken} onError={(text) => setStatus({ kind: "error", text })} resetKey={captchaResetKey} />}
    <StatusLine status={status} />
    <Button className="h-12 font-mono text-xs" disabled={busy || !ready || complete}>{busy ? "WORKING…" : reset ? "SAVE PASSWORD" : "SEND RESET LINK"}</Button>
    <div className="flex flex-wrap gap-4 font-mono text-xs text-primary"><Link href="/auth/login">SIGN IN</Link>{reset && <Link href="/auth/forgot-password">REQUEST NEW LINK</Link>}<Link href="/dashboard">DASHBOARD</Link></div>
  </form>
}
