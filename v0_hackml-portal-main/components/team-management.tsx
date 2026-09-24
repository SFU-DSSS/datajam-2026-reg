"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Users, Copy, Check, LogOut } from "lucide-react"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"

interface TeamManagementProps {
  userId: string
  teamMembership: any
}

type RosterRow = {
  joined_at: string | null
  participant: {
    id: string
    first_name: string | null
    last_name: string | null
    discord_username: string | null
  } | null
}

export function TeamManagement({ userId, teamMembership }: TeamManagementProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState("join")
  const [copied, setCopied] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const [createTeamData, setCreateTeamData] = useState({
    teamName: "",
    university: "",
  })

  const [joinTeamCode, setJoinTeamCode] = useState("")

  // NEW: roster state
  const [roster, setRoster] = useState<RosterRow[]>([])
  const [rosterLoading, setRosterLoading] = useState(false)

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast({
      title: "Copied!",
      description: "Team code copied to clipboard",
    })
  }

  // NEW: load roster when user has a team
  useEffect(() => {
    const loadRoster = async () => {
      const teamId = teamMembership?.teams?.id
      if (!teamId) return

      setRosterLoading(true)
      const supabase = createClient()

      const { data, error } = await supabase
        .from("team_members")
        .select(
          `
          joined_at,
          participant:participants (
            id,
            first_name,
            last_name,
            discord_username
          )
        `
        )
        .eq("team_id", teamId)
        .order("joined_at", { ascending: true })

      if (error) {
        // Don't block UI; show a toast once and keep going
        toast({
          title: "Could not load team members",
          description: error.message,
          variant: "destructive",
        })
      } else if (data) {
        setRoster(data as any)
      }

      setRosterLoading(false)
    }

    loadRoster()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamMembership?.teams?.id])

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    const supabase = createClient()

    try {
      // Generate team code
      const { data: codeData, error: codeError } = await supabase.rpc("generate_team_code")

      if (codeError) throw codeError

      // Create team
      const { data: team, error: teamError } = await supabase
        .from("teams")
        .insert({
          team_name: createTeamData.teamName,
          team_code: codeData,
          university: createTeamData.university,
          leader_id: userId,
        })
        .select()
        .single()

      if (teamError) throw teamError

      // Add creator as first team member
      const { error: memberError } = await supabase.from("team_members").insert({
        team_id: team.id,
        participant_id: userId,
      })

      if (memberError) throw memberError

      toast({
        title: "Team Created!",
        description: `Your team code is ${codeData}`,
      })

      router.refresh()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create team",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleJoinTeam = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    const supabase = createClient()

    try {
      // Find team by code
      const { data: team, error: teamError } = await supabase
        .from("teams")
        .select("id")
        .eq("team_code", joinTeamCode.toUpperCase())
        .single()

      if (teamError || !team) {
        throw new Error("Team not found. Please check the code and try again.")
      }

      // Check team size
      const { data: members, error: membersError } = await supabase
        .from("team_members")
        .select("id")
        .eq("team_id", team.id)

      if (membersError) throw membersError

      if (members && members.length >= 4) {
        throw new Error("This team is full (maximum 4 members)")
      }

      // Join team
      const { error: joinError } = await supabase.from("team_members").insert({
        team_id: team.id,
        participant_id: userId,
      })

      if (joinError) throw joinError

      toast({
        title: "Success!",
        description: "You've joined the team",
      })

      router.refresh()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to join team",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleLeaveTeam = async () => {
    if (!confirm("Are you sure you want to leave this team?")) {
      return
    }

    setIsLoading(true)
    const supabase = createClient()

    try {
      const team = teamMembership.teams
      const teamId = team.id
      const isLeader = team.leader_id === userId

      // Get all team members
      const { data: allMembers, error: membersError } = await supabase
        .from("team_members")
        .select("participant_id")
        .eq("team_id", teamId)

      if (membersError) throw membersError

      const memberCount = allMembers?.length || 0

      // If leader is leaving and there are other members, transfer leadership
      if (isLeader && memberCount > 1) {
        // Find the first member who is not the leader
        const newLeaderId = allMembers?.find((m) => m.participant_id !== userId)?.participant_id

        if (newLeaderId) {
          // Transfer leadership
          const { error: updateError } = await supabase
            .from("teams")
            .update({ leader_id: newLeaderId })
            .eq("id", teamId)

          if (updateError) throw updateError
        }
      }

      // If leader is leaving and they're the only member, delete the team
      if (isLeader && memberCount === 1) {
        const { error: deleteTeamError } = await supabase.from("teams").delete().eq("id", teamId)

        if (deleteTeamError) throw deleteTeamError
      } else {
        // Remove user from team_members
        const { error: leaveError } = await supabase
          .from("team_members")
          .delete()
          .eq("team_id", teamId)
          .eq("participant_id", userId)

        if (leaveError) throw leaveError
      }

      toast({
        title: "Success!",
        description: isLeader && memberCount === 1 ? "Team deleted" : "You've left the team",
      })

      router.refresh()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to leave team",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (teamMembership) {
    const team = teamMembership.teams
    const isLeader = team.leader_id === userId
    const shareableLink = typeof window !== "undefined" ? `${window.location.origin}/dashboard?code=${team.team_code}` : ""

    return (
      <div className="retro-card">
        <div className="retro-card-header">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5" style={{ color: "var(--orange)" }} />
            <h2 className="retro-card-title">{team.team_name}</h2>
          </div>
          {isLeader && <span className="retro-badge">Team Leader</span>}
        </div>
        <p className="retro-card-description">{team.university}</p>
        <div className="retro-card-content">
          <div className="retro-team-code-box">
            <p className="retro-info-label">Team Code</p>
            <div className="retro-team-code-display">
              <code className="retro-team-code">{team.team_code}</code>
              <button
                className="retro-icon-button"
                onClick={() => copyToClipboard(team.team_code)}
                aria-label="Copy team code"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <p className="form-hint">Share this code with your team members</p>
          </div>

          <div className="form-group">
            <label className="retro-label">Invite Link</label>
            <div className="retro-link-input-group">
              <input value={shareableLink} readOnly className="retro-input" />
              <button
                type="button"
                className="retro-icon-button"
                onClick={() => copyToClipboard(shareableLink)}
                aria-label="Copy invite link"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="form-group">
            <div className="flex items-center justify-between mb-2">
              <label className="retro-label">Team Members</label>
              <span className="retro-info-label">{roster.length}/4</span>
            </div>
            <div className="retro-roster-list">
              {rosterLoading ? (
                <div className="retro-info-label">Loading members…</div>
              ) : roster.length === 0 ? (
                <div className="retro-info-label">No members found.</div>
              ) : (
                roster.map((m) => {
                  const p = m.participant
                  const isMe = p?.id === userId
                  const fullName = [p?.first_name, p?.last_name].filter(Boolean).join(" ") || "Unnamed participant"

                  return (
                    <div key={p?.id ?? `${m.joined_at}-${Math.random()}`} className="retro-roster-item">
                      <div>
                        <div className="retro-roster-name">
                          <span>{fullName}</span>
                          {isMe && <span className="retro-badge-small">You</span>}
                          {p?.id === team.leader_id && <span className="retro-badge-small">Leader</span>}
                        </div>
                        <div className="retro-info-label">Discord: {p?.discord_username ?? "—"}</div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          <div className="form-group" style={{ marginTop: "2rem" }}>
            <button
              type="button"
              className="retro-button retro-button-danger"
              onClick={handleLeaveTeam}
              disabled={isLoading}
            >
              <LogOut className="w-4 h-4" style={{ marginRight: "0.5rem" }} />
              {isLeader ? "Delete Team" : "Leave Team"}
            </button>
            {isLeader && (
              <p className="form-hint" style={{ marginTop: "0.5rem" }}>
                As team leader, leaving will transfer leadership to another member or delete the team if you're alone.
              </p>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="retro-card">
      <div className="retro-card-header">
        <h2 className="retro-card-title">Team Registration</h2>
      </div>
      <p className="retro-card-description">Create a new team or join an existing one</p>
      <div className="retro-card-content">
        <div className="retro-tabs">
          <div className="retro-tabs-list">
            <button
              type="button"
              className={`retro-tab ${activeTab === "create" ? "retro-tab-active" : ""}`}
              onClick={() => setActiveTab("create")}
            >
              Create Team
            </button>
            <button
              type="button"
              className={`retro-tab ${activeTab === "join" ? "retro-tab-active" : ""}`}
              onClick={() => setActiveTab("join")}
            >
              Join Team
            </button>
          </div>

          {activeTab === "create" && (
            <form onSubmit={handleCreateTeam} className="retro-form">
              <div className="form-group">
                <label htmlFor="teamName" className="retro-label">Team Name</label>
                <input
                  id="teamName"
                  type="text"
                  className="retro-input"
                  placeholder="Neural Ninjas"
                  value={createTeamData.teamName}
                  onChange={(e) => setCreateTeamData({ ...createTeamData, teamName: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="university" className="retro-label">University / Institution</label>
                <input
                  id="university"
                  type="text"
                  className="retro-input"
                  placeholder="Simon Fraser University"
                  value={createTeamData.university}
                  onChange={(e) => setCreateTeamData({ ...createTeamData, university: e.target.value })}
                  required
                />
              </div>
              <button type="submit" className="cta-button" disabled={isLoading}>
                {isLoading ? "Creating..." : "Create Team"}
              </button>
            </form>
          )}

          {activeTab === "join" && (
            <form onSubmit={handleJoinTeam} className="retro-form">
              <div className="form-group">
                <label htmlFor="teamCode" className="retro-label">Team Code</label>
                <input
                  id="teamCode"
                  type="text"
                  className="retro-input"
                  placeholder="ABC123"
                  value={joinTeamCode}
                  onChange={(e) => setJoinTeamCode(e.target.value.toUpperCase())}
                  required
                  maxLength={6}
                  style={{ fontFamily: "monospace", letterSpacing: "2px" }}
                />
                <p className="form-hint">Enter the 6-character code shared by your team leader</p>
              </div>
              <button type="submit" className="cta-button" disabled={isLoading}>
                {isLoading ? "Joining..." : "Join Team"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
