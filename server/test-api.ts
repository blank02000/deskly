/**
 * End-to-end API check against a live Deskly server.
 * Run: npm run test:api  (server must be up)
 */
const BASE = process.env.API_URL || 'http://localhost:8787'

async function req(path: string, init?: RequestInit) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
    ...init,
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(`${init?.method || 'GET'} ${path} → ${res.status} ${JSON.stringify(body)}`)
  return body
}

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg)
}

async function main() {
  const health = await req('/api/health')
  assert(health.ok === true, 'health failed')
  console.log('health:', health)

  const seeded = await req('/api/seed', { method: 'POST' })
  assert(seeded.clients?.length >= 3, 'seed clients')
  assert(seeded.tasks?.length >= 4, 'seed tasks')
  assert(seeded.deliverables?.length >= 3, 'seed deliverables')
  assert(seeded.dailyNotes?.length >= 1, 'seed notes')
  console.log('seeded:', {
    clients: seeded.clients.length,
    tasks: seeded.tasks.length,
    deliverables: seeded.deliverables.length,
    notes: seeded.dailyNotes.length,
  })

  const state = await req('/api/state')
  assert(state.clients[0].company === seeded.clients[0].company, 'state mismatch')

  const extraClient = {
    id: crypto.randomUUID(),
    name: 'Test User',
    company: 'Deskly QA Co',
    status: 'active',
    notes: 'Inserted by test:api',
    assignedAt: new Date().toISOString().slice(0, 10),
  }
  const next = {
    ...state,
    clients: [...state.clients, extraClient],
    tasks: [
      ...state.tasks,
      {
        id: crypto.randomUUID(),
        title: 'Verify Mongo write path',
        clientId: extraClient.id,
        dueDate: new Date().toISOString().slice(0, 10),
        status: 'todo',
        priority: 'high',
        notes: '',
      },
    ],
  }
  const saved = await req('/api/state', { method: 'PUT', body: JSON.stringify(next) })
  assert(
    saved.clients.some((c: { company: string }) => c.company === 'Deskly QA Co'),
    'client not persisted',
  )
  assert(
    saved.tasks.some((t: { title: string }) => t.title === 'Verify Mongo write path'),
    'task not persisted',
  )

  const again = await req('/api/state')
  assert(again.clients.length === saved.clients.length, 'reload mismatch')
  console.log('persist ok — clients:', again.clients.length, 'tasks:', again.tasks.length)
  console.log('test:api passed')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
