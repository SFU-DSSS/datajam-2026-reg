"use client"

import type React from "react"

import { createClient } from "@/lib/supabase/client"
import { Navbar } from "@/components/navbar"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) throw error
      router.push("/dashboard")
      router.refresh()
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
                <span className="main-title">Welcome Back</span>
              </h1>
              <p className="hero-subtitle">Sign in to access your HackML 2026 registration</p>
              <form onSubmit={handleLogin} className="retro-form">
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
                {error && <p className="form-error">{error}</p>}
                <button type="submit" className="cta-button" disabled={isLoading}>
                  {isLoading ? "Signing in..." : "Sign In"}
                </button>
                <div className="form-link">
                  Don't have an account?{" "}
                  <Link href="/auth/sign-up" className="retro-link">
                    Sign up
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
