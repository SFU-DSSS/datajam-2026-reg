import Link from "next/link"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Navbar } from "@/components/navbar"
import { SignOutButton } from "@/components/sign-out-button"
import { RegistrationStatus } from "@/components/registration-status"
import { TeamManagement } from "@/components/team-management"

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) {
    redirect("/auth/login")
  }

  // Check if user has completed participant registration
  const { data: participant } = await supabase.from("participants").select("*").eq("id", data.user.id).single()

  // Check if user has a team
  const { data: teamMembership } = await supabase
    .from("team_members")
    .select(`
      *,
      teams (
        id,
        team_name,
        team_code,
        university,
        leader_id
      )
    `)
    .eq("participant_id", data.user.id)
    .single()

  return (
    <>
      <Navbar />
      <main>
        <section className="hero">
          <div className="container">
            <div className="hero-content">
              <h1>
                <span className="main-title">Welcome back!</span>
              </h1>
              <p className="hero-subtitle">Complete your registration and join a team for HackML 2026</p>
              <div className="dashboard-user-info">
                <p className="retro-label">{data.user.email}</p>
                <SignOutButton />
              </div>
              <div className="dashboard-content">
                <RegistrationStatus participant={participant} />
                {participant && <TeamManagement userId={data.user.id} teamMembership={teamMembership} />}
              </div>
            </div>
          </div>
        </section>
      </main>
      <footer>
        <p>Hosted by the Data Science Student Society (DSSS) at Simon Fraser University</p>
      </footer>
    </>
  )
}
