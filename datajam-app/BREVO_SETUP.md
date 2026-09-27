# Brevo email setup

For the quickest launch, complete section 1 and test signup. No new database migration or application deployment is needed to switch existing verification/password-reset emails to Brevo. Keep Supabase on its Free plan.

## 1. Connect Brevo to Supabase (required)

1. Create a free [Brevo account](https://www.brevo.com/). Complete any account/transactional-sending activation requested in the dashboard.
2. In Brevo's **Senders, Domains & Dedicated IPs** settings, add your sending domain. Copy the DNS records Brevo provides into your domain's DNS provider, then verify authentication in Brevo. Add a sender such as `registration@YOUR-DOMAIN` with the name **DataJam 2026**. Use an address/domain you control; DNS verification may take time.
3. Open Brevo **SMTP & API → SMTP**. Copy the displayed **SMTP login** and generate an **SMTP key**. The SMTP login may differ from your account email. Save the key securely when shown.
4. In your Supabase project, open **Authentication → Email → SMTP Settings** (or search Authentication settings for **SMTP**). Enable custom SMTP and enter:

   | Supabase field | Value |
   | --- | --- |
   | Sender email | Your verified Brevo sender address |
   | Sender name | `DataJam 2026` |
   | Host | `smtp-relay.brevo.com` |
   | Port | `587` |
   | Username | The SMTP login copied from Brevo |
   | Password | Your Brevo **SMTP key** |

   Save. Use the SMTP key here, not a Brevo API key or your account password. These credentials belong only in Supabase; you do not need SMTP environment variables in Vercel.
5. In Supabase Authentication, keep **Confirm email** enabled. Under **URL Configuration**, set Site URL to your deployed site and allow its exact return URL, e.g. `https://YOUR-PROJECT.vercel.app/`. Add `http://localhost:3000/` if testing locally.
6. Check Supabase **Rate Limits**: custom SMTP initially has a low Auth email limit (documented as 30/hour). Adjust for expected signup traffic. Brevo Free currently allows **300 sends/day**, shared by verification, resets, and other sends. Leave room for resends and password resets; increasing Supabase's limit does not increase Brevo's quota.
7. Leave Supabase's default confirmation/reset templates in place for the quickest launch. Supabase generates the secure links; Brevo delivers the messages. Disable click/link tracking for authentication emails if enabled, because link rewriting can interfere with verification links.

### Verify before inviting attendees

1. Sign up on the deployed app with an email you control that has not already registered.
2. Find the message in Brevo **Transactional → Logs**, check your inbox/spam folder, and click the verification link. Confirm you can log in.
3. Log out, request a password reset, and confirm its link lets you set a new password.

If delivery fails, check Brevo sender/domain verification and account activation, then the SMTP login/key, Supabase Auth logs, and Brevo transactional logs. If links return to the wrong site, fix Supabase Site URL/redirect URLs. For rate-limit errors, check both providers' quotas. A message accepted by Brevo is not necessarily delivered; its logs show the final status.

## 2. Send other event emails (optional)

The repository includes an [organizer dashboard](ADMIN_SETUP.md) for automatic acceptance emails and custom messages to selected participants, plus a private command for individual event messages. The dashboard uses an authenticated, organizer-only endpoint. Configure the variables below in the deployed server environment for dashboard sending, or locally for the command. Signup verification and password resets work without this section. Saving a profile does **not** automatically send a separate registration receipt.

1. In Brevo **SMTP & API → API Keys**, create an **API key**. This is separate from the SMTP key used above.
2. In `datajam-app/.env.local`, fill in:

   ```dotenv
   BREVO_API_KEY=YOUR_PRIVATE_BREVO_API_KEY
   BREVO_SENDER_EMAIL=registration@YOUR-DOMAIN
   BREVO_SENDER_NAME=DataJam 2026
   BREVO_REPLY_TO=YOUR_MONITORED_EMAIL_ADDRESS
   ```

   `BREVO_REPLY_TO` is optional. Use the verified sender from section 1. Keep these values private; never add the key to frontend code. `.env.local` is already ignored by Git.
3. Write your message as a UTF-8 plain text file, for example `/tmp/datajam-message.txt`. From `datajam-app`, preview it:

   ```sh
   npm run email -- --to YOUR_TEST_EMAIL --subject "DataJam update" --file /tmp/datajam-message.txt
   ```

4. After checking the preview, send to your own test address:

   ```sh
   npm run email -- --to YOUR_TEST_EMAIL --subject "DataJam update" --file /tmp/datajam-message.txt --send
   ```

The command sends to one recipient and returns Brevo's message ID. It does not automatically retry failed or ambiguous requests: check Brevo logs before retrying to avoid duplicates. Replace the test address with the intended recipient when ready.

For announcements to a whole attendee list, use Brevo's campaign interface, with its contact-list and unsubscribe tools. Contacts are not automatically synced from this app. Only import the email addresses and fields needed for the mailing; student numbers and other registration details are unnecessary. Campaign sends also consume your free daily allowance.

## References

- [Brevo SMTP settings and sender prerequisites](https://help.brevo.com/hc/en-us/articles/7924908994450-Send-transactional-emails-using-Brevo-SMTP)
- [Supabase custom SMTP and rate limits](https://supabase.com/docs/guides/auth/auth-smtp)
- [Brevo transactional email API](https://developers.brevo.com/reference/send-transac-email)
- [Brevo Free plan limits](https://help.brevo.com/hc/en-us/articles/208580669-FAQs-What-are-the-limits-of-the-Free-plan)
