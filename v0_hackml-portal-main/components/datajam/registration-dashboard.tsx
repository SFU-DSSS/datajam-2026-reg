"use client"

import type React from "react"
import { useEffect, useState } from "react"
import Link from "next/link"
import { registrationAction } from "@/lib/datajam/client"
import {
  INVITE_CODE_PATTERN,
  PENDING_INVITE_KEY,
  type RegistrationAction,
  type RegistrationState,
  type Team,
} from "@/lib/datajam/types"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { FieldHeader, TerminalInput } from "@/components/datajam/form-fields"
import { ProfileForm } from "@/components/datajam/profile-form"
import { StatusLine, type Status } from "@/components/datajam/status-line"

const primaryButtonClass = "h-12 rounded-md font-display text-sm font-extrabold"
const outlineButtonClass =
  "h-10 rounded-md border-primary/25 bg-background font-mono text-xs font-semibold text-primary hover:bg-primary/10 hover:text-primary"
const dangerButtonClass =
  "h-10 rounded-md border-rose-500/40 bg-background font-mono text-xs font-semibold text-rose-500 hover:bg-rose-500/10 hover:text-rose-500"

type Run = (action: RegistrationAction, data: Record<string, string>, successText: string) => Promise<boolean>

function SectionHeading({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="font-mono text-xs font-bold text-primary">{eyebrow}</p>
      <h2 className="font-display text-2xl font-bold text-foreground">{title}</h2>
    </div>
  )
}

