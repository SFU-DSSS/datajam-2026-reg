"use client"

import { useEffect, useRef, useState } from "react"
import { admissionStatuses, organizerAction, type Application, type AdmissionStatus, type OrganizerAction, type OrganizerState, type OrganizerTeam } from "@/lib/datajam/admin"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { TerminalInput } from "./form-fields"
import { StatusLine, type Status } from "./status-line"
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog"

const control = "min-h-10 rounded-md border border-primary/25 bg-background px-3 py-2 font-mono text-xs text-foreground focus-visible:outline-2 focus-visible:outline-primary"
const panel = "gap-5 rounded-2xl border-primary/25 p-5 shadow-none sm:p-7"
const button = "min-h-10 whitespace-normal font-mono text-xs"
type Confirmation = { title: string; description: string; run: () => Promise<void> }
type Draft = { subject: string; text: string; recipients: { id: string; user_id: string; email: string }[] }

export function OrganizerDashboard({ initialState }: { initialState: OrganizerState }) {
  const [state, setState] = useState(initialState)
  const [tab, setTab] = useState("applications")
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState<AdmissionStatus | "all">("all")
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState(false)
  const running = useRef(false)
  const [status, setStatus] = useState<Status>(null)
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null)
  const [subject, setSubject] = useState("")
  const [message, setMessage] = useState("")
  const [draft, setDraft] = useState<Draft | null>(null)
  const [teamQuery, setTeamQuery] = useState("")
  const [emailFilter, setEmailFilter] = useState("all")
  const visible = state.registrations.filter((r) => (filter === "all" || r.status === filter) &&
    [r.name, r.login_email, r.student_email, r.student_number, r.discord_username, r.institution, r.team_name].some((v) => v?.toLowerCase().includes(query.toLowerCase())))
  const counts = Object.fromEntries(admissionStatuses.map((s) => [s, state.registrations.filter((r) => r.status === s).length]))

  async function refresh() {
    const next = await organizerAction<OrganizerState>("list")
    setState(next)
    setSelected((old) => new Set([...old].filter((id) => next.registrations.some((r) => r.id === id))))
  }
  async function run(work: () => Promise<void>) {
    if (running.current) return
    running.current = true
    setBusy(true)
    setStatus(null)
    try { await work() }
    catch (error) { setStatus({ kind: "error", text: error instanceof Error ? error.message : "Request failed. Refresh before retrying." }) }
    finally {
      try { await refresh() } catch { setStatus({ kind: "error", text: "Could not refresh. Some actions may have completed. Refresh before making further changes." }) }
      running.current = false
      setBusy(false)
    }
  }
  function confirmAction(title: string, description: string, action: OrganizerAction, data: Record<string, unknown>) {
    setConfirmation({ title, description, run: async () => {
      const result = await organizerAction(action, data)
      setStatus({ kind: "ok", text: `Saved. ${result.email_notice || ""}` })
    } })
  }
  function changeSelection(next: Set<string>) { setSelected(next); setDraft(null) }
  async function sendQueue(ids: string[]) {
    let completed = 0
    let notice = ""
    for (const id of ids) {
      const result = await organizerAction("send", { id })
      completed++
      notice = result.email_notice || "Check email history."
      setStatus({ kind: "ok", text: `${completed}/${ids.length} processed. ${notice}` })
      if (/remains queued|could not be saved/i.test(notice)) break
    }
    setStatus({ kind: "ok", text: `${completed}/${ids.length} email requests processed. ${notice} Review history for delivery state; remaining queued messages can be sent later.` })
  }
  function acceptAll() {
    setConfirmation({ title: `Accept all ${counts.pending} pending applications?`, description: "This accepts every pending application, including those hidden by search. Accepted, waitlisted and rejected applications stay as they are. Acceptance emails are queued once per participant and then sent individually.", run: async () => {
      const result = await organizerAction("accept_all", { expected_count: counts.pending })
      setStatus({ kind: "ok", text: `${result.accepted_count} applications accepted.` })
      if (result.email_ids?.length) await sendQueue(result.email_ids)
    } })
  }

  return <div className="flex flex-col gap-6">
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {admissionStatuses.map((s) => <button key={s} disabled={busy} onClick={() => { setFilter(s); setTab("applications") }} className="rounded-xl border border-primary/25 bg-card p-5 text-left transition-colors hover:border-primary focus-visible:outline-2 focus-visible:outline-primary"><span className="font-mono text-[11px] uppercase text-muted-foreground">{s === "pending" ? "Current / pending" : s}</span><span className="mt-2 block font-display text-3xl text-primary">{counts[s]}</span></button>)}
    </div>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <nav aria-label="Organizer sections" className="flex flex-wrap gap-2">{["applications", "teams", "email", "activity"].map((name) => <Button key={name} disabled={busy} variant={tab === name ? "default" : "outline"} className={button} aria-current={tab === name ? "page" : undefined} onClick={() => setTab(name)}>{name.toUpperCase()}{name === "email" && selected.size ? ` (${selected.size})` : ""}</Button>)}</nav>
      <Button variant="outline" className={button} disabled={busy} onClick={() => run(async () => { setStatus({ kind: "ok", text: "Dashboard refreshed." }) })}>REFRESH</Button>
    </div>

    {tab === "applications" && <Card className={panel}>
      <div className="flex flex-wrap items-end justify-between gap-4"><div><h2 className="font-display text-xl">Applications_</h2><p className="mt-2 text-sm text-muted-foreground">{state.registrations.length} submitted profiles · {state.registrations.filter((r) => !r.team_id).length} without a team</p></div><Button className={button} disabled={busy || !counts.pending} onClick={acceptAll}>ACCEPT ALL PENDING ({counts.pending})</Button></div>
      <div className="grid gap-3 sm:grid-cols-[1fr_auto]"><TerminalInput aria-label="Search applications" placeholder="Search name, email, institution, team…" value={query} onChange={(e) => setQuery(e.target.value)} /><select aria-label="Filter applications by status" className={control} value={filter} onChange={(e) => setFilter(e.target.value as AdmissionStatus | "all")}><option value="all">All applications</option>{admissionStatuses.map((s) => <option key={s} value={s}>{s}</option>)}</select></div>
      <div className="flex flex-wrap items-center gap-3"><span className="font-mono text-xs text-muted-foreground">{visible.length} shown · {selected.size} selected across filters</span><Button variant="outline" className={button} disabled={busy || !visible.length} onClick={() => changeSelection(new Set([...selected, ...visible.map((r) => r.id)]))}>SELECT SHOWN</Button><Button variant="outline" className={button} disabled={busy || !selected.size} onClick={() => changeSelection(new Set())}>CLEAR SELECTION</Button><Button className={button} disabled={busy || !selected.size} onClick={() => setTab("email")}>EMAIL SELECTED</Button></div>
      {!visible.length && <Empty text="No applications match this filter." />}
      {visible.map((r) => <ApplicationCard key={r.id} application={r} selected={selected.has(r.id)} busy={busy} onSelect={(checked) => { const next = new Set(selected); checked ? next.add(r.id) : next.delete(r.id); changeSelection(next) }} onDecision={(status) => confirmAction(`Set ${r.name} to ${status}?`, status === "accepted" ? "An acceptance email will be sent to their login address once. If email is not configured, it stays queued." : "This updates their dashboard status. It does not send an email or change team membership; use Email for a personal message.", "decision", { user_id: r.id, status })} />)}
    </Card>}

    {tab === "teams" && <div className="space-y-5">
      <Card className={panel}><h2 className="font-display text-xl">Team compositions_</h2><p className="text-sm text-muted-foreground">{state.teams.length} teams · up to {state.max_team_size} participants each. Moving a member regenerates their former team’s invitation. Transfer captaincy before moving or removing a captain with teammates.</p><TerminalInput aria-label="Search teams" placeholder="Search teams or members…" value={teamQuery} onChange={(e) => setTeamQuery(e.target.value)} />
        <TeamCreate registrations={state.registrations} busy={busy} onCreate={(name, user_id) => confirmAction(`Create ${name}?`, "The selected participant becomes captain of the new team.", "team_create", { name, user_id })} />
      </Card>
      {state.teams.filter((t) => [t.name, ...state.registrations.filter((r) => r.team_id === t.id).map((r) => r.name)].some((v) => v.toLowerCase().includes(teamQuery.toLowerCase()))).map((t) => <TeamEditor key={t.id} team={t} registrations={state.registrations} maxSize={state.max_team_size} busy={busy} confirm={confirmAction} />)}
      {!state.teams.length && <Empty text="No teams yet. Create one above and assign participants." />}
    </div>}

    {tab === "email" && <div className="space-y-5">
      <Card className={panel}>
        <h2 className="font-display text-xl">Messages & reminders_</h2><p className="text-sm text-muted-foreground">Choose recipients in Applications using status filters or individual checkboxes. Each recipient gets a separate email at their login address.</p>
        <p className="font-mono text-xs text-primary">{selected.size} RECIPIENTS SELECTED</p>
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); if (!selected.size) return; setDraft({ subject: subject.trim(), text: message.trim(), recipients: state.registrations.filter((r) => selected.has(r.id)).map((r) => ({ id: crypto.randomUUID(), user_id: r.id, email: r.login_email })) }) }}>
          <label className="flex flex-col gap-2 text-sm">Subject<TerminalInput aria-label="Subject" required maxLength={200} value={subject} disabled={busy || !!draft} onChange={(e) => setSubject(e.target.value)} placeholder="DataJam: what to bring on event day" /></label>
          <label className="flex flex-col gap-2 text-sm">Message<textarea required maxLength={5000} rows={8} className={`${control} text-sm leading-relaxed`} disabled={busy || !!draft} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Hi everyone,…" /></label>
          <Button className={button} disabled={busy || !selected.size || !!draft || !subject.trim() || !message.trim()}>PREVIEW EMAIL</Button>
        </form>
        {draft && <div className="space-y-4 rounded-lg border border-primary/40 bg-background p-5">
          <h3 className="font-display">Review your message</h3><p className="break-words text-sm text-muted-foreground">To ({draft.recipients.length}): {draft.recipients.map((r) => r.email).join(", ")}</p><p className="font-semibold break-words">{draft.subject}</p><p className="whitespace-pre-wrap break-words text-sm">{draft.text}</p>
          <div className="flex flex-wrap gap-3"><Button disabled={busy} className={button} onClick={() => setConfirmation({ title: `Send ${draft.recipients.length} individual emails?`, description: "This sends the exact message and recipient list shown in the preview. Messages already processed by this draft will not be sent twice if you retry.", run: async () => {
            let completed = 0
            let lastNotice = ""
            for (const recipient of draft.recipients) {
              const result = await organizerAction("compose", { id: recipient.id, user_id: recipient.user_id, subject: draft.subject, text: draft.text })
              completed++
              lastNotice = result.email_notice || "Check history."
              setStatus({ kind: "ok", text: `${completed}/${draft.recipients.length} processed. ${lastNotice}` })
            }
            setDraft(null); setSubject(""); setMessage("")
            setStatus({ kind: "ok", text: `${completed} email requests processed. ${lastNotice} Review history for each message’s state.` })
          } })}>SEND MESSAGE</Button><Button variant="outline" className={button} disabled={busy} onClick={() => setConfirmation({ title: "Discard this preview?", description: "If a previous attempt was interrupted, check email history before creating another draft. Starting a new draft creates new messages.", run: async () => { setDraft(null) } })}>EDIT / DISCARD PREVIEW</Button></div>
        </div>}
      </Card>
      <Card className={panel}>
        <div className="flex flex-wrap justify-between gap-3"><h2 className="font-display text-xl">Email history_</h2><Button className={button} disabled={busy || !state.queued_emails.length} onClick={() => setConfirmation({ title: `Send ${state.queued_emails.length} queued emails?`, description: "This sends all queued acceptance and custom messages. Emails already submitted or with an uncertain outcome will not be retried.", run: () => sendQueue(state.queued_emails) })}>SEND QUEUED ({state.queued_emails.length})</Button></div>
        <p className="text-sm text-muted-foreground">Latest 200 messages. “Submitted” means the email provider accepted the message, not confirmed delivery. For “unknown” or stuck “sending”, check provider logs before composing another message.</p>
        <select className={`${control} self-start`} aria-label="Filter email history" value={emailFilter} onChange={(e) => setEmailFilter(e.target.value)}>{["all", "queued", "submitted", "sending", "unknown", "cancelled"].map((s) => <option key={s}>{s}</option>)}</select>
        {!state.emails.length && <Empty text="No emails yet." />}
        {state.emails.filter((e) => emailFilter === "all" || e.state === emailFilter).map((email) => <details key={email.id} className="rounded-lg border border-border p-4"><summary className="cursor-pointer break-words text-sm"><span className="font-mono text-xs text-primary">[{email.state.toUpperCase()}]</span> {email.subject} · {email.recipient}</summary><div className="mt-4 space-y-3"><p className="font-mono text-xs text-muted-foreground">{new Date(email.created_at).toLocaleString()}</p><p className="whitespace-pre-wrap break-words text-sm">{email.body}</p>{(email.detail || email.message_id) && <p className="break-all font-mono text-xs text-muted-foreground">{email.detail || email.message_id}</p>}{email.state === "queued" && <Button variant="outline" className={button} disabled={busy} onClick={() => setConfirmation({ title: `Send to ${email.recipient}?`, description: email.subject, run: () => sendQueue([email.id]) })}>SEND QUEUED EMAIL</Button>}</div></details>)}
      </Card>
    </div>}

    {tab === "activity" && <Card className={panel}><h2 className="font-display text-xl">Organizer activity_</h2><p className="text-sm text-muted-foreground">Latest 100 organizer actions. Team changes and decisions are recorded with the organizer’s account ID.</p>{!state.events.length && <Empty text="No organizer actions recorded yet." />}{state.events.map((event) => <details key={event.id} className="rounded-lg border border-border p-4"><summary className="cursor-pointer font-mono text-xs">{event.action.replaceAll("_", " ").toUpperCase()} · {new Date(event.created_at).toLocaleString()}</summary><p className="mt-3 break-all text-xs text-muted-foreground">Organizer: {event.actor}</p><pre className="mt-3 whitespace-pre-wrap break-all text-xs">{JSON.stringify(event.data, null, 2)}</pre></details>)}</Card>}

    {(status || busy) && <div role="status" aria-live="polite" className="sticky bottom-4 z-20 rounded-lg border border-primary/25 bg-card/95 p-4 shadow-lg backdrop-blur"><StatusLine status={status || { kind: "ok", text: "Working… Keep this page open while messages are processed." }} />{busy && <p className="mt-2 font-mono text-xs text-muted-foreground">PROCESSING…</p>}</div>}
    <AlertDialog open={!!confirmation} onOpenChange={(open) => { if (!open) setConfirmation(null) }}><AlertDialogContent className="border-primary/25 font-sans"><AlertDialogHeader><AlertDialogTitle className="font-display">{confirmation?.title}</AlertDialogTitle><AlertDialogDescription>{confirmation?.description}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>CANCEL</AlertDialogCancel><AlertDialogAction onClick={() => { const pending = confirmation; setConfirmation(null); if (pending) void run(pending.run) }}>CONFIRM</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </div>
}

