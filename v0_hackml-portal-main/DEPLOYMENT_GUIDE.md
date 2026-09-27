# Deployment guide

Use the complete [DataJam publishing guide](../PUBLISHING.md) at the repository root. It covers both Vercel projects, the shared Supabase database, all four migrations, Brevo, Turnstile, organizer access, custom domains, and end-to-end launch checks.

The frontend root is `v0_hackml-portal-main`; the backend root is `datajam-app`. Both use Node.js 22 and npm lockfiles. Do not apply this folder's old `scripts/` SQL to the DataJam database.
