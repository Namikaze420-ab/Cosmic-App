# Google Calendar setup — Alpha 2 staging

Cosmic Planner's Google Calendar backend is already deployed, but OAuth is intentionally configuration-locked until the project owner supplies a Google OAuth client. The initial integration is **read-only**: it imports Google Calendar events into the planner and does not write events back to Google.

## 1. Google Cloud Console

1. Open Google Cloud Console and select/create the project that will own Cosmic Planner's OAuth credentials.
2. Enable the **Google Calendar API**.
3. Configure the OAuth consent screen for the intended test users.
4. Create an OAuth 2.0 Client ID with application type **Web application**.
5. Add this exact Authorized redirect URI:

   `https://azziyvcgnxxnzpvlaijd.supabase.co/functions/v1/google-calendar-oauth-callback`

6. Keep the Google Client ID and Client Secret private. Do not commit the secret to GitHub and do not place it in browser code.

## 2. Supabase Edge Function secrets

In the Supabase Dashboard, open **Edge Functions → Secrets** for project `azziyvcgnxxnzpvlaijd` and add:

- `GOOGLE_CALENDAR_CLIENT_ID` — the Google Web OAuth Client ID.
- `GOOGLE_CALENDAR_CLIENT_SECRET` — the Google Web OAuth Client Secret.
- `CALENDAR_TOKEN_ENCRYPTION_KEY` — a random 32-byte key encoded as Base64.
- `COSMIC_APP_RETURN_URL` — recommended staging value:
  `https://project-k90mw-git-staging-minato420ashish-1637s-projects.vercel.app/`

Generate the encryption key on a trusted local machine, for example:

```bash
openssl rand -base64 32
```

Do not paste these secrets into source control. Supabase makes configured Edge Function secrets available to the deployed functions without a redeploy.

## 3. Security model

- OAuth `state` values are random, hashed before storage, expire after 10 minutes and are single-use.
- Google refresh tokens are encrypted server-side with AES-256-GCM before being stored.
- OAuth token/state tables are not readable by `anon` or `authenticated` users.
- The browser never receives the Google refresh token or encryption key.
- Initial Google scope is `https://www.googleapis.com/auth/calendar.readonly` plus OpenID/email identity scopes.
- Imported events are deduplicated by `(user_id, external_event_id)`.

## 4. Staging acceptance test

After the three required secrets are saved:

1. Sign into the Cosmic Planner staging build.
2. Open **Profile → Google Calendar · Alpha 2**.
3. Select **Connect Google Calendar**.
4. Approve the read-only Google Calendar permission.
5. Confirm the browser returns to Cosmic Planner with the connection shown.
6. Select **Sync now**.
7. Confirm upcoming primary-calendar events appear as planner items and remain after refresh.
8. Confirm `calendar_connections.sync_status` becomes `healthy` and `last_synced_at` is populated.
9. Re-run browser QA and Supabase security advisors before any production consideration.

## Production gate

Do not widen the OAuth scope, enable write-back, merge `staging` into `main`, or promote a Vercel production deployment without explicit owner review and approval.