function Empty({ text }: { text: string }) { return <p className="rounded-lg border border-dashed border-border p-8 text-center font-mono text-sm text-muted-foreground">{text}</p> }

function ApplicationCard({ application: r, selected, busy, onSelect, onDecision }: { application: Application; selected: boolean; busy: boolean; onSelect: (checked: boolean) => void; onDecision: (status: AdmissionStatus) => void }) {
  const [decision, setDecision] = useState(r.status)
  useEffect(() => setDecision(r.status), [r.status])
  return <article className="space-y-4 rounded-xl border border-border bg-background p-5">
    <div className="flex flex-wrap justify-between gap-3"><label className="flex items-center gap-3 font-display text-sm"><input aria-label={`Select ${r.name}`} type="checkbox" className="size-4 accent-primary" checked={selected} disabled={busy} onChange={(e) => onSelect(e.target.checked)} />{r.name}</label><span className="font-mono text-xs uppercase text-primary">{r.status}</span></div>
    <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">{[["Login email", r.login_email], ["Student email", r.student_email], ["Institution", r.institution], ["Student number", r.student_number], ["Discord", r.discord_username], ["Team", r.team_name || "No team"], ["Photo consent", r.photo_consent === null ? "Not answered" : r.photo_consent ? "Yes" : "No — do not photograph"]].map(([label, value]) => <div key={label}><dt className="font-mono text-[11px] uppercase text-muted-foreground">{label}</dt><dd className="mt-1 break-words">{value}</dd></div>)}</dl>
    <div className="flex flex-wrap gap-3"><select key={r.status} defaultValue={r.status} aria-label={`Decision for ${r.name}`} className={control} disabled={busy} onChange={(e) => setDecision(e.target.value as AdmissionStatus)}>{admissionStatuses.map((s) => <option key={s}>{s}</option>)}</select><Button variant="outline" className={button} disabled={busy} onClick={() => onDecision(decision)}>SAVE STATUS</Button></div>
  </article>
}

