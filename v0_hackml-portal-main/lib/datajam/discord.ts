import { createClient } from "@/lib/supabase/client"

export const DISCORD_STATE_KEY = "datajam-discord-state"
export interface DiscordStatus {
  connected: boolean
  needs_reconnect: boolean
  has_team: boolean
  chat_url: string | null
}

export async function discordAction<T = DiscordStatus>(action: string, data: Record<string, string> = {}): Promise<T> {
  const { data: { session } } = await createClient().auth.getSession()
  if (!session) throw new Error("Please sign in, then connect Discord from your team dashboard.")
  const response = await fetch("/api/discord", {
    method: "POST",
    headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...data }),
  })
  const result = await response.json().catch(() => ({ error: "Discord is unavailable. Please try again." }))
  if (!response.ok) throw new Error(result.error || "Discord request failed.")
  return result as T
}
