"use client"

import { useRouter } from "next/navigation"
import { ProfileForm } from "@/components/datajam/profile-form"

// Home-page profile form: after saving, continue to the dashboard to create or join a team.
export function PortalProfileForm({ defaultStudentEmail }: { defaultStudentEmail: string }) {
  const router = useRouter()
  return <ProfileForm defaultStudentEmail={defaultStudentEmail} onSaved={() => router.push("/dashboard")} />
}
