"use client"

import { createClient } from "@/lib/supabase/client"
import { LogOut } from "lucide-react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"

export function SignOutButton() {
  const router = useRouter()

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/")
    router.refresh()
  }

  return (
    <Button
      variant="outline"
      onClick={handleSignOut}
      className="h-10 rounded-md border-primary/25 bg-background font-mono text-xs font-semibold text-primary hover:bg-primary/10 hover:text-primary"
    >
      <LogOut />
      SIGN OUT
    </Button>
  )
}
