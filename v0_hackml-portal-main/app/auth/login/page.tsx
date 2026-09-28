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

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [captchaToken, setCaptchaToken] = useState("")
  const [captchaResetKey, setCaptchaResetKey] = useState(0)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    if (TURNSTILE_SITE_KEY && !captchaToken) {
      setError("Complete the CAPTCHA first.")
      return
    }
    setIsLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
        options: { captchaToken },
      })
      if (error) throw error
      router.push("/dashboard")
      router.refresh()
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
            <h1 className="font-display text-2xl">Welcome back_</h1>
            <p className="text-sm text-muted-foreground">Sign in to access your DataJam 2026 registration.</p>
          </div>
          <form onSubmit={handleLogin} className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <FieldHeader htmlFor="email" label="EMAIL" required={false} />
              <TerminalInput
                id="email"
                type="email"
                autoComplete="email"
                placeholder="data8@sfu.ca"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <FieldHeader htmlFor="password" label="PASSWORD" required={false} />
              <TerminalInput
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <Turnstile onToken={setCaptchaToken} onError={setError} resetKey={captchaResetKey} />
            <StatusLine status={error ? { kind: "error", text: error } : null} />
            <Button type="submit" className="h-12 font-mono text-xs" disabled={isLoading}>
              {isLoading ? "SIGNING IN…" : "SIGN IN"}
            </Button>
            <div className="flex flex-wrap justify-between gap-4 font-mono text-xs text-primary">
              <Link href="/auth/forgot-password">FORGOT PASSWORD?</Link>
              <Link href="/auth/sign-up">CREATE ACCOUNT</Link>
            </div>
          </form>
        </Card>
      </main>
    </PageShell>
  )
}
