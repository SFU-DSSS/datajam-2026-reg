# Publishing DataJam 2026

This guide is for the completed registration portal in this repository. Follow it when you are ready to publish; editing code locally does not create any of these services automatically.

## 1. What you will publish

There are two applications in one Git repository and one shared database/authentication project:

| Component | Folder / service | Purpose |
| --- | --- | --- |
| Participant and organizer website | `v0_hackml-portal-main` → Vercel frontend project | The designed website, registration, teams, organizer dashboard, and password forms |
| API backend | `datajam-app` → Vercel backend project | Registration and organizer requests; sends organizer emails through Brevo |
| Database and accounts | One Supabase project | Profiles, teams, decisions, email history, organizer permissions, and login |
| Email | Brevo | SMTP for account emails; API for acceptance emails and organizer messages |
| CAPTCHA | Cloudflare Turnstile | Signup, login, and password reset protection |

Participants visit the frontend URL. The frontend forwards `/api/action` and `/api/admin` to the backend. Both applications must use the **same Supabase project**. You do not need to copy files between the folders.

The backend's root page is an older plain test interface. Seeing that page at the backend URL is expected; share the frontend URL with attendees.

Keep these three values in your own setup notes as you create them:

```text
SUPABASE_PROJECT_URL = https://your-project.supabase.co
BACKEND_URL = https://your-backend.vercel.app
FRONTEND_URL = https://your-portal.vercel.app
```

The examples below are placeholders, not working URLs.

## 2. Prepare the repository

Use Node.js 22 for both folders. From the repository root, run each command separately:

```bash
cd datajam-app
npm ci
npm test
npm run build
cd ../v0_hackml-portal-main
npm ci
npm run typecheck
npm run build
cd ..
git status
```

Review and commit the finished code, including `package-lock.json` in each application. Push the commit to `master` when you want Vercel to build it. Do not commit `.env.local` or email credentials. Once connected, production deployments can be triggered by pushes to the production branch.

## 3. Create the Supabase project and database

Create a new Supabase project for DataJam. Keep its database password in your password manager; the application does not need that password.

In the project's SQL Editor, create a query, paste the entire contents of each file below, and run it. Run them in this order, one file at a time:

1. `datajam-app/supabase/001_registration.sql`
2. `datajam-app/supabase/002_photo_consent.sql`
3. `datajam-app/supabase/003_admin.sql`
4. `datajam-app/supabase/004_organizer_tools.sql`

Wait for success before continuing. These are one-time migrations; if you are returning to an existing setup, run only the unapplied files. Do not run the old SQL scripts in `v0_hackml-portal-main/scripts/`; they belong to the earlier example app.

The private `registration_private` schema contains the tables. Leave it out of exposed API schemas. The application uses permission-checking functions in `public`; it does not need direct table access.

Copy the project URL and **publishable key** (or legacy `anon` key) from the project's API settings. The variables named `ANON_KEY` accept that public client key. Do not use the service-role or secret key in either application's configuration.

In Authentication settings, enable email/password signup, require email confirmation, and set a minimum password length of at least eight. An unverified login cannot submit a registration or use organizer tools.

## 4. Configure email

Set up Brevo and verify the sender address/domain you intend to use. There are two distinct connections:

| Connection | Where the credential goes | What it sends |
| --- | --- | --- |
| Brevo SMTP | Supabase Authentication SMTP settings | Signup confirmation and password resets |
| Brevo API key | Backend Vercel environment only | Acceptance emails and custom dashboard messages |

