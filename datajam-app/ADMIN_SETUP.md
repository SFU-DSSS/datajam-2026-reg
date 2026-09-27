# Organizer dashboard

Use the existing Supabase login. Organizer accounts are explicitly granted access in the database; no shared admin password or service-role key is used by the app.

## Enable it

1. Apply `supabase/003_admin.sql` in the Supabase SQL editor after migrations 001 and 002.
2. Create and verify your organizer account through the app.
3. In the SQL editor, grant that account access (replace the example address):

```sql
insert into registration_private.admins(user_id)
select id from auth.users
where lower(email) = lower('organizer@example.com') and email_confirmed_at is not null
on conflict do nothing;
```

4. Set `BREVO_API_KEY`, `BREVO_SENDER_EMAIL`, and optionally `BREVO_SENDER_NAME` / `BREVO_REPLY_TO` in the server environment. See [Brevo setup](BREVO_SETUP.md). Redeploy after adding environment variables.
5. Log in and select **Organizer dashboard**. Organizers do not need a participant profile to use it.

Revoke access by deleting the user's row from `registration_private.admins` in the SQL editor. Normal users can see the dashboard button, but requests for organizer data and actions are denied by the database.

## Workflow

- Search registrations by name, email, institution or team; filter by admission status. A registration means a saved student profile, not an account with no profile yet.
- Set each participant to pending, accepted, waitlisted or rejected. Team membership remains separate from individual admission decisions. Photo consent is displayed but does not control acceptance.
- Accepting a participant queues and attempts one acceptance email automatically. The template is defined in migration 003. Repeating acceptance does not resend a processed email, even after changing the status away and back. Changing away from accepted cancels an unsent queued acceptance email; accepting again requeues it. Other status changes do not send emails.
- Select participants individually or select all visible search results. Preview a custom email and confirm sending. Emails go separately to verified **login addresses**, not unverified student addresses. Selection persists across filtering; the preview lists every recipient.
- History shows the latest 200 email records. `queued` can be sent from the dashboard once Brevo is configured. `submitted` means accepted by Brevo, not delivered. For `sending` or `unknown`, inspect Brevo transactional logs before composing a replacement; these records are deliberately not automatically retried.

The dashboard sends sequentially while the browser stays open. It is suitable for event-scale organizer mail, not unattended large campaigns. An interrupted batch can be retried from the same preview with the same request IDs; after reloading, inspect history before composing again. There is no scheduled background worker or delivery webhook yet. A saved acceptance decision remains saved if sending fails.

Use Brevo campaigns for opt-in newsletters and promotional mail. Keep registration decisions in this app as the source of truth.

The current dashboard reviews registrations and teams, changes admission status, and sends email. It does not delete accounts or alter participant profiles/team memberships. Admin grants are deliberately kept outside the public API.

## API

`POST /api/admin` uses the existing bearer session token and `{action, data}` format. Actions: `access`, `list`, `decision` (`user_id`, `status`), `compose` (stable UUID `id`, `user_id`, `subject`, `text`), and `send` (queued email `id`). All data access and mutations use the caller's token through `public.admin_action`; private tables remain inaccessible directly. The API keeps Brevo credentials on the server. Internal `claim` / `finish` RPC actions are restricted to organizers too.
