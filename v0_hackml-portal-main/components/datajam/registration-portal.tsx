import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { InviteNotice } from "@/components/datajam/invite-notice"
import { PortalProfileForm } from "@/components/datajam/portal-profile-form"
import { StatusLine } from "@/components/datajam/status-line"
import type { RegistrationLookup } from "@/lib/datajam/server"

const overlayCode = `import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier

# Loading dataset for SFU Data Science Data Jam
data = pd.read_csv("jam_data.csv")

def preprocess_features(df):
    df['skill_level'] = df['experience'].map({'novice': 0, 'expert': 1})
    return df.dropna()

clf = RandomForestClassifier(n_estimators=100)
clf.fit(X_train, y_train)
print("[SUCCESS] Data Jam models initiated.")`

const ctaClass = "h-14 w-full rounded-md sm:w-auto sm:flex-1 font-display text-base font-extrabold"

function PortalContent({ registration }: { registration: RegistrationLookup }) {
  if (registration.status === "signed-out") {
    return (
      <div className="flex flex-col gap-4">
        <p className="font-mono text-sm text-muted-foreground">
          {">>> Create an account or sign in to fill out your registration."}
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button asChild className={ctaClass}>
            <Link href="/auth/sign-up">CREATE ACCOUNT</Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className={`${ctaClass} border-primary/25 bg-background text-primary hover:bg-primary/10 hover:text-primary`}
          >
            <Link href="/auth/login">SIGN IN</Link>
          </Button>
        </div>
      </div>
    )
  }

  if (registration.status === "error") {
    return <StatusLine status={{ kind: "error", text: registration.error }} />
  }

  const { state, email } = registration
  if (state.next_step === "complete_profile") return <PortalProfileForm initialProfile={state.profile} defaultStudentEmail={email} />

  return (
    <div className="flex flex-col gap-6">
      <p className="font-mono text-sm text-teal-500">
        {state.team
          ? `>>> [OK] Registered on team ${state.team.name}.`
          : ">>> [OK] Profile saved. Next, create or join a team."}
      </p>
      <Button asChild className={ctaClass}>
        <Link href="/dashboard">{state.team ? "OPEN DASHBOARD" : "CHOOSE A TEAM"}</Link>
      </Button>
    </div>
  )
}

export function RegistrationPortal({ registration }: { registration: RegistrationLookup }) {
  return (
    <section id="register" className="flex scroll-mt-4 justify-center px-4 pb-[120px] sm:px-8 lg:px-20">
      <Card className="relative w-full max-w-[800px] gap-9 overflow-hidden rounded-2xl border-primary/25 p-6 shadow-[0_12px_48px_rgba(0,240,255,0.05)] sm:p-12">
        <pre
          aria-hidden
          className="pointer-events-none absolute inset-0 p-8 font-mono text-[11px] leading-[1.6] whitespace-pre-wrap text-primary opacity-[0.04] select-none"
        >
          {overlayCode}
        </pre>

        <div className="relative flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <p className="font-mono text-xs font-bold text-primary">ENTRY PORTAL</p>
            <Image src="/datajam/portal-line.svg" alt="" width={100} height={1} />
          </div>
          <h2 className="font-display text-[28px] font-bold text-foreground">Secure Your Team Spot</h2>
          <p className="text-sm text-muted-foreground">
            No full team? Register and DSSS will match teams after sign-ups close.
          </p>
        </div>

        <div className="relative flex flex-col gap-6">
          <InviteNotice />
          <PortalContent registration={registration} />
        </div>
      </Card>
    </section>
  )
}
