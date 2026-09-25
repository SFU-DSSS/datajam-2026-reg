import { createClient } from "@/lib/supabase/server"
import type { RegistrationState } from "./types"

export type RegistrationLookup =
  | { status: "signed-out" }
  | { status: "ok"; email: string; state: RegistrationState }
  | { status: "error"; email: string; error: string }

// Reads the signed-in user's registration state ("me") for server-rendered pages.
export async function getRegistration(): Promise<RegistrationLookup> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { status: "signed-out" }

  const email = user.email ?? ""
  const apiUrl = process.env.DATAJAM_API_URL
  if (!apiUrl) return { status: "error", email, error: "Registration backend is not configured." }

  // getUser() above verified the session; the backend re-validates this token itself.
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) return { status: "signed-out" }

  try {
    const response = await fetch(`${apiUrl.replace(/\/$/, "")}/api/action`, {
      method: "POST",
      headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ action: "me", data: {} }),
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    })
    const result = await response.json()
    if (!response.ok) return { status: "error", email, error: result.error || "Request failed." }
    return { status: "ok", email, state: result as RegistrationState }
  } catch {
    return { status: "error", email, error: "Backend unavailable. Please try again." }
  }
}
