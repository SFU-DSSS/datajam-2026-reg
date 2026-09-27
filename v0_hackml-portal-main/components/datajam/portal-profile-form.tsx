"use client"

import { useRouter } from "next/navigation"
import { ProfileForm } from "@/components/datajam/profile-form"
import type { Profile } from "@/lib/datajam/types"

// Home-page profile form: after saving, continue to the dashboard to create or join a team.
export function PortalProfileForm({ defaultStudentEmail, initialProfile }: { defaultStudentEmail: string; initialProfile?: Profile | null }) {
  const router = useRouter()
  return <ProfileForm initialProfile={initialProfile} defaultStudentEmail={defaultStudentEmail} onSaved={() => router.push("/dashboard")} />
}
