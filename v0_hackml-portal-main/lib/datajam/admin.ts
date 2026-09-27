import { createClient } from "@/lib/supabase/client"
import type { Profile } from "./types"

export const admissionStatuses = ["pending", "accepted", "waitlisted", "rejected"] as const
export type AdmissionStatus = typeof admissionStatuses[number]
export interface Application extends Profile {
  login_email: string
  team_id: string | null
  team_name: string | null
  status: AdmissionStatus
  decision_at: string | null
}
export interface OrganizerTeam {
  id: string
  name: string
  captain_id: string
  invite_code: string
}
export interface OrganizerEmail {
  id: string
  user_id: string
  recipient: string
  subject: string
  body: string
  kind: "acceptance" | "manual"
  state: "queued" | "sending" | "submitted" | "unknown" | "cancelled"
  created_at: string
  message_id: string | null
  detail: string | null
}
export interface OrganizerState {
  registrations: Application[]
  teams: OrganizerTeam[]
  emails: OrganizerEmail[]
  queued_emails: string[]
  max_team_size: number
  events: { id: string; actor: string; action: string; data: Record<string, unknown>; created_at: string }[]
}
export type OrganizerAction = "list" | "decision" | "accept_all" | "compose" | "send" | "team_create" | "team_rename" | "team_rotate" | "team_assign" | "team_remove" | "team_transfer" | "team_delete"
export interface OrganizerResult { email_notice?: string; email_ids?: string[]; accepted_count?: number }

export async function organizerAction<T = OrganizerResult>(action: OrganizerAction, data: Record<string, unknown> = {}): Promise<T> {
  const { data: { session }, error } = await createClient().auth.getSession()
  if (error) throw error
  if (!session) throw new Error("Please sign in.")
  const response = await fetch("/api/admin", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify({ action, data }),
  })
  const result = await response.json().catch(() => ({ error: "Backend unavailable. Refresh before retrying." }))
  if (!response.ok) throw new Error(result.error || "Organizer request failed.")
  return result as T
}
