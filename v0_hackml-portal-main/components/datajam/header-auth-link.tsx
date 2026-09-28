"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"

// Header call-to-action: SIGN IN when signed out, DASHBOARD once signed in.
export function HeaderAuthLink() {
  const [signedIn, setSignedIn] = useState<boolean | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => setSignedIn(!!session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSignedIn(!!session))
    return () => subscription.unsubscribe()
  }, [])

  // Avoid flashing the wrong link before the session is known
  if (signedIn === null) return null

  return (
    <Button asChild className="h-9 rounded-md px-4 font-mono text-xs font-semibold">
      <Link href={signedIn ? "/dashboard" : "/auth/login"}>{signedIn ? "DASHBOARD" : "SIGN IN"}</Link>
    </Button>
  )
}
