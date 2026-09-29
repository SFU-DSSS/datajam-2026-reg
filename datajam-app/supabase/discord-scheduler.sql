-- Optional deployment setup, NOT a schema migration. Run after 005 and backend deployment.
-- Enable pg_cron (Integrations > Cron) and pg_net in Supabase first.
-- In Supabase Vault, add secret named datajam_discord_cron_secret whose value equals
-- backend Vercel CRON_SECRET. Never paste the secret into this checked-in file.
-- The named job is updated rather than duplicated when this script is rerun.
select cron.schedule(
  'datajam-discord-sync',
  '* * * * *',
  $job$
    select net.http_post(
      url := 'https://datajam-2026-reg-api.vercel.app/api/discord-sync',
      headers := jsonb_build_object(
        'Content-Type','application/json',
        'Authorization','Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'datajam_discord_cron_secret')
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 55000
    );
  $job$
);
