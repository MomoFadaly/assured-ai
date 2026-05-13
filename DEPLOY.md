# AssuredAI — Deploy Guide

Two services need hosting:

1. **Next.js app** (marketing site + verifier UI + API routes) → **Vercel**
2. **Presidio sidecar** (PHI redaction, Python + spaCy) → **DigitalOcean App Platform**

Plus one managed service:

3. **Postgres + pgvector** → **Neon** (recommended) or **DigitalOcean Managed Postgres**

---

## 1. Postgres (Neon recommended)

1. Sign up at https://neon.tech, create a new project.
2. **Enable pgvector**: in the Neon SQL editor run `CREATE EXTENSION IF NOT EXISTS vector;`
3. Copy the connection string. It'll look like:
   ```
   postgresql://user:pw@ep-xxx-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```
4. Save as `DATABASE_URL` — you'll need it in both Vercel and locally.

Run migrations once:
```bash
DATABASE_URL='<your-neon-url>' pnpm db:migrate
```

Optional — seed the source corpus (uses paid Voyage embeddings, ~$1–3):
```bash
pnpm corpus:ingest --scenario=healthcare
```

---

## 2. Presidio sidecar (DigitalOcean App Platform)

### One-time setup

1. Push this repo to a Git remote DO can access (GitHub recommended).
2. Open https://cloud.digitalocean.com/apps → **Create App** → **Import from Git**.
3. Source: this repo. Branch: `main`. Source directory: `deploy/presidio`.
4. **Use App Spec**: paste the contents of `deploy/presidio/.do/app.yaml`, or let DO auto-detect it.
5. Plan: **basic-xs ($12/month, 1 GB RAM)**. The cheaper $5 plan crashes on the spaCy model load.
6. Region: pick one near your Vercel region (e.g., NYC if Vercel is `iad1`).
7. Deploy. First boot takes ~5 minutes (spaCy `en_core_web_lg` download).

### After deploy

DO assigns a public URL like:
```
https://assured-ai-presidio-xxx.ondigitalocean.app
```

Test it:
```bash
curl https://assured-ai-presidio-xxx.ondigitalocean.app/health
# → {"status":"ok"}

curl -X POST https://assured-ai-presidio-xxx.ondigitalocean.app/analyze \
  -H "Content-Type: application/json" \
  -d '{"text":"Patient John Smith MRN 123456","language":"en"}'
# → array of detected entities
```

Save the URL — you'll put it in Vercel env in step 3.

### Optional: custom domain

In App Platform → your app → **Settings** → **Domains** → add e.g.
`presidio.assured-ai.com`. Point a CNAME at the DO-provided hostname. Update
the env values to use the custom domain (cleaner for client demos).

### Cheaper alternative: bare Droplet

If $12/month is too much, run Presidio on a $6/month Droplet:

```bash
ssh root@<droplet-ip>
apt update && apt install -y docker.io docker-compose-v2
git clone <your-repo> /opt/assured-ai
cd /opt/assured-ai
docker compose -f deploy/docker-compose.yml up -d presidio
# Set up nginx or Caddy in front for HTTPS termination.
```

---

## 3. Next.js app (Vercel)

### One-time setup

1. https://vercel.com/new → import this repo.
2. Framework auto-detected: Next.js.
3. **Build command** — `pnpm build` (already in `vercel.json`).
4. **Install command** — `pnpm install --frozen-lockfile`.

### Environment variables (set in Vercel Project → Settings → Environment Variables)

Required:

```
DATABASE_URL                = <your Neon connection string>
ANTHROPIC_API_KEY           = <sk-ant-...>
VOYAGE_API_KEY              = <pa-...>
PRESIDIO_ANALYZER_URL       = https://<your-do-presidio-host>/analyze
PRESIDIO_ANONYMIZER_URL     = https://<your-do-presidio-host>/anonymize
NEXT_PUBLIC_APP_URL         = https://assured-ai.com
NODE_ENV                    = production
```

Optional (recommended):

```
SENTRY_DSN                  = <from sentry.io>
SENTRY_ENVIRONMENT          = production
LOG_LEVEL                   = info
RETRIEVAL_TOP_K             = 8
RETRIEVAL_MIN_SIMILARITY    = 0.35
SYNTHESIS_CONFIDENCE_THRESHOLD = 0.40
```

For each variable, set it on all three environments (Production, Preview, Development) unless you want different values per environment.

### Deploy

`git push` to your default branch → Vercel auto-deploys. First build ~3 minutes.

### Custom domain

Vercel project → **Domains** → add `assured-ai.com` (or whatever you registered). Vercel auto-provisions Let's Encrypt cert.

---

## 4. Smoke test the live deployment

After everything's up:

```bash
# Health
curl https://assured-ai.com/api/health
# → {"status":"ok","ts":"..."}

# Marketing page
curl -s -o /dev/null -w "%{http_code}" https://assured-ai.com/
# → 200

# Verifier UI
curl -s -o /dev/null -w "%{http_code}" https://assured-ai.com/chat
# → 200

# Hit the actual pipeline (costs ~$0.20)
curl -X POST https://assured-ai.com/api/verify \
  -H "Content-Type: application/json" \
  -d '{
    "scenario": "healthcare",
    "input_mode": "paste",
    "article": "Patient John Smith was recently diagnosed with Type 2 diabetes."
  }'
```

---

## 5. Post-deploy: seed the first audit row

The marketing-page hero CTA "See an example proof" links to `/v/<latest-audit-id>`. On a fresh deploy with no audit entries yet, the CTA is auto-hidden. To make it appear:

1. Visit `https://assured-ai.com/chat`.
2. Paste this article and click Verify:
   ```
   The DASH eating plan is a flexible, balanced approach to eating that helps treat or
   prevent high blood pressure. It emphasizes fruits, vegetables, whole grains, and
   lean proteins. Drinking green tea three times per day reduces cholesterol by 47%.
   ```
3. Wait for the verification to complete. An audit row is created.
4. The marketing page's "See an example proof" CTA now points at it.

---

## 6. Costs at a glance

| Service | Plan | Monthly | Required |
|---|---|---|---|
| Vercel Hobby | free | $0 | yes (until traffic >100 GB/month) |
| Neon Postgres | Free | $0 | yes (free tier: 0.5 GB storage, more than enough for the seed corpus) |
| DigitalOcean App Platform — Presidio | basic-xs | $12 | yes (or $6 Droplet alternative) |
| Anthropic API | pay-as-you-go | ~$5–50 | yes (depends on volume) |
| Voyage AI | pay-as-you-go | ~$1–10 | yes (depends on volume) |
| Sentry Developer | Free | $0 | optional but recommended |
| Vercel Analytics | included in Hobby | $0 | optional |

**Minimum**: ~$12–15/month (Presidio + tiny API usage).
