# AssuredAI — Auth setup

AssuredAI uses Auth.js v5 (NextAuth) with two interchangeable providers:

1. **Credentials** — email + bcrypt password. Self-serve signup, email
   verification, forgot/reset, per-account login throttling.
2. **Google OAuth** — one-click. Auto-links to a same-email credentials
   account because Google guarantees email ownership.

The bcrypt cost, throttle, token TTLs, and cross-link defence pattern
mirror The Wild Pest verbatim — that codebase is the reference.

---

## Production env vars (Vercel)

Required:

```
AUTH_SECRET            32-byte base64 (openssl rand -base64 32)
AUTH_URL               https://assuredai.online
NEXT_PUBLIC_APP_URL    https://assuredai.online
DATABASE_URL           Neon Postgres (already set)
```

Optional but recommended:

```
GOOGLE_CLIENT_ID       From Google Cloud Console
GOOGLE_CLIENT_SECRET   "
RESEND_API_KEY         Resend.com API key (verify + reset emails)
EMAIL_FROM             AssuredAI <hello@assuredai.online>
```

Without `GOOGLE_*`, the Google button is hidden — credentials still work.
Without `RESEND_API_KEY`, verify + reset emails are logged to console
(useful for local dev, broken for production).

---

## 1. Create the Google OAuth client (~3 min)

You only need to do this once. Mo is already signed in to Google.

1. Go to **https://console.cloud.google.com/projectcreate**
   - Project name: `AssuredAI` (or pick existing)
   - Click **Create**, wait ~5 sec, then select the project.

2. Configure the OAuth consent screen:
   - **https://console.cloud.google.com/auth/overview/create**
   - User type: **External**
   - Click Create.
   - Fill:
     - App name: `AssuredAI`
     - User support email: your email
     - App logo: optional (skip for now)
     - Application home page: `https://assuredai.online`
     - Authorized domains: `assuredai.online`
     - Developer contact: your email
   - Save and continue.
   - Scopes: skip (defaults: `openid email profile` are added automatically by NextAuth).
   - Test users: add your own email (so unverified-app sign-ins work for you while in testing mode).
   - Save and continue → Back to dashboard.

3. Create credentials:
   - **https://console.cloud.google.com/apis/credentials**
   - **+ Create Credentials** → **OAuth client ID**
   - Application type: **Web application**
   - Name: `AssuredAI Web`
   - **Authorized JavaScript origins**:
     ```
     https://assuredai.online
     https://www.assuredai.online
     http://localhost:3000
     ```
   - **Authorized redirect URIs**:
     ```
     https://assuredai.online/api/auth/callback/google
     https://www.assuredai.online/api/auth/callback/google
     http://localhost:3000/api/auth/callback/google
     ```
   - Click **Create**.
   - Copy the **Client ID** and **Client Secret** from the modal.

4. Push to Vercel + redeploy:

   ```bash
   cd /Users/mo/assured-ai
   node scripts/set-google-oauth.mjs <CLIENT_ID> <CLIENT_SECRET>
   ```

   The helper sets both keys in production + preview + development and
   triggers a production redeploy. ~30 seconds.

5. Test: visit `https://assuredai.online/sign-in`. The "Continue with
   Google" button should now appear above the email/password form.

---

## 2. Set up Resend for transactional emails (~5 min)

Required for the verify-email + forgot-password flows to actually deliver
mail in production. Without it, signups land in "check inbox" but the
email never arrives.

1. Sign up at **https://resend.com** (free tier: 3000/mo, 100/day).
2. **Domains** → **Add Domain** → `assuredai.online`.
3. Resend will show DNS records to add. They look like:
   ```
   TXT   _resend.assuredai.online   resend-verify=...
   MX    send.assuredai.online      feedback-smtp.us-east-1.amazonses.com   priority 10
   TXT   send.assuredai.online      v=spf1 include:amazonses.com ~all
   TXT   resend._domainkey.assuredai.online   p=...
   ```
   Add them at Namecheap (Advanced DNS) — Resend auto-verifies within ~5 min.
4. **API Keys** → **Create API Key** → name `AssuredAI Production` →
   permission **Sending access**.
5. Copy the `re_...` key, then:

   ```bash
   printf "%s" "re_xxx..." | vercel env add RESEND_API_KEY production --force --sensitive
   printf "%s" "re_xxx..." | vercel env add RESEND_API_KEY preview --force --sensitive
   printf "%s" "re_xxx..." | vercel env add RESEND_API_KEY development --force --sensitive
   vercel deploy --prod --yes
   ```

6. Test: trigger a forgot-password from `/forgot-password` — the reset
   email should land in your inbox within ~10 seconds.

---

## 3. Promote a user to admin (one-time)

Self-signup creates `customer` role. To make yourself an operator/admin
so you can see `/library`, `/audit`, `/escalations`, `/voice`:

```bash
# Connect to Neon (DATABASE_URL from vercel env pull or Neon dashboard)
psql "$DATABASE_URL" -c "UPDATE users SET role = 'admin' WHERE LOWER(email) = LOWER('you@example.com');"
```

Sign out and back in; the new role propagates through the JWT.

---

## Schema (already applied, FYI)

`packages/db/002_auth.sql` (runs at every `vercel-build`):

- Extends `users`: `name`, `image`, `email_verified`, `password_hash`,
  `failed_login_count`, `locked_until`, `last_login_at`, `deleted_at`, `updated_at`.
- Extends `user_role_t` enum: adds `'customer'` (default for self-signup).
- Creates `accounts`, `sessions`, `verification_token` — owned entirely by
  `@auth/pg-adapter`. Our domain code never writes them.

`audit_log` and the hash chain are untouched. Auth.js write paths are
distinct from the verification audit trail.

---

## Security posture

- Bcrypt cost 12 (~250ms hash) with lazy rehash on sign-in.
- Per-account throttle: 5 failed attempts → 15-min lock (`lib/auth/rate-limit.ts`).
- Cross-link defence: signed-in user cannot OAuth-link a different-email
  Google account (`lib/auth/auth.ts` signIn callback).
- JWT identity reset on OAuth sign-in: stale claims from prior session
  are stripped before new identity populates the token.
- Tokens hashed at rest (`verification_token.token` stores SHA-256, not the raw value).
- Generic responses on signup / forgot-password — no enumeration possible.
- `proxy.ts` gates `/admin`, `/library`, `/escalations`, `/voice`, `/audit`.
- `safeRedirectPath()` defangs `?callbackUrl=https://evil.com`.

For threat-model and incident response, see the upcoming
`docs/SECURITY.md` (TBD).
