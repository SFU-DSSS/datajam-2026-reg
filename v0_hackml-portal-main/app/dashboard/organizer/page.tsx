import Link from "next/link"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { PageShell } from "@/components/datajam/page-shell"
import { OrganizerDashboard } from "@/components/datajam/organizer-dashboard"
import { StatusLine } from "@/components/datajam/status-line"
import type { OrganizerState } from "@/lib/datajam/admin"

export default async function OrganizerPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect("/auth/login")
  let state: OrganizerState | null = null
  let error = ""
  try {
    if (!process.env.DATAJAM_API_URL) throw new Error("Registration backend is not configured.")
    const response = await fetch(`${process.env.DATAJAM_API_URL.replace(/\/$/, "")}/api/admin`, {
      method: "POST", cache: "no-store", signal: AbortSignal.timeout(10000),
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ action: "list", data: {} }),
    })
    const result = await response.json()
    if (!response.ok) throw new Error(result.error || "Unable to load the organizer dashboard.")
    if (!Array.isArray(result.teams)) throw new Error("Organizer tools need the latest database migration. Contact the site administrator.")
    state = result
  } catch (cause) {
    error = cause instanceof Error ? cause.message : "Unable to load the organizer dashboard. Please refresh."
  }
  return <PageShell><main className="mx-auto flex w-full max-w-[1240px] flex-col gap-8 px-4 py-12 sm:px-8 lg:py-20">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="space-y-3"><p className="font-mono text-xs font-bold text-primary">ORGANIZER PORTAL</p><h1 className="font-display text-3xl font-extrabold">Manage DataJam_</h1><p className="text-sm text-muted-foreground">Applications, teams, and participant communications.</p></div>
      <Link href="/dashboard" className="font-mono text-xs text-primary underline underline-offset-4">YOUR REGISTRATION</Link>
    </div>
    {state ? <OrganizerDashboard initialState={state} /> : <StatusLine status={{ kind: "error", text: error }} />}
  </main></PageShell>
}