function TeamCreate({ registrations, busy, onCreate }: { registrations: Application[]; busy: boolean; onCreate: (name: string, user: string) => void }) {
  return <form className="grid items-end gap-3 border-t border-border pt-5 sm:grid-cols-3" onSubmit={(e) => { e.preventDefault(); const data = new FormData(e.currentTarget); onCreate(String(data.get("name")), String(data.get("user_id"))) }}><label className="space-y-2 text-sm">New team name<TerminalInput name="name" maxLength={80} required disabled={busy} /></label><label className="flex flex-col gap-2 text-sm">Captain<select name="user_id" required className={control} disabled={busy} defaultValue=""><option value="" disabled>Choose an unassigned participant</option>{registrations.filter((r) => !r.team_id && r.photo_consent !== null).map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select></label><Button className={button} disabled={busy}>CREATE TEAM</Button></form>
}

function TeamEditor({ team, registrations, maxSize, busy, confirm }: { team: OrganizerTeam; registrations: Application[]; maxSize: number; busy: boolean; confirm: (title: string, description: string, action: OrganizerAction, data: Record<string, unknown>) => void }) {
  const members = registrations.filter((r) => r.team_id === team.id)
  const eligible = registrations.filter((r) => r.team_id !== team.id && r.photo_consent !== null)
  return <Card className={panel}>
    <div className="flex flex-wrap justify-between gap-3"><h3 className="font-display text-xl">{team.name}</h3><span className="font-mono text-xs text-primary">{members.length}/{maxSize} MEMBERS</span></div>
    <p className="font-mono text-xs text-muted-foreground">Invitation: {team.invite_code}</p>
    <ul className="space-y-3">{members.map((r) => <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-4"><div className="space-y-1"><p className="text-sm">{r.name} {r.id === team.captain_id && <span className="font-mono text-xs text-primary">[CAPTAIN]</span>}</p><p className="font-mono text-xs text-muted-foreground">{r.status} · @{r.discord_username}</p></div><div className="flex flex-wrap gap-2">{r.id !== team.captain_id && <Button variant="outline" className={button} disabled={busy} onClick={() => confirm(`Make ${r.name} captain?`, "The current captain becomes a regular member.", "team_transfer", { team_id: team.id, user_id: r.id })}>MAKE CAPTAIN</Button>}<Button variant="outline" className={`${button} text-rose-400`} disabled={busy || (r.id === team.captain_id && members.length > 1)} onClick={() => confirm(`Remove ${r.name} from ${team.name}?`, members.length === 1 ? "The empty team will be deleted. Their application is kept." : "The invitation will be regenerated. Their application is kept.", "team_remove", { team_id: team.id, user_id: r.id })}>REMOVE</Button></div></li>)}</ul>
    <form className="flex flex-col gap-3 sm:flex-row" onSubmit={(e) => { e.preventDefault(); const data = new FormData(e.currentTarget); const user_id = String(data.get("user_id")); const participant = registrations.find((r) => r.id === user_id); confirm(`Assign ${participant?.name} to ${team.name}?`, participant?.team_id ? `They will leave ${participant.team_name}. Their old invitation will be regenerated; an empty former team is deleted. Captains with teammates must transfer captaincy first.` : "They will join this team. Team capacity is checked before saving.", "team_assign", { team_id: team.id, user_id }) }}><select name="user_id" aria-label={`Add or move a participant to ${team.name}`} required defaultValue="" className={`${control} min-w-0 flex-1`} disabled={busy || members.length >= maxSize}><option value="" disabled>Choose participant to add or move</option>{eligible.map((r) => <option key={r.id} value={r.id}>{r.name} — {r.team_name || "No team"}</option>)}</select><Button className={button} disabled={busy || members.length >= maxSize || !eligible.length}>ADD / MOVE MEMBER</Button></form>
    <form className="flex flex-col gap-3 sm:flex-row" onSubmit={(e) => { e.preventDefault(); const name = String(new FormData(e.currentTarget).get("name")); confirm(`Rename ${team.name}?`, `New name: ${name}`, "team_rename", { team_id: team.id, name }) }}><TerminalInput key={team.name} name="name" aria-label={`Rename ${team.name}`} defaultValue={team.name} required maxLength={80} disabled={busy} /><Button variant="outline" className={button} disabled={busy}>RENAME</Button></form>
    <div className="flex flex-wrap gap-3"><Button variant="outline" className={button} disabled={busy} onClick={() => confirm(`Regenerate ${team.name}’s invitation?`, "The existing invitation code and link will stop working.", "team_rotate", { team_id: team.id })}>REGENERATE INVITATION</Button><Button variant="outline" className={`${button} text-rose-400`} disabled={busy} onClick={() => confirm(`Disband ${team.name}?`, `All ${members.length} members will become unassigned. Applications and admission decisions are kept. This team and its invitation will be deleted.`, "team_delete", { team_id: team.id })}>DISBAND TEAM</Button></div>
  </Card>
}
