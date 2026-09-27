import { redirect } from "next/navigation"
import { getRegistration } from "@/lib/datajam/server"
import { PageShell } from "@/components/datajam/page-shell"
import { RegistrationDashboard } from "@/components/datajam/registration-dashboard"
import { SignOutButton } from "@/components/sign-out-button"
import { StatusLine } from "@/components/datajam/status-line"

export default async function DashboardPage() {
  const registration = await getRegistration()
  if (registration.status === "signed-out") {
    redirect("/auth/login")
  }

  return (
    <PageShell>
      <main className="mx-auto flex w-full max-w-[880px] flex-col gap-10 px-4 py-16 sm:px-8 lg:py-[100px]">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="flex flex-col gap-3">
            <p className="font-mono text-xs font-bold text-teal-500">DASHBOARD</p>
            <h1 className="font-display text-[32px] font-extrabold text-foreground">Your Registration_</h1>
            <p className="font-mono text-sm break-all text-muted-foreground">{registration.email}</p>
          </div>
          <SignOutButton />
        </div>

        {registration.status === "error" ? (
          <StatusLine status={{ kind: "error", text: registration.error }} />
        ) : (
          <RegistrationDashboard initialState={registration.state} loginEmail={registration.email} />
        )}
      </main>
    </PageShell>
  )
}
