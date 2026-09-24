"use client"

import type React from "react"

import { createClient } from "@/lib/supabase/client"
import { Navbar } from "@/components/navbar"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"

export default function SignUpPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
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

    if (password.length < 6) {
      setError("Password must be at least 6 characters")
      setIsLoading(false)
      return
    }

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || `${window.location.origin}/dashboard`,
        },
      })
      if (error) throw error
      router.push("/dashboard")
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <Navbar />
      <main>
        <section className="hero">
          <div className="container">
            <div className="hero-content">
              <h1>
                <span className="main-title">Create Account</span>
              </h1>
              <p className="hero-subtitle">Sign up for HackML 2026</p>
              <form onSubmit={handleSignUp} className="retro-form">
                <div className="form-group">
                  <label htmlFor="email" className="retro-label">Email</label>
                  <input
                    id="email"
                    type="email"
                    className="retro-input"
                    placeholder="data8@sfu.ca"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <p className="form-hint">Use your university email</p>
                </div>
                <div className="form-group">
                  <label htmlFor="password" className="retro-label">Password</label>
                  <input
                    id="password"
                    type="password"
                    className="retro-input"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="confirm-password" className="retro-label">Confirm Password</label>
                  <input
                    id="confirm-password"
                    type="password"
                    className="retro-input"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
                {error && <p className="form-error">{error}</p>}
                <button type="submit" className="cta-button" disabled={isLoading}>
                  {isLoading ? "Creating account..." : "Create Account"}
                </button>
                <div className="form-link">
                  Already have an account?{" "}
                  <Link href="/auth/login" className="retro-link">
                    Sign in
                  </Link>
                </div>
              </form>
            </div>
          </div>
        </section>
      </main>
      <footer>
        <p>Hosted by the Data Science Student Society (DSSS) at Simon Fraser University</p>
      </footer>
    </>
  )
}
