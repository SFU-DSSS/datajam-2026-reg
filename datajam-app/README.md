# DataJam registration

Self-contained backend and plain HTML/CSS/JavaScript test frontend. Deploy this folder as a Vercel project, backed by a **new Supabase project**. The original example app is not modified.

## Features

- Email/password authentication, login-email verification, logout, password recovery, and Cloudflare Turnstile integration.
- Required name, institution, student number, student email, and Discord username. Student email is collected, not verified, and may differ from login email.
- Required yes/no photo-consent choice, with no preselected answer. Opting out does not prevent participation. Participants can update their preference in their profile; only they and database administrators can see it.
- One team per participant, profile required before joining/creating, configurable capacity (default four).
- Create team, join with a 12-character code or link, roster, copy invitation, leave team.
- Captain can rename, remove members, regenerate invitations, and transfer captaincy.
- Removing a member regenerates the code/link. Members can still share the new invitation; removal is not a permanent ban.
- Captain must transfer before leaving a populated team. Last member leaving deletes the team.
- No service-role/admin key in the app. Profile privacy and all team rules are enforced in PostgreSQL, not just the interface.

## 1. Set up Supabase

**Email quick start:** follow [Brevo setup](BREVO_SETUP.md). Supabase Free supports this setup. Signup verification and password resets use Brevo through Supabase SMTP; a private organizer command handles additional event emails.

