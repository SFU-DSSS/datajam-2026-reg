# Organizer dashboard

Use the existing Supabase login. Organizer accounts are explicitly granted access in the database; no shared admin password or service-role key is used by the app.

## Enable it

1. Apply `supabase/003_admin.sql` and `supabase/004_organizer_tools.sql` in that order after migrations 001 and 002. Apply each migration once.
2. Create and verify your organizer account through the app.
3. In the SQL editor, grant that account access (replace the example address):

```sql
insert into registration_private.admins(user_id)
select id from auth.users
where lower(email) = lower('organizer@example.com') and email_confirmed_at is not null
on conflict do nothing;
```

4. Set `BREVO_API_KEY`, `BREVO_SENDER_EMAIL`, and optionally `BREVO_SENDER_NAME` / `BREVO_REPLY_TO` in the server environment. See [Brevo setup](BREVO_SETUP.md). Redeploy after adding environment variables.
5. Log in to the styled frontend and select **Organizer dashboard**, or open `/dashboard/organizer`. Organizers do not need a participant profile to use it.

Revoke access by deleting the user's row from `registration_private.admins` in the SQL editor. The styled frontend only shows the organizer link to organizers. Visiting the URL directly as a participant does not grant access: the database authorizes every read and mutation.

## Workflow

- Search registrations by name, email, institution or team; filter by admission status. A registration means a saved student profile, not an account with no profile yet.
- Set each participant to pending, accepted, waitlisted or rejected. Team membership remains separate from individual admission decisions. Photo consent is displayed but does not control acceptance.
- **Accept all pending** confirms the number of pending applications across all filters. The database checks the count again and accepts the pending group in one transaction. It leaves accepted, rejected and waitlisted applications unchanged. Acceptance emails are durably queued before sending begins; if you close the page, use **Send queued** to finish.
- Accepting a participant queues and attempts one acceptance email automatically. The template is defined in migration 003. Repeating acceptance does not resend a processed email, even after changing the status away and back. Changing away from accepted cancels an unsent queued acceptance email; accepting again requeues it. Other status changes do not send emails.
- Select participants individually or select all visible search results. Preview a custom email and confirm sending. Emails go separately to verified **login addresses**, not unverified student addresses. Selection persists across filtering; the preview lists every recipient.
- History shows the latest 200 email records. `queued` can be sent from the dashboard once Brevo is configured. `submitted` means accepted by Brevo, not delivered. For `sending` or `unknown`, inspect Brevo transactional logs before composing a replacement; these records are deliberately not automatically retried.

The dashboard sends sequentially while the browser stays open. It is suitable for event-scale organizer mail, not unattended large campaigns. An interrupted batch can be retried from the same preview with the same request IDs; after reloading, inspect history before composing again. There is no scheduled background worker or delivery webhook yet. A saved acceptance decision remains saved if sending fails.

Use Brevo campaigns for opt-in newsletters and promotional mail. Keep registration decisions in this app as the source of truth.

The **Teams** section shows rosters and captains. Organizers can create a team with an unassigned captain, rename, regenerate invitations, transfer captaincy, add or move participants, remove members, and disband a team. The database enforces capacity, one team per participant, and an answered photo preference (yes or no). Transfer captaincy before moving/removing a captain who still has teammates. Moving/removing a member rotates the old team's invitation; an empty team is deleted. Disbanding preserves participant profiles and admission decisions.

The **Activity** section shows the latest 100 organizer mutations with the actor's account ID. It is not an email delivery log; use Email history and Brevo for that. Organizers cannot change someone else's profile or photo preference, delete accounts, or grant organizer access through this UI.

## API

`POST /api/admin` uses the existing bearer session token and `{action, data}` format. Actions: `access`, `list`, `decision` (`user_id`, `status`), `compose` (stable UUID `id`, `user_id`, `subject`, `text`), and `send` (queued email `id`). All data access and mutations use the caller's token through `public.admin_action`; private tables remain inaccessible directly. The API keeps Brevo credentials on the server. Internal `claim` / `finish` RPC actions are restricted to organizers too.

Migration 004 adds:

| Action | Data | Result / behavior |
| --- | --- | --- |
| `accept_all` | `expected_count` | Accepts pending applications; returns `accepted_count` and queued `email_ids`. Call `send` for each ID. |
| `team_create` | `name`, `user_id` | Creates a team with the selected unassigned captain. |
| `team_rename` | `team_id`, `name` | Renames the team. |
| `team_rotate` | `team_id` | Regenerates the invitation. |
| `team_assign` | `team_id`, `user_id` | Adds/moves a participant atomically. |
| `team_remove` | `team_id`, `user_id` | Removes a member; checks captain rules. |
| `team_transfer` | `team_id`, `user_id` | Chooses an existing member as captain. |
| `team_delete` | `team_id` | Disbands the team, keeping applications. |

`list` additionally returns `teams`, `max_team_size`, `events`, and all `queued_emails` IDs (including records older than the 200-message history window). The Next.js frontend proxies both `/api/action` and `/api/admin` using `DATAJAM_API_URL`.
