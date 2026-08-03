# Deskly

Office work tracker with MongoDB: clients, daily tasks, monthly deliverables, daily brief, quick-entry chat.

## Run

```bash
npm install
npm run dev
```

- UI: http://localhost:5173  
- API: http://localhost:8787  

## MongoDB

Put your connection string in `.env` (copy from `.env.example`):

```
MONGODB_URI=mongodb+srv://USER:PASS@cluster.../deskly
```

If `MONGODB_URI` is empty, the API uses an **in-memory MongoDB** so you can develop and test without Atlas yet. Data resets when the API process stops.

## Test + seed

With the API running:

```bash
npm run test:api
```

That reseeds sample clients/tasks/deliverables, writes an extra test client + task, and reloads to confirm persistence.

## Chat (prototype)

Heuristic parser in `src/chat/parseIntent.ts` — Gemini later.

Examples: `add task call Northwind tomorrow urgent`, `add client Sam at Acme`, `done weekly status`.
