# Frontend integration contract

For organizer registration management and email endpoints, see [organizer setup and API](ADMIN_SETUP.md). These use `/api/admin` with the same login session and require an explicit database admin grant. The participant endpoint below remains separate.

## Authentication

Use `@supabase/supabase-js` with the public project URL and publishable/anon key:

```js
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY);
await supabase.auth.signUp({
  email, password,
  options: { captchaToken, emailRedirectTo: FRONTEND_ORIGIN + '/' }
});
await supabase.auth.signInWithPassword({
  email, password, options: { captchaToken }
});
```

Each Auth submission needs a fresh Turnstile token when protection is enabled. Reset the widget after each attempt. Render an email-verification notice after signup; a session is available only after the login email is verified. Handle Supabase's verification/recovery return URL and `PASSWORD_RECOVERY` event. The supplied frontend demonstrates login, signup, recovery, session refresh, and logout.

## Application endpoint

`POST https://BACKEND.vercel.app/api/action`

Headers: `Authorization: Bearer <Supabase access token>` and `Content-Type: application/json`.

```js
const { data: { session } } = await supabase.auth.getSession();
const response = await fetch(BACKEND_ORIGIN + '/api/action', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${session.access_token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ action: 'me', data: {} })
});
const result = await response.json();
if (!response.ok) throw new Error(result.error);
```

| Action | `data` | Rule |
| --- | --- | --- |
| `me` | `{}` | Read own current state |
| `profile` | `{name, institution, student_number, student_email, discord_username, photo_consent}` | Create/update own full profile; consent must be JSON `true` or `false` |
| `create` | `{name}` | Completed profile; no current team |
| `join` | `{code}` | Completed profile; no team; valid invitation; room available |
| `rename` | `{name}` | Captain only |
| `rotate` | `{}` | Captain only; invalidate previous code/link |
| `remove` | `{user_id}` | Captain only; another current member; rotates invitation |
| `transfer` | `{user_id}` | Captain only; another current member |
| `leave` | `{}` | Captain must first transfer if others remain |

Every success returns the complete refreshed state:

```json
{
  "user_id": "uuid",
  "profile": {
    "id": "uuid",
    "name": "Alex Student",
    "institution": "Example University",
    "student_number": "1234567",
    "student_email": "alex@school.example",
    "discord_username": "alex",
    "photo_consent": false,
    "photo_consent_updated_at": "2026-09-26T12:00:00+00:00"
  },
  "team": {
    "id": "team-uuid",
    "name": "Data folks",
    "captain_id": "uuid",
    "invite_code": "a7e1539bc024",
    "members": [{ "id": "uuid", "name": "Alex Student", "discord_username": "alex" }]
  },
  "max_team_size": 4,
  "permissions": { "manage_team": true },
  "next_step": "team_portal"
}
```

`profile` and `team` may be `null`. Route by `next_step`: `complete_profile`, `choose_team`, or `team_portal`. Hide captain controls unless `permissions.manage_team` is true. The backend independently enforces permissions. Retain entered form values when a request fails.

Photo consent requires an explicit yes/no choice with neither preselected. Convert form strings to a JSON boolean before submitting: `false` is a valid opt-out, not a missing answer. See the included profile form for the consent wording. Participants can change their choice by saving their full profile. After migration 002, older profiles have `photo_consent: null` and `next_step: "complete_profile"` until they answer; an existing team is retained. Consent and its server-managed change timestamp are returned only in the caller's own profile, never in team rosters. Do not submit the timestamp. Creating/joining teams requires an answer, but either answer is accepted.

Errors have `{ "error": "Human-readable message" }`, with HTTP 400 for invalid operations, 401 for invalid/missing session, 413 for oversized requests, 429 for application rate limits, or 503 for unavailable/unconfigured backend. Do not branch on exact message wording. Refresh state after a stale membership/permission failure. Never automatically retry mutations after a network timeout: fetch `me` first to determine whether the operation committed.

## Invitations

Build links on the **frontend** origin: `https://FRONTEND/?invite=<invite_code>`. Preserve the code through login/profile completion, then ask the user to join by calling `join`. Opening a link must not silently change membership. Codes are case-insensitive; leading/trailing whitespace is ignored. Sharing a code and sharing its link confer identical access. Rotation invalidates both.

## Public configuration

`GET /api/config` returns `{url, key, captchaSiteKey}` for the included same-origin tester. These are intentionally public values. A separately hosted frontend should receive these through its own configuration. No secret/admin key belongs in frontend code.
