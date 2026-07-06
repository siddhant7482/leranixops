# Learnix Ops — Status + Docs

A standalone Next.js app (separate from the main Learnix app) that hosts:

- **`/`** — a live status dashboard (Frontend · API · Database · Background worker · SearXNG)
- **`/docs`** — architecture documentation
- **`/api/status`** — a serverless aggregator that checks each service server-side

It lives in the same repo but deploys **independently to Vercel** — a status page must
not share fate with the system it monitors.

## Deploy to Vercel (free, ~3 min)

1. Go to [vercel.com](https://vercel.com) → **Add New… → Project** → import the
   `Learnixsai` GitHub repo.
2. **Root Directory:** set to **`ops`** (important — this is a subfolder project).
3. Framework preset: **Next.js** (auto-detected). Build/output settings: defaults.
4. (Optional) **Environment Variables** — only needed to override the defaults:
   - `APP_URL` = `https://www.learnixsai.tech`
   - `SEARXNG_URL` = `http://143.47.246.42:8080`
5. **Deploy.** You’ll get a `*.vercel.app` URL.
6. (Optional) Add a custom domain like `status.learnixsai.tech` in Vercel → Domains,
   and point a CNAME at it in Cloudflare.

## What it checks

`/api/status` runs server-side (no CORS issues) and calls:
- `GET {APP_URL}` — is the frontend up?
- `GET {APP_URL}/api/health` — the app’s own report on **API / Database / worker**
- `GET {SEARXNG_URL}/search?q=ping&format=json` — is search up?

The dashboard polls `/api/status` every 20s and shows green/red per component.

## Want alerts too?
Point **UptimeRobot** (free) at `https://www.learnixsai.tech/api/health` — it returns
**503** when the app is degraded, so you’ll get an email/SMS when something breaks.

## Local dev
```bash
cd ops
pnpm install
pnpm dev   # http://localhost:3000
```
