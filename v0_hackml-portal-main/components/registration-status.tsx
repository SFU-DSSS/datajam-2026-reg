"use client"

import { CheckCircle2, UserPlus } from "lucide-react"
import { ParticipantRegistrationForm } from "@/components/participant-registration-form"

interface RegistrationStatusProps {
  participant: any
}

export function RegistrationStatus({ participant }: RegistrationStatusProps) {
  if (participant) {
    return (
      <div className="retro-card mb-4">
        <div className="retro-card-header">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" style={{ color: "var(--yellow)" }} />
            <h2 className="retro-card-title">Registration Complete</h2>
          </div>
          <span className="retro-badge">Verified</span>
        </div>
        <p className="retro-card-description">Your participant information has been saved</p>
        <div className="retro-info-grid">
          <div className="retro-info-item">
            <p className="retro-info-label">Name</p>
            <p className="retro-info-value">
              {participant.first_name} {participant.last_name}
            </p>
          </div>
          <div className="retro-info-item">
            <p className="retro-info-label">Student Number</p>
            <p className="retro-info-value">{participant.student_number}</p>
          </div>
          <div className="retro-info-item">
            <p className="retro-info-label">Major</p>
            <p className="retro-info-value capitalize">{participant.major.replace("-", " ")}</p>
          </div>
          <div className="retro-info-item">
            <p className="retro-info-label">Year</p>
            <p className="retro-info-value">{participant.year}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="retro-card mb-4">
      <div className="retro-card-header">
        <div className="flex items-center gap-2">
          <UserPlus className="w-5 h-5" style={{ color: "var(--orange)" }} />
          <span><h2 className="retro-card-title">Complete Your Registration</h2></span>
        </div>
      </div>
      <p className="retro-card-description">Fill out your participant information to continue</p>
      <div className="retro-card-content">
        <ParticipantRegistrationForm />
      </div>
    </div>
  )
}
