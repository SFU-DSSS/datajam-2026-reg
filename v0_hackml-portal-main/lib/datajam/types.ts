// Response shapes from the datajam-app backend. See datajam-app/API.md.

export type RegistrationAction = "me" | "profile" | "create" | "join" | "rename" | "rotate" | "remove" | "transfer" | "leave"

export interface Profile {
  id: string
  name: string
  institution: string
  student_number: string
  student_email: string
  discord_username: string
}

export type ProfileInput = Omit<Profile, "id">

export interface TeamMember {
  id: string
  name: string
  discord_username: string
}

export interface Team {
  id: string
  name: string
  captain_id: string
  invite_code: string
  members: TeamMember[]
}

export interface RegistrationState {
  user_id: string
  profile: Profile | null
  team: Team | null
  max_team_size: number
  permissions: { manage_team: boolean }
  next_step: "complete_profile" | "choose_team" | "team_portal"
}

export const INVITE_CODE_PATTERN = /^[a-f0-9]{12}$/i
export const PENDING_INVITE_KEY = "pending-invite"