For SMTP, use the SMTP login and SMTP key displayed in Brevo, with host `smtp-relay.brevo.com` and port `587`. An SMTP key is different from an API key. See [Brevo's SMTP instructions](https://help.brevo.com/hc/en-us/articles/7924908994450-Send-transactional-emails-using-Brevo-SMTP).

Configure custom SMTP in Supabase before testing with attendees' addresses. Supabase's default sender is restricted and is unsuitable for general registration. See [Supabase's SMTP documentation](https://supabase.com/docs/guides/auth/auth-smtp).

The repository has a more detailed provider walkthrough at [datajam-app/BREVO_SETUP.md](datajam-app/BREVO_SETUP.md). Complete the sender verification and delivery test there. Keep the default Supabase confirmation/reset links unless you deliberately customize the templates; the app expects a confirmation code at its callback route.

## 5. Create the backend Vercel project

Import this Git repository into Vercel as a project, for example `datajam-2026-api`. Configure:

| Setting | Value |
| --- | --- |
| Root Directory | `datajam-app` |
| Framework Preset | Other |
| Node.js | 22.x |
| Install Command | `npm ci` |
| Build Command | `npm run build` |
| Output Directory | `public` |
| Production Branch | `master` |

The checked-in `vercel.json` supplies the backend build/output configuration. Vercel serves the files and runs `api/action.js`, `api/admin.js`, and `api/config.js` as functions; you do not run `server.js` in production.

Add these environment variables for Production:

| Name | Value |
| --- | --- |
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_ANON_KEY` | That project's publishable/anon key |
| `BREVO_API_KEY` | Brevo API key for transactional email |
| `BREVO_SENDER_EMAIL` | Verified sending address |
| `BREVO_SENDER_NAME` | e.g. `DataJam 2026` |
| `BREVO_REPLY_TO` | Optional monitored organizer address |
| `TURNSTILE_SITE_KEY` | Public Turnstile site key, when configured below |

Leave `ALLOWED_ORIGINS` empty for the current Next.js proxy setup. The browser calls its own frontend origin; the frontend forwards requests to the backend.

Deploy and record the stable production backend URL. It must be reachable by the frontend without a Vercel login/interstitial. App APIs still require valid Supabase bearer tokens and database permissions.

You can open `BACKEND_URL/api/config` to confirm the backend sees its public settings. This endpoint intentionally returns public configuration; it does not test database migrations or email delivery.

## 6. Create the frontend Vercel project

Import the **same repository again** as another project, for example `datajam-2026-portal`. Vercel supports separate projects with different root folders in the same repository. See [Vercel's monorepo guide](https://vercel.com/docs/monorepos).

Configure:

| Setting | Value |
| --- | --- |
| Root Directory | `v0_hackml-portal-main` |
| Framework Preset | Next.js |
| Node.js | 22.x |
| Install Command | `npm ci` |
| Build Command | `npm run build` |
| Output Directory | Leave Next.js default |
| Production Branch | `master` |

Add:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_PUBLIC_CLIENT_KEY
DATAJAM_API_URL=https://YOUR_BACKEND.vercel.app
NEXT_PUBLIC_TURNSTILE_SITE_KEY=YOUR_PUBLIC_TURNSTILE_SITE_KEY
```

`DATAJAM_API_URL` is just the backend origin: no `/api/action` suffix. Its Supabase URL/key must match the backend's. Brevo keys do not belong in this project. Deploy and record the stable frontend URL.

Save environment changes and redeploy the affected project. Public frontend settings are included in the frontend build. See [Vercel environment variables](https://vercel.com/docs/environment-variables).

## 7. Connect confirmation links, password recovery, and CAPTCHA

In Supabase Authentication URL Configuration, set Site URL to the frontend origin, and add these allowed redirect URLs with your real frontend hostname:

```text
https://YOUR_FRONTEND.vercel.app/auth/callback
https://YOUR_FRONTEND.vercel.app/auth/callback?next=/auth/reset-password
```

Signup confirmation returns to `/auth/callback`, which exchanges the code for a session and opens `/dashboard`. Password recovery uses the same callback with a fixed destination of `/auth/reset-password`. Open these emails in the same browser used to make the request: the PKCE flow uses a browser-held verifier. If you open an expired link or use another browser, request a new link in the browser you intend to use. This flow follows [Supabase's server-side authentication model](https://supabase.com/docs/guides/auth/server-side/advanced-guide).

Create a Cloudflare Turnstile widget. Add the frontend hostname to its allowed hostnames. If you also use the backend's test page, allow the backend hostname too. Copy the public site key into both relevant Vercel environment variables from steps 5–6.

Enable Turnstile in Supabase Authentication's CAPTCHA/bot protection settings and enter the widget's **secret** there. The secret does not go into frontend environment variables. Supabase must enforce CAPTCHA as well as the website displaying it. See [Supabase CAPTCHA setup](https://supabase.com/docs/guides/auth/auth-captcha).

Redeploy after changing the site keys. Signup, login, and reset requests each require a fresh CAPTCHA token when enabled.

## 8. Grant yourself organizer access

On the frontend, create your own account and verify its email. You do not need to submit a participant profile to manage the event.

In Supabase SQL Editor, replace the example login email and run:

```sql
insert into registration_private.admins(user_id)
select id from auth.users
where lower(email) = lower('YOUR_ORGANIZER_LOGIN_EMAIL')
  and email_confirmed_at is not null
on conflict do nothing;
```

Check that the account was added:

```sql
select u.email
from registration_private.admins a
join auth.users u on u.id = a.user_id;
```

Refresh your registration dashboard. The **Organizer dashboard** button should appear. You can also open `FRONTEND_URL/dashboard/organizer` directly.

Only grant access to people who should see participant email addresses, student numbers, photo preferences, and team information. Organizer access is assigned in the database, not by a hidden password or an email-domain rule. Revoke one account with:

```sql
delete from registration_private.admins
where user_id in (
  select id from auth.users where lower(email) = lower('FORMER_ORGANIZER_EMAIL')
);
```

## 9. Use the dashboard

**Applications:** Saved profiles count as applications. An account without a saved profile does not appear yet. Search and filter by pending, accepted, rejected, or waitlisted. The status cards show totals. Individual acceptance queues and attempts an acceptance email once per participant. Other status changes do not email automatically.

**Accept all pending:** The confirmation shows the pending count across all search filters. Existing accepted/rejected/waitlisted applications are unaffected. Acceptance decisions and emails are stored before delivery begins. Keep the page open while sending. If interrupted, inspect Email history and use Send queued. Do not create a replacement acceptance message just because the page closed.

**Email:** Select people in Applications, then choose Email selected. Selection persists across filters, and the preview lists the full recipient group. Enter the subject and reminder/message, preview it, and confirm. Each person receives a separate message at their login email; their unverified student email is not used for delivery.

**Email history:** Queued messages can be sent later. Submitted means Brevo accepted the send, not that it reached the inbox. Sending or unknown requires checking Brevo logs before sending a replacement. The dashboard does not schedule reminders for a future time or run a background sending job. It sends when an organizer confirms, while the page stays open. The history displays the latest 200 messages; Send queued includes older queued records too.

**Teams:** See membership and captains, create/rename teams, assign or move participants, transfer captaincy, remove members, regenerate invitations, or disband a team. A captain with teammates must transfer captaincy before being moved/removed. Team size and one-team membership are enforced in the database. Photo opt-out does not prevent joining a team. Disbanding does not delete applications.

**Activity:** The latest 100 organizer actions include the organizer's account ID. Participant profile and photo-consent edits remain under each participant's control.

## 10. Test before sharing the link

Use two attendee accounts in separate browser profiles plus your organizer account. Send test messages only to addresses you control.

1. Sign up, complete CAPTCHA, receive the verification email, and follow it back to the dashboard.
2. Save a participant profile with photo consent set to **No**. Confirm registration and team creation work.
3. Edit the profile, change consent to **Yes**, refresh, and check that the new value persists.
4. Create a team; invite the second account with the link. Confirm onboarding preserves the invitation and joining requires a deliberate action.
5. Check that normal members cannot use captain controls or open the organizer dashboard. Teammates must not see student numbers, email addresses, or photo preferences in the roster.
6. Use captain controls to rename, rotate invitations, transfer captaincy, remove a member, and leave. An old invitation must stop working after rotation/removal.
7. As organizer, search/filter applications and change one decision to accepted. Check the participant dashboard and verify the acceptance email in the real inbox.
8. Test accept-all using only test applications. Confirm rejected/waitlisted records remain unchanged.
9. Preview and send a reminder to your selected test addresses. Confirm there are separate messages and the content matches the preview.
10. Test team edits and confirm their results in the participant accounts after refreshing.
11. Sign out, request a password reset, follow the email in the same browser, save a new password, and sign in with it.
12. Repeat key flows on a phone. Verify production URLs, not only local or Vercel preview URLs.

Automated checks can also be run from `datajam-app` with Node 22 and Google Chrome installed:

```bash
npm run test:browser
npm run test:portal
```

Install dependencies in both folders before `test:portal`. These tests use fixture authentication, local database functions, and no real email transport. They do not replace testing Supabase, Brevo, CAPTCHA, and production routing together.

## 11. Add your domain and publish the link

Add your chosen domain to the **frontend** Vercel project and follow the DNS records Vercel provides for that exact domain. Do not copy a guessed DNS target from an older guide.

After the domain works, update Supabase's Site URL and callback allowlist to the new origin, add its hostname in Turnstile, and test signup/reset emails again. Share this frontend URL. The backend can keep its Vercel URL.

Keep production and experimental preview environments separate when using real participant data. If you enable Preview deployments, configure their environment variables deliberately; they are separate from Production. A separate test Supabase project and controlled email recipients are useful for testing later changes.

## 12. Common problems

| Symptom | Check |
| --- | --- |
| Backend is not configured | Backend `SUPABASE_URL` and `SUPABASE_ANON_KEY`; redeploy after setting them |
| Registration backend is not configured | Frontend `DATAJAM_API_URL`; redeploy |
| HTML/error page instead of API data | Backend URL points at the API project and is reachable without deployment protection |
| Login works but registration fails | Both projects use the same Supabase project; migrations 001–004 succeeded |
| Organizer tools need latest migration | Apply 004 after 003, once |
| Organizer access required | Verified login email matches the account granted in `registration_private.admins` |
| No confirmation/reset email | Supabase SMTP credentials, Brevo verified sender/logs, spam folder, rate limits |
| CAPTCHA rejected | Matching Turnstile keys, Supabase enforcement, allowed hostname, fresh token |
| Callback fails | Exact allowed URL, same browser, unexpired link; request a fresh link |
| Email remains queued | Backend Brevo API variables and sender; redeploy, then Send queued |
| Email state unknown/sending | Inspect Brevo transactional logs before composing again |
| Team edit rejected | Capacity, current membership, profile completion, or captain transfer requirement |
| Build fails under an old Node version | Use Node 22; reinstall with `npm ci` under that version |

Later database changes should be new migrations, applied before deploying code that depends on them. Rolling back a Vercel deployment does not undo database migrations or emails already sent.
