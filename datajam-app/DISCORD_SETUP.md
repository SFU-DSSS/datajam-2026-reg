# Deploy team Discord

Production frontend: **https://datajam.sfudsss.com**

Production backend: **https://datajam-2026-reg-api.vercel.app**

This integration creates one role and private text channel per team. Participants authorize with `identify guilds.join`; actual membership comes from the registration database. The manually entered profile username is not used for access.

## 1. Create and install the bot

1. Open [Discord Developer Portal](https://discord.com/developers/applications), create/select the DataJam application.
2. Open **Bot → Token → Reset Token**. Confirm and complete 2FA if prompted. Copy the token into backend Vercel `DISCORD_BOT_TOKEN`; it is shown once. Newly created applications already have a bot user.
3. Open **OAuth2**, copy Client ID and Client Secret into backend variables below. The client secret is different from the bot token.
4. Under OAuth2 **Redirects**, add exactly `https://datajam.sfudsss.com/discord/callback` and save.
5. Open **Installation**, enable **Guild Install**, choose **Discord Provided Link**, and add scope **bot** under Guild Install's default settings. Select **Manage Roles**, **Manage Channels**, **View Channels**, **Send Messages**, **Read Message History**, and **Create Invite**. Save.
6. Open the Install Link, choose **Add to server**, select the event server, and authorize. Your Discord account needs Manage Server. If using OAuth2 URL Generator instead, select `bot` and the same permissions, then open its generated URL.
7. In the server's **Settings → Roles**, move the bot role above all managed team roles. It does not need Administrator or privileged Gateway intents. Leave **Requires OAuth2 Code Grant** off for bot installation.
8. Enable **User Settings → Advanced → Developer Mode**. Right-click the server and choose **Copy Server ID**.

The bot may appear offline: this implementation uses the REST API, not a persistent Gateway connection. That does not prevent it from working. See [Discord's setup guide](https://docs.discord.com/developers/quick-start/getting-started), [OAuth2](https://docs.discord.com/developers/topics/oauth2), and [Add Guild Member](https://docs.discord.com/developers/resources/guild#add-guild-member).

## 2. Apply migration and configure Vercel

In Supabase SQL Editor, run **`supabase/005_discord.sql` once**, after 001–004. Existing teams are queued automatically. Leave `registration_private` out of exposed schemas.

Set these **backend project → Settings → Environment Variables → Production** values:

| Variable | Value |
| --- | --- |
| `DISCORD_CLIENT_ID` | Discord OAuth2 Client ID / Application ID |
| `DISCORD_CLIENT_SECRET` | Discord OAuth2 Client Secret |
| `DISCORD_BOT_TOKEN` | Bot → Reset Token |
| `DISCORD_GUILD_ID` | Event server ID |
| `DISCORD_REDIRECT_URI` | `https://datajam.sfudsss.com/discord/callback` |
| `SUPABASE_SERVICE_ROLE_KEY` | Same Supabase project's legacy `service_role` key, under Settings → API Keys |
| `CRON_SECRET` | A random secret with at least 32 random bytes; generate/store in your password manager |

Keep existing `SUPABASE_URL` and `SUPABASE_ANON_KEY`. The service-role key is the new exception to the old public-key-only configuration. It must **never** go into the frontend, a `NEXT_PUBLIC_` variable, git, or chat. The backend uses it only with `discord_service`; that function is executable only by `service_role`. Participant `discord_user` calls use the caller's token and verified identity. Existing registration and organizer RPCs retain caller authorization.

In the **frontend** project, set `DATAJAM_API_URL=https://datajam-2026-reg-api.vercel.app`. No new frontend secrets are needed.

Deploy the tested commit to both projects using Node 22, after applying the migration and saving variables. This repo's normal production path is a push to `master` (see `../PUBLISHING.md`). Verify Vercel builds that exact commit in both projects. Use stable production domains, not deployment-specific URLs. Do not enable this against the production server from Preview deployments.

## 3. Required minute scheduler on Vercel Hobby

Requests attempt a small batch immediately, but durable retries must also run without a browser open. **A scheduler is required before calling this deployed.** Vercel Hobby's once-daily cron is insufficient for access revocation. See [Vercel limits](https://vercel.com/docs/cron-jobs/usage-and-pricing).

Use the existing Supabase project:

1. Enable **Integrations → Cron** (`pg_cron`) and the `pg_net` database extension.
2. In **Vault**, create secret named **`datajam_discord_cron_secret`** with exactly the same value as backend `CRON_SECRET`.
3. After the backend is deployed, run **`supabase/discord-scheduler.sql`** in SQL Editor. It schedules a POST every minute to the stable backend URL. It is deployment setup, separate from migration 005.
4. Inspect Cron job history **and** HTTP responses. Cron success only proves the HTTP request was queued. Recent responses are available with:

   ```sql
   select id, status_code, timed_out, error_msg, created
   from net._http_response order by created desc limit 20;
   ```

   Expect HTTP 200. A 401 means the secret differs or deployment protection intercepted the request. A 503 means configuration/database access needs attention. Do not expose secrets in screenshots of request tables.

This uses [Supabase Cron installation](https://supabase.com/docs/guides/cron/install) and its documented [Cron + pg_net + Vault pattern](https://supabase.com/docs/guides/functions/schedule-functions), pointed at the Vercel endpoint. Alternatively use an external minute scheduler with POST/GET and header `Authorization: Bearer YOUR_CRON_SECRET`. Keep the secret in its secret store, not a URL. Vercel Pro can use an every-minute Vercel cron instead; do not configure both schedulers unnecessarily.

The backend endpoint is `/api/discord-sync`; it is deliberately not proxied through the participant frontend. Vercel functions are configured for 60 seconds; scheduled work has a 40-second budget, individual network calls time out after four seconds, and the database lease lasts two minutes. No fire-and-forget work is assumed to survive a response.

## 4. Live acceptance test — required

Local tests use simulated Discord responses. They do **not** verify installation, real OAuth, server permissions, Vercel routing, or the scheduler. Use two non-administrator Discord accounts plus an organizer app login:

1. Create two app teams. Confirm each gets exactly one role/channel, including a team whose members have not connected yet.
2. On a team page, click **Join team Discord**, approve Discord, and return to the same browser. It should change to **Open team chat** after synchronization. Confirm server membership and send a message.
3. Forward the channel URL to the other account on the other team. It must not be able to view it. A valid app invitation deliberately accepted through registration changes membership; merely opening a forwarded channel/OAuth URL does not.
4. Cancel OAuth and try again. Copy a callback URL to another browser/account; it must be rejected. Refreshing/replaying an already used callback must also fail.
5. Move the participant using organizer controls. Confirm the old role disappears before the new role is added. Test participant leave, captain removal, organizer removal, and captain transfer. Transfer alone must preserve access.
6. Rename a team. Its channel and role should be renamed in place. Disband a test team: its **channel and message history are deleted**, followed by its role. Applications remain.
7. Temporarily remove the bot's Manage Roles permission on test data, perform a membership change, and verify a queued error. Restore permissions, close the app, and confirm the scheduler resolves it without a manual retry.
8. Check the private queue below is drained. Only after this real authorization/removal test should deployment be reported verified.

Discord administrators and the server owner bypass private-channel restrictions; use ordinary accounts for the privacy test. The channel overwrites deny View Channel to `@everyone` and grant access only to the team's managed role and the bot. Server administrators still retain their normal access. See [Discord permissions](https://docs.discord.com/developers/topics/permissions).

## Operations and limits

```sql
select kind, id, attempts, available_at, last_error
from registration_private.discord_jobs
order by available_at;
```

Team/member triggers enqueue work atomically for both participant and organizer changes, including direct table changes. The worker reads current membership rather than trusting an invitation or an old event payload. A global database lease serializes workers. Job revisions preserve changes that arrive during a run. Crashed workers become retryable after two minutes. Failures back off from five seconds up to one hour; Discord `retry_after` extends that delay and pauses other workers. Jobs are retained until success, with sanitized errors. Repeated configuration errors require operator attention; retries do not fix missing permissions.

Access revocation is **eventually consistent**, usually within the action request or next minute when services are healthy; outages, rate limits, and backlog delay it. This is not instant cross-system authorization. A concurrent membership change during a Discord grant remains queued for correction. For urgent removal during an outage, an organizer must remove the Discord role directly as well.

Role names include a stable `datajam:<team UUID>` marker, and channel topics contain that marker. These recover an interrupted resource creation without normally creating duplicates. Do not manually assign managed roles to outsiders, edit markers/overwrites, or move these channels into categories that synchronize different permissions. Manage changes through the app. Out-of-band Discord changes are not continuously audited.

OAuth access and refresh tokens are **not stored**. After the initial server join, the bot handles future team changes without another authorization. Leaving/kicking/banning a user from the Discord server may require reconnecting; a missing member detected during synchronization is marked for reconnect. Bans must be resolved by server staff. Server membership screening may need to be completed inside Discord. Account switching is deliberately blocked so one Discord identity cannot be attached to multiple registrations; organizer troubleshooting/account-unlink UI is deferred.

Deleted team resource IDs and disconnected identities are retained privately for cleanup and uniqueness. Disbanding deletes the actual Discord channel/history. Renaming preserves it. This installation targets one server; changing `DISCORD_GUILD_ID` requires a planned migration, not just changing an environment variable. Voice channels and organizer troubleshooting UI remain out of scope.

Local validation commands (Node 22):

```bash
cd datajam-app
npm test
npm run test:portal
cd ../v0_hackml-portal-main
npm run typecheck
npm run build
```

To disable new Discord work, remove backend `DISCORD_BOT_TOKEN` and redeploy; queued work remains for recovery. Unschedule the cron job if needed with `select cron.unschedule('datajam-discord-sync');`. Disabling synchronization does not revoke existing roles by itself.
