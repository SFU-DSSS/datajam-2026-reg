"use client"

import { createClient } from "@/lib/supabase/client"
import { LogOut } from "lucide-react"
import { useRouter } from "next/navigation"

export function SignOutButton() {
  const router = useRouter()

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/")
    router.refresh()
  }

  return (
    <button className="retro-button" onClick={handleSignOut}>
      <LogOut className="w-4 h-4" style={{ marginRight: "0.5rem" }} />
      Sign Out
    </button>
  )
}