1. Create a **new Supabase project**. Do not apply this migration over the example app's database.
2. Open SQL Editor and execute [`supabase/001_registration.sql`](supabase/001_registration.sql) once, then [`supabase/002_photo_consent.sql`](supabase/002_photo_consent.sql) once. This creates private tables and one authenticated public function, then adds photo consent. Keep `registration_private` out of the exposed API schemas. **If you already ran 001, run only 002** before deploying the updated app; do not recreate the database.
3. In Authentication, enable email/password signup and **Confirm email**. Set minimum password length to at least eight.
4. Configure your Site URL and allowed redirect URLs. For local testing add `http://localhost:3000/`. After deploying, add `https://YOUR-PROJECT.vercel.app/` and update Site URL. Add your custom domain later if applicable.
5. [Connect Brevo SMTP](BREVO_SETUP.md#1-connect-brevo-to-supabase-required). The guide includes the exact host, port, credential fields, and delivery test. Supabase's default email sender has restricted delivery and quotas; configure Brevo before inviting attendees.
6. Create a Cloudflare Turnstile widget. Allow your Vercel/custom domains and your development hostname. In Supabase Authentication's bot protection settings, enable Turnstile and enter its **secret key**. The app receives only its **site key**.
7. Copy the project URL and publishable key (legacy `anon` key also works) from Supabase project settings. **Never use a service-role or secret key** for `SUPABASE_ANON_KEY`.

For isolated local testing, you may leave `TURNSTILE_SITE_KEY` empty and disable CAPTCHA in your test Supabase project. Before public registration, configure both the widget AND Supabase's enforcement. Adding a widget alone does not protect direct Auth requests.

## 2. Run locally

Use Node.js **22** (also pinned for Vercel):

```sh
cd datajam-app
npm ci
cp .env.example .env.local
# Fill in .env.local with your Supabase URL, public key, and CAPTCHA site key.
npm run dev
```

Open **http://localhost:3000**. `npm run dev` bundles the frontend and starts a small local server using the same API handlers as Vercel. Restart after source changes. You do not need the Vercel CLI to test locally.

The page shows a setup error until you provide working environment variables. This is a real backend, not a fake in-memory registration demo: email/password tests require your Supabase configuration.

## 3. Deploy on Vercel

1. Push the repository to your Git provider and import it into Vercel (or deploy this folder with the Vercel CLI).
2. Set **Root Directory** to `datajam-app` if importing this whole repository. If uploading only this folder as its own repo, use that repo's root.
3. Choose **Other** for Framework Preset, Node.js **22.x**, build command **`npm run build`**, output directory **`public`**, and install command **`npm ci`**. `vercel.json` contains the build/output settings.
4. Add `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `TURNSTILE_SITE_KEY`, and (if needed) `ALLOWED_ORIGINS` from `.env.example` to Vercel's environment settings. The optional `BREVO_*` variables are only needed locally for the organizer email command. Supabase SMTP credentials belong in the Supabase dashboard. Keep `.env.local` out of Git.
5. Deploy, then configure that exact deployed URL in Supabase redirect URLs and Turnstile allowed hostnames. Redeploy if environment variables change.

Vercel runs `api/config.js` and `api/action.js` as Node functions and serves `public/` as static files. Supabase hosts the persistent database and authentication. Nothing is stored on Vercel's temporary filesystem.

## Photo consent for organizers

Apply `002_photo_consent.sql` before deploying this frontend. Existing profiles keep their information and team membership, with an unanswered (`null`) preference until they save an explicit choice. New profile saves require a JSON boolean; both yes and no allow creating/joining teams. Existing team members can still manage/leave their team while being prompted to answer.

The profile form asks about event photography and use in event recaps/promotion on the website and social media. Review this wording before opening registration so it matches your intended use. Preferences are not shown to teammates. The timestamp records when the current answer was saved/changed, not a full history.

In Supabase **SQL Editor**, run this as the project administrator to get a check-in list (export the result as CSV if needed):

```sql
select p.name, p.student_email, t.name as team,
  case p.photo_consent
    when true then 'Yes'
    when false then 'No - do not photograph'
    else 'Not answered - ask before photographing'
  end as photo_preference,
  p.photo_consent_updated_at
from registration_private.profiles p
left join registration_private.members m on m.user_id = p.id
left join registration_private.teams t on t.id = m.team_id
order by p.photo_consent nulls first, p.name;
```

For only opt-outs and unanswered preferences, add `where p.photo_consent is not true` before `order by`. Treat unanswered preferences as no permission until confirmed. Refresh the list before the event, agree on a check-in method to identify opt-outs, and brief photographers. The form records preferences; organizers must put them into practice. Keep exports restricted to organizers who need them.

## Team size

Run in Supabase SQL Editor:

```sql
update registration_private.settings set max_team_size = 3 where id;
-- Use 4 instead to restore four-person teams.
```

Existing teams are never silently shrunk. If the limit drops below a current team's size, it remains intact but cannot accept another member. Decide the final limit before opening registration.

## Connect the Figma-generated frontend

See [`API.md`](API.md). Keep the backend project deployed. The frontend should use Supabase JS for authentication, then call the Vercel API with the logged-in user's access token. Do not query private tables or attempt to reproduce team permissions in browser code.

If the frontend is hosted separately, add its exact origin to Vercel's `ALLOWED_ORIGINS` (comma-separated), add its authentication return URL to Supabase, and allow its hostname in Turnstile. Supply the public Supabase configuration through the frontend's own environment settings. The demo uses same-origin `/api/action`; replace that with the backend URL in the generated frontend.

## Testing

```sh
npm test
npm run build
```

With Google Chrome already installed, also run `npm run test:browser`. This uses your installed Chrome (no Chromium download), real database functions in PGlite, and fixture Auth responses to exercise the HTML flow. Set `CHROME_PATH` if Chrome is installed in a nonstandard location. It does not contact a live Supabase project or send email.

The automated tests execute the actual SQL migration/functions in PGlite (embedded PostgreSQL), with a minimal Supabase Auth identity fixture. They cover profile gating, verified identities, capacity, one-team membership, captain permissions, invitation rotation, private data, rate limits, and API validation. PGlite serializes requests on one connection; the competing-join test verifies outcomes but does not replace a multi-connection test on hosted PostgreSQL. Supabase delivery, CAPTCHA, and production routing require the manual checks below.

### Manual end-to-end check

1. In browser A, create an account, complete CAPTCHA, verify its login email, and log in. Confirm team controls require a profile.
2. Save a profile with a **different student email**. Confirm no email is sent to that address.
3. Create a team. Confirm you are captain and the roster contains you.
4. Open its invitation in browser B/incognito. Register and complete a second profile. Confirm the invitation survives onboarding in that browser, then join explicitly.
5. Confirm B sees the roster but no captain controls. Student numbers and student emails must not appear in the roster.
6. From A rename and regenerate invitations. A third account trying the old code should be rejected.
7. Remove B, confirm B loses access after refresh and the previous code fails. Reinvite B with the new code, then transfer captaincy to B.
8. Confirm A can no longer manage the team. B cannot leave until transferring ownership or removing remaining members.
9. Add accounts up to capacity. Try joining with two additional accounts at nearly the same time; no team should exceed the limit.
10. Leave as ordinary members, then leave as the last member. Confirm the team is deleted and you can create a new one.
11. Log out, request a password reset, follow the email, set a new password, and log in with it.
12. Repeat signup and invitation return on the deployed Vercel URL, including a mobile browser.

An invitation is saved in local storage during onboarding, so verification can return in a new tab in the same browser. If the email is opened in a different browser/device, reopen the original invitation there. Team updates appear after a successful action or page refresh; this tester does not subscribe to realtime updates.

## Design and limits

- Private tables have RLS enabled and no client grants. Only the `registration_action` security-definer function can access them for authenticated callers. It derives identity from `auth.uid()` and checks login-email confirmation.
- Team changes run in one database transaction. A transaction-scoped advisory lock serializes registration operations for this small event app, preventing over-capacity joins and inconsistent captain changes. For substantially larger deployments, replace it with carefully ordered per-user/per-team locks.
- Invalid joins count toward a durable limit of 10 attempts per user per 15 minutes; all writes have a 100-per-15-minute limit. Auth has its own provider-side CAPTCHA/rate limits. These limits are abuse controls, not guarantees about hosting bills.
- Invitation codes contain 48 random bits and are unique in the database; an extremely unlikely collision rejects the operation safely, and the user can retry. Anyone with the current invitation who meets profile/capacity requirements may join.
- Team rosters expose only member IDs, names, and Discord usernames. A user's full profile is returned only to that user. No student-domain allowlist is imposed.
- No organizer dashboard, waitlist, payment, registration deadline, or self-service account deletion is included. Do not delete an Auth user who still belongs to a team; membership/captain references deliberately prevent leaving an inconsistent team.

Provider references: [Vercel Node functions](https://vercel.com/docs/functions/runtimes/node-js), [Supabase CAPTCHA](https://supabase.com/docs/guides/auth/auth-captcha), [Supabase password auth](https://supabase.com/docs/guides/auth/passwords), [custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp).
