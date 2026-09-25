"use client"

import { useEffect, useState } from "react"
import { INVITE_CODE_PATTERN, PENDING_INVITE_KEY } from "@/lib/datajam/types"

// Saves a ?invite= code so it survives signup and email verification, then prefills the join form.
// Opening an invitation never joins a team by itself.
export function InviteNotice() {
  const [code, setCode] = useState<string | null>(null)

  useEffect(() => {
    const invite = new URLSearchParams(window.location.search).get("invite")?.trim() ?? ""
    if (!INVITE_CODE_PATTERN.test(invite)) return
    try {
      localStorage.setItem(PENDING_INVITE_KEY, invite.toLowerCase())
    } catch {
      // Storage unavailable; the user can still paste the code on the dashboard.
    }
    setCode(invite.toLowerCase())
  }, [])

  if (!code) return null
  return (
    <p role="status" className="font-mono text-sm text-teal-500">
      {`>>> Invitation ${code} saved. Finish registering, then join from your dashboard.`}
    </p>
  )
}
