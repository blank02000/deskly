# Deskly

Office work tracker with MongoDB: clients, daily tasks, monthly deliverables, daily brief, quick-entry chat.

## Run locally

```bash
npm install
npm run dev
```

- UI: http://localhost:5173  
- API: http://localhost:8787 (Express; Vite proxies `/api`)

## MongoDB (local)

Put your connection string in `.env` (copy from `.env.example`):

```
MONGODB_URI=mongodb+srv://USER:PASS@cluster.../deskly
```

If `MONGODB_URI` is empty, the local API uses an **in-memory MongoDB** so you can develop without Atlas. Data resets when the API process stops. In-memory Mongo is **not** used on Vercel.

## Deploy on Vercel (from Git)

1. Import **https://github.com/blank02000/deskly** in the Vercel dashboard (Framework: Vite).
2. Set project env var **`MONGODB_URI`** for Production (and Preview if you use it) to your Atlas connection string.
3. In Atlas → Network Access, allow **`0.0.0.0/0`** (or Vercel’s egress IPs) so serverless functions can connect.
4. Deploy from the connected GitHub repo (`main`). Redeploy after changing env vars.

On Vercel, `/api/*` is served by serverless functions (`api/`), not Express. The SPA build output is `dist` with client-route fallback that leaves `/api` alone.

## Test + seed

With the local API running:

```bash
npm run test:api
```

That reseeds sample clients/tasks/deliverables, writes an extra test client + task, and reloads to confirm persistence.

## Chat (prototype)

Heuristic parser in `src/chat/parseIntent.ts` — Gemini later.

Examples: `add task call Northwind tomorrow urgent`, `add client Sam at Acme`, `done weekly status`.
