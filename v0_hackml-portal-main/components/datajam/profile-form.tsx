"use client"

import type React from "react"
import { useState } from "react"
import { registrationAction } from "@/lib/datajam/client"
import type { Profile, ProfileInput, RegistrationState } from "@/lib/datajam/types"
import { Button } from "@/components/ui/button"
import { FieldHeader, FieldHint, TerminalInput } from "@/components/datajam/form-fields"
import { StatusLine, type Status } from "@/components/datajam/status-line"

interface ProfileFormProps {
  initialProfile?: Profile | null
  // Pre-fills the student email for new profiles; it may differ from the login email.
  defaultStudentEmail?: string
  submitLabel?: string
  onSaved: (state: RegistrationState) => void
}

export function ProfileForm({ initialProfile, defaultStudentEmail = "", submitLabel = "SUBMIT REGISTRATION", onSaved }: ProfileFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [status, setStatus] = useState<Status>(null)
  const [formData, setFormData] = useState<ProfileInput>({
    name: initialProfile?.name ?? "",
    student_email: initialProfile?.student_email ?? defaultStudentEmail,
    institution: initialProfile?.institution ?? "",
    student_number: initialProfile?.student_number ?? "",
    discord_username: initialProfile?.discord_username ?? "",
  })

  const update = (field: keyof ProfileInput) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setFormData({ ...formData, [field]: e.target.value })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setStatus(null)
    try {
      const state = await registrationAction("profile", { ...formData })
      setStatus({ kind: "ok", text: "Profile saved." })
      onSaved(state)
    } catch (error) {
      // Entered values are kept so the user can fix and resubmit.
      setStatus({ kind: "error", text: error instanceof Error ? error.message : "Failed to save profile." })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-9 font-sans leading-normal">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <FieldHeader htmlFor="name" label="Full Name" />
          <TerminalInput
            id="name"
            autoComplete="name"
            placeholder="e.g. Marie Curie"
            maxLength={100}
            value={formData.name}
            onChange={update("name")}
            required
          />
        </div>

        <div className="flex flex-col gap-2">
          <FieldHeader htmlFor="student_email" label="Email Address" />
          <TerminalInput
            id="student_email"
            type="email"
            autoComplete="email"
            placeholder="e.g. mcurie@sfu.ca"
            maxLength={254}
            value={formData.student_email}
            onChange={update("student_email")}
            required
          />
          <FieldHint>Your student email. It can differ from your login email.</FieldHint>
        </div>

        <div className="flex flex-col gap-2">
          <FieldHeader htmlFor="institution" label="University / Institution" />
          <TerminalInput
            id="institution"
            autoComplete="organization"
            placeholder="e.g. Simon Fraser University"
            maxLength={150}
            value={formData.institution}
            onChange={update("institution")}
            required
          />
        </div>

        <div className="grid gap-6 sm:grid-cols-2 sm:gap-5">
          <div className="flex flex-col gap-2">
            <FieldHeader htmlFor="student_number" label="Student Number" />
            <TerminalInput
              id="student_number"
              placeholder="e.g. 301234567"
              maxLength={50}
              value={formData.student_number}
              onChange={update("student_number")}
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <FieldHeader htmlFor="discord_username" label="Discord Username" />
            <TerminalInput
              id="discord_username"
              placeholder="e.g. mariecurie"
              maxLength={100}
              value={formData.discord_username}
              onChange={update("discord_username")}
              required
            />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <StatusLine status={status} />
        <Button
          type="submit"
          disabled={isLoading}
          className="h-14 w-full rounded-md font-display text-base font-extrabold shadow-[0_4px_8px_rgba(0,240,255,0.25)]"
        >
          {isLoading ? "SAVING..." : submitLabel}
        </Button>
        <p className="text-center font-mono text-[11px] text-slate-600">
          * BY REGISTERING, YOU AGREE TO SFU DATA JAM ETHICS &amp; RULES_
        </p>
      </div>
    </form>
  )
}
