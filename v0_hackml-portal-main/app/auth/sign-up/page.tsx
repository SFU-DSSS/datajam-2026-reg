"use client"

import type React from "react"

import { createClient } from "@/lib/supabase/client"
import { PageShell } from "@/components/datajam/page-shell"
import { FieldHeader, FieldHint, TerminalInput } from "@/components/datajam/form-fields"
import { StatusLine } from "@/components/datajam/status-line"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Turnstile, TURNSTILE_SITE_KEY } from "@/components/turnstile"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"

export default function SignUpPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [captchaToken, setCaptchaToken] = useState("")
  const [captchaResetKey, setCaptchaResetKey] = useState(0)
  const router = useRouter()

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      setIsLoading(false)
      return
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters")
      setIsLoading(false)
      return
    }

    if (TURNSTILE_SITE_KEY && !captchaToken) {
      setError("Complete the CAPTCHA first.")
      setIsLoading(false)
      return
    }

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          captchaToken,
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      if (error) throw error
      // A session exists only after the login email is verified.
      router.push("/auth/verify-email")
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred")
    } finally {
      setIsLoading(false)
      setCaptchaResetKey((key) => key + 1)
    }
  }

  return (
    <PageShell>
      <main className="mx-auto max-w-xl px-4 py-20">
        <Card className="gap-6 rounded-2xl border-primary/25 p-8 shadow-[0_12px_48px_rgba(0,240,255,0.05)]">
          <div className="flex flex-col gap-2">
            <h1 className="font-display text-2xl">Create your account_</h1>
            <p className="text-sm text-muted-foreground">Sign up for DataJam 2026.</p>
          </div>
          <form onSubmit={handleSignUp} className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <FieldHeader htmlFor="email" label="EMAIL" />
              <TerminalInput
                id="email"
                type="email"
                autoComplete="email"
                placeholder="data8@sfu.ca"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <FieldHint>Use your university email.</FieldHint>
            </div>
            <div className="flex flex-col gap-2">
              <FieldHeader htmlFor="password" label="PASSWORD" />
              <TerminalInput
                id="password"
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <FieldHint>At least 8 characters.</FieldHint>
            </div>
            <div className="flex flex-col gap-2">
              <FieldHeader htmlFor="confirm-password" label="CONFIRM PASSWORD" />
              <TerminalInput
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
            <Turnstile onToken={setCaptchaToken} onError={setError} resetKey={captchaResetKey} />
            <StatusLine status={error ? { kind: "error", text: error } : null} />
            <Button type="submit" className="h-12 font-mono text-xs" disabled={isLoading}>
              {isLoading ? "CREATING ACCOUNT…" : "CREATE ACCOUNT"}
            </Button>
            <div className="flex flex-wrap gap-4 font-mono text-xs text-primary">
              <span className="text-muted-foreground">ALREADY HAVE AN ACCOUNT?</span>
              <Link href="/auth/login">SIGN IN</Link>
            </div>
          </form>
        </Card>
      </main>
    </PageShell>
  )
}
