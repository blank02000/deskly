# Deskly

Office work tracker with MongoDB: clients, daily tasks, monthly deliverables, daily brief, quick-entry chat.

Sign-in is **email + password** (single user from env). Each login gets a private workspace scoped by that email.

> **Security:** A password was shared in chat during setup. Rotate `DESKLY_PASSWORD` (and `SESSION_SECRET`) before any real/production use. Never commit `.env`.

## Environment

Copy `.env.example` → `.env` (never commit `.env`):

| Variable | Where | Purpose |
|----------|--------|---------|
| `MONGODB_URI` | local API + Vercel | Atlas connection string. Empty locally → in-memory Mongo. **Required on Vercel.** |
| `PORT` | local API only | Default `8787` |
| `DESKLY_USER` | Express + Vercel `api/*` | Login email / id (`AUTH_EMAIL` alias) |
| `DESKLY_PASSWORD` | Express + Vercel `api/*` | Login password (`AUTH_PASSWORD` alias). Env-only. |
| `SESSION_SECRET` | Express + Vercel `api/*` | Signs httpOnly session cookie. Long random string. |

## Run locally

```bash
npm install
npm run dev
```

- UI: http://localhost:5173  
- API: http://localhost:8787 (Express; Vite proxies `/api`)

Set `DESKLY_USER`, `DESKLY_PASSWORD`, and `SESSION_SECRET` in `.env`, then open the landing page and sign in.

## MongoDB (local)

```
MONGODB_URI=mongodb+srv://USER:PASS@cluster.../deskly
```

If `MONGODB_URI` is empty, the local API uses an **in-memory MongoDB**. Data resets when the API process stops. In-memory Mongo is **not** used on Vercel.

## Deploy on Vercel (from Git)

1. Import **https://github.com/blank02000/deskly** (Framework: Vite).
2. Set env vars for Production (and Preview if used):
   - `MONGODB_URI`
   - `DESKLY_USER` (login id — username or email-like; e.g. `shubh@11125` is fine, no real domain required)
   - `DESKLY_PASSWORD`
   - `SESSION_SECRET` (long random string)
3. **Redeploy after changing env vars** (Vercel → Deployments → … → Redeploy). Login fails with 401 until these are present on the deployment.
4. If `/api/login` returns **503** `Auth not configured`, the auth env vars are missing on that deployment.
5. In Atlas → Network Access, allow **`0.0.0.0/0`** (or Vercel egress IPs).

On Vercel, `/api/*` is serverless (`api/`), not Express. SPA fallback leaves `/api` alone.

## Auth behavior

- Logged out: public landing with email + password form; `/api/state` and `/api/seed` return **401**.
- Logged in: httpOnly cookie signed with `SESSION_SECRET`; Deskly app loads; empty workspace auto-created on first load (no sample/seed clients).
- `POST /api/login`, `POST /api/logout`, `GET /api/me` supported on local Express and Vercel.
- Google OAuth / Clerk were removed.

## Test + clear data

With the local API running:

```bash
npm run test:api
```

Without credentials, the suite checks health + that protected routes reject. To exercise clear/persist, set `DESKLY_USER` / `DESKLY_PASSWORD` / `SESSION_SECRET` in the API process env (already in `.env` for `npm run dev`).

In the app sidebar, **Clear all data** empties the workspace (clients/tasks/notes).

## Chat (prototype)

Heuristic parser in `src/chat/parseIntent.ts` — Gemini later.

Examples: `add task call Northwind tomorrow urgent`, `add client Sam at Acme`, `done weekly status`.