function ConfirmButton({
  label,
  title,
  description,
  onConfirm,
  disabled,
  className,
}: {
  label: string
  title: string
  description: string
  onConfirm: () => void
  disabled?: boolean
  className: string
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" disabled={disabled} className={className}>
          {label}
        </Button>
      </AlertDialogTrigger>
      {/* Rendered in a portal outside the page wrapper, so it sets its own font */}
      <AlertDialogContent className="border-primary/25 font-sans leading-normal">
        <AlertDialogHeader>
          <AlertDialogTitle className="font-display">{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="font-mono text-xs">CANCEL</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className="font-mono text-xs font-semibold">
            {label}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function SingleFieldForm({
  id,
  label,
  placeholder,
  maxLength,
  initialValue = "",
  submitLabel,
  busy,
  onSubmit,
}: {
  id: string
  label: string
  placeholder: string
  maxLength: number
  initialValue?: string
  submitLabel: string
  busy: boolean
  onSubmit: (value: string) => void
}) {
  const [value, setValue] = useState(initialValue)
  useEffect(() => setValue(initialValue), [initialValue])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(value)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <FieldHeader htmlFor={id} label={label} />
        <TerminalInput
          id={id}
          placeholder={placeholder}
          maxLength={maxLength}
          autoComplete="off"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          required
        />
      </div>
      <Button type="submit" disabled={busy} className={primaryButtonClass}>
        {submitLabel}
      </Button>
    </form>
  )
}

function ChooseTeam({ maxTeamSize, busy, run }: { maxTeamSize: number; busy: boolean; run: Run }) {
  const [pendingInvite, setPendingInvite] = useState("")

  useEffect(() => {
    try {
      const saved = localStorage.getItem(PENDING_INVITE_KEY) ?? ""
      if (INVITE_CODE_PATTERN.test(saved)) setPendingInvite(saved)
    } catch {
      // Storage unavailable; the user can still paste the code.
    }
  }, [])

  return (
    <Card className="gap-8 rounded-2xl border-primary/25 p-6 shadow-none sm:p-10">
      <div className="flex flex-col gap-3">
        <SectionHeading eyebrow="// TEAM" title="Create or Join a Team" />
        <p className="text-sm text-muted-foreground">
          Teams can have up to {maxTeamSize} members. You can belong to one team. No team? DSSS will match teams after
          sign-ups close.
        </p>
      </div>
      <div className="grid gap-8 md:grid-cols-2">
        <SingleFieldForm
          id="join-code"
          label="Invitation Code"
          placeholder="e.g. a7e1539bc024"
          maxLength={64}
          initialValue={pendingInvite}
          submitLabel="JOIN TEAM"
          busy={busy}
          onSubmit={(code) => run("join", { code }, "You joined the team.")}
        />
        <SingleFieldForm
          id="create-name"
          label="New Team Name"
          placeholder="e.g. Data Folks"
          maxLength={80}
          submitLabel="CREATE TEAM"
          busy={busy}
          onSubmit={(name) => run("create", { name }, "Team created. You are the captain.")}
        />
      </div>
    </Card>
  )
}

function CopyField({ id, label, value, onCopied }: { id: string; label: string; value: string; onCopied: () => void }) {
  return (
    <div className="flex flex-col gap-2">
      <FieldHeader htmlFor={id} label={label} required={false} />
      <div className="flex gap-3">
        <TerminalInput id={id} readOnly value={value} className="font-mono" />
        <Button
          type="button"
          variant="outline"
          className={`${outlineButtonClass} h-12 shrink-0 px-5`}
          onClick={async () => {
            await navigator.clipboard.writeText(value)
            onCopied()
          }}
        >
          COPY
        </Button>
      </div>
    </div>
  )
}

function TeamPortal({
  team,
  state,
  busy,
  run,
  setStatus,
}: {
  team: Team
  state: RegistrationState
  busy: boolean
  run: Run
  setStatus: (status: Status) => void
}) {
  const isCaptain = state.permissions.manage_team
  const [origin, setOrigin] = useState("")
  useEffect(() => setOrigin(window.location.origin), [])
  const inviteLink = origin ? `${origin}/?invite=${team.invite_code}` : ""
  const othersRemain = team.members.length > 1

  return (
    <Card className="gap-8 rounded-2xl border-primary/25 p-6 shadow-none sm:p-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <SectionHeading eyebrow="// YOUR TEAM" title={team.name} />
        <p className="font-mono text-sm text-muted-foreground">
          [ {team.members.length} / {state.max_team_size} MEMBERS ]
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <CopyField
          id="invite-code"
          label="Invitation Code"
          value={team.invite_code}
          onCopied={() => setStatus({ kind: "ok", text: "Invitation code copied." })}
        />
        <CopyField
          id="invite-link"
          label="Invitation Link"
          value={inviteLink}
          onCopied={() => setStatus({ kind: "ok", text: "Invitation link copied." })}
        />
      </div>

      <div className="flex flex-col gap-3">
        <p className="font-mono text-xs font-semibold text-primary">{"// ROSTER"}</p>
        <ul className="flex flex-col gap-3">
          {team.members.map((member) => (
            <li
              key={member.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-background px-4 py-3"
            >
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-display text-sm font-medium text-slate-50">{member.name}</span>
                <span className="font-mono text-xs text-muted-foreground">@{member.discord_username}</span>
                {member.id === team.captain_id && (
                  <Badge className="rounded-full font-mono text-[11px] font-semibold">CAPTAIN</Badge>
                )}
                {member.id === state.user_id && <span className="font-mono text-[11px] text-slate-600">(YOU)</span>}
              </div>
              {isCaptain && member.id !== state.user_id && (
                <div className="flex gap-2">
                  <ConfirmButton
                    label="MAKE CAPTAIN"
                    title={`Make ${member.name} captain?`}
                    description="You will no longer be able to manage this team."
                    disabled={busy}
                    className={outlineButtonClass}
                    onConfirm={() => run("transfer", { user_id: member.id }, "Captaincy transferred.")}
                  />
                  <ConfirmButton
                    label="REMOVE"
                    title={`Remove ${member.name}?`}
                    description="This also regenerates the invitation code and link, so the old ones stop working."
                    disabled={busy}
                    className={dangerButtonClass}
                    onConfirm={() => run("remove", { user_id: member.id }, "Member removed; invitations regenerated.")}
                  />
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>

      {isCaptain && (
        <div className="flex flex-col gap-6 border-t border-border pt-8">
          <p className="font-mono text-xs font-semibold text-primary">{"// CAPTAIN CONTROLS"}</p>
          <SingleFieldForm
            id="rename"
            label="Team Name"
            placeholder="e.g. Data Folks"
            maxLength={80}
            initialValue={team.name}
            submitLabel="RENAME TEAM"
            busy={busy}
            onSubmit={(name) => run("rename", { name }, "Team renamed.")}
          />
          <ConfirmButton
            label="REGENERATE INVITATION"
            title="Regenerate the invitation?"
            description="The current invitation code and link will stop working."
            disabled={busy}
            className={outlineButtonClass}
            onConfirm={() => run("rotate", {}, "New invitations are ready to copy.")}
          />
        </div>
      )}

      <div className="flex flex-col gap-2 border-t border-border pt-8">
        <ConfirmButton
          label="LEAVE TEAM"
          title="Leave this team?"
          description={
            othersRemain
              ? "You can rejoin later only with a current invitation."
              : "You are the last member, so the team will be deleted."
          }
          disabled={busy || (isCaptain && othersRemain)}
          className={`${dangerButtonClass} self-start`}
          onConfirm={() => run("leave", {}, "You left the team.")}
        />
        {isCaptain && othersRemain && (
          <p className="font-mono text-[11px] text-slate-600">Transfer captaincy before leaving.</p>
        )}
      </div>
    </Card>
  )
}

interface RegistrationDashboardProps {
  initialState: RegistrationState
  loginEmail: string
}

export function RegistrationDashboard({ initialState, loginEmail }: RegistrationDashboardProps) {
  const [state, setState] = useState(initialState)
  const [status, setStatus] = useState<Status>(null)
  const [busy, setBusy] = useState(false)
  const [editingProfile, setEditingProfile] = useState(false)

  const run: Run = async (action, data, successText) => {
    if (busy) return false
    setBusy(true)
    setStatus(null)
    try {
      setState(await registrationAction(action, data))
      setStatus({ kind: "ok", text: successText })
      if (action === "join" || action === "create") {
        try {
          localStorage.removeItem(PENDING_INVITE_KEY)
        } catch {}
      }
      return true
    } catch (error) {
      setStatus({ kind: "error", text: error instanceof Error ? error.message : "Something went wrong." })
      // Membership or permissions may be stale; reload state instead of retrying the mutation.
      registrationAction("me").then(setState, () => {})
      return false
    } finally {
      setBusy(false)
    }
  }

  const { profile, team } = state

  return (
    <div className="flex flex-col gap-8">
      <Card className="gap-4 rounded-2xl border-primary/25 p-6 shadow-none">
        <SectionHeading eyebrow="// APPLICATION STATUS" title={profile ? (state.admission_status ?? "pending").toUpperCase() : "Not submitted"} />
        <p className="text-sm text-muted-foreground">{!profile ? "Save your profile to submit your application." : ({ pending: "Your application is awaiting organizer review.", accepted: "You have been accepted! Watch your login email for event details.", waitlisted: "You are on the waitlist. Organizers will contact you if your status changes.", rejected: "Your application was not accepted. Contact the organizers if you have questions." })[state.admission_status ?? "pending"]}</p>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" className={outlineButtonClass} disabled={busy} onClick={() => run("me", {}, "Registration refreshed.")}>REFRESH STATUS</Button>
          {state.is_admin && <Button asChild className="font-mono text-xs"><Link href="/dashboard/organizer">ORGANIZER DASHBOARD</Link></Button>}
          <Button asChild variant="outline" className={outlineButtonClass}><Link href="/auth/reset-password">CHANGE PASSWORD</Link></Button>
        </div>
      </Card>

      <Card className="gap-8 rounded-2xl border-primary/25 p-6 shadow-none sm:p-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <SectionHeading eyebrow="// PROFILE" title={profile ? profile.name : "Complete Your Profile"} />
          {profile && !editingProfile && (
            <Button variant="outline" className={outlineButtonClass} onClick={() => setEditingProfile(true)}>
              EDIT PROFILE
            </Button>
          )}
        </div>
        {profile && profile.photo_consent !== null && !editingProfile ? (
          <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
            {[
              ["STUDENT EMAIL", profile.student_email],
              ["UNIVERSITY / INSTITUTION", profile.institution],
              ["STUDENT NUMBER", profile.student_number],
              ["DISCORD USERNAME", profile.discord_username],
              ["PHOTO CONSENT", profile.photo_consent ? "Yes — event photography permitted" : "No — do not photograph"],
            ].map(([label, value]) => (
              <div key={label} className="flex flex-col gap-1">
                <dt className="font-mono text-[11px] font-semibold text-slate-600">{`// ${label}`}</dt>
                <dd className="text-sm break-words text-foreground">{value}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <>
            {!profile && (
              <p className="text-sm text-muted-foreground">Complete your profile to create or join a team.</p>
            )}
            <ProfileForm
              initialProfile={profile}
              defaultStudentEmail={loginEmail}
              submitLabel={profile ? "SAVE PROFILE" : "SUBMIT REGISTRATION"}
              onSaved={(next) => {
                setState(next)
                setEditingProfile(false)
                setStatus({ kind: "ok", text: "Profile saved." })
              }}
            />
            {profile && (
              <Button variant="outline" className={`${outlineButtonClass} self-start`} onClick={() => setEditingProfile(false)}>
                CANCEL
              </Button>
            )}
          </>
        )}
      </Card>

      {profile && (team || profile.photo_consent !== null) &&
        (team ? (
          <TeamPortal team={team} state={state} busy={busy} run={run} setStatus={setStatus} />
        ) : (
          <ChooseTeam maxTeamSize={state.max_team_size} busy={busy} run={run} />
        ))}

      {/* Sticky so feedback stays visible next to whichever action was used */}
      {status && (
        <div className="sticky bottom-4 z-10 rounded-md border border-border bg-card/95 px-4 py-3 shadow-lg backdrop-blur">
          <StatusLine status={status} />
        </div>
      )}
    </div>
  )
}
