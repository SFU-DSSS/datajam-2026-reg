import { createClient } from "@/lib/supabase/client"
import type { RegistrationAction, RegistrationState } from "./types"

// Calls the datajam-app backend through the same-origin /api/action rewrite (see next.config.mjs).
export async function registrationAction(
  action: RegistrationAction,
  data: Record<string, string | boolean | null> = {},
): Promise<RegistrationState> {
  const supabase = createClient()
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession()
  if (error) throw error
  if (!session) throw new Error("Please sign in.")

  const response = await fetch("/api/action", {
    method: "POST",
    headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ action, data }),
  })
  const result = await response.json().catch(() => ({ error: "Backend unavailable. Please try again." }))
  if (!response.ok) throw new Error(result.error || "Request failed.")
  return result as RegistrationState
}
