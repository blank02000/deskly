/**
 * End-to-end API check against a live Deskly server.
 * Run: npm run test:api  (server must be up, with DESKLY_* + SESSION_SECRET in env)
 */
const BASE = process.env.API_URL || 'http://localhost:8787'
const EMAIL = (process.env.DESKLY_USER || process.env.AUTH_EMAIL || '').trim()
const PASSWORD = process.env.DESKLY_PASSWORD ?? process.env.AUTH_PASSWORD ?? ''

let cookie = ''

async function req(path: string, init?: RequestInit) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((init?.headers as Record<string, string>) || {}),
  }
  if (cookie) headers.Cookie = cookie
  const res = await fetch(`${BASE}${path}`, { ...init, headers })
  const setCookie = res.headers.getSetCookie?.() ?? []
  for (const c of setCookie) {
    const pair = c.split(';')[0]
    if (pair?.startsWith('deskly_session=')) cookie = pair
  }
  // Node < 19.7 fallback: single set-cookie
  const single = res.headers.get('set-cookie')
  if (!setCookie.length && single?.startsWith('deskly_session=')) {
    cookie = single.split(';')[0]
  }
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(`${init?.method || 'GET'} ${path} ? ${res.status} ${JSON.stringify(body)}`)
  return body
}

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg)
}

async function main() {
  const health = await req('/api/health')
  assert(health.ok === true, 'health failed')
  console.log('health:', health)

  const unauth = await fetch(`${BASE}/api/state`)
  assert(unauth.status === 401, `state should be 401 without cookie, got ${unauth.status}`)
  const unauthSeed = await fetch(`${BASE}/api/seed`, { method: 'POST' })
  assert(unauthSeed.status === 401, `seed should be 401 without cookie, got ${unauthSeed.status}`)
  console.log('auth gate ok (401 without session)')

  if (!EMAIL || !PASSWORD) {
    console.log('test:api passed (set DESKLY_USER + DESKLY_PASSWORD to also test login/persist)')
    return
  }

  await req('/api/login', {
    method: 'POST',
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  })
  assert(cookie.includes('deskly_session='), 'login should set session cookie')

  const me = await req('/api/me')
  assert(me.email === EMAIL, 'me email mismatch')

  const cleared = await req('/api/seed', { method: 'POST' })
  assert(Array.isArray(cleared.clients) && cleared.clients.length === 0, 'clear clients')
  assert(Array.isArray(cleared.tasks) && cleared.tasks.length === 0, 'clear tasks')
  console.log('cleared empty workspace')

  const extraClient = {
    id: crypto.randomUUID(),
    name: 'Test User',
    company: 'Deskly QA Co',
    status: 'active',
    notes: 'Inserted by test:api',
    assignedAt: new Date().toISOString().slice(0, 10),
  }
  const next = {
    clients: [extraClient],
    tasks: [
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
    deliverables: [],
    dailyNotes: [],
  }
  const saved = await req('/api/state', { method: 'PUT', body: JSON.stringify(next) })
  assert(
    saved.clients.some((c: { company: string }) => c.company === 'Deskly QA Co'),
    'client not persisted',
  )

  const again = await req('/api/state')
  assert(again.clients.length === saved.clients.length, 'reload mismatch')

  await req('/api/logout', { method: 'POST' })
  cookie = ''
  const afterLogout = await fetch(`${BASE}/api/me`)
  assert(afterLogout.status === 401, 'me should 401 after logout')

  console.log('persist ok ? clients:', again.clients.length, 'tasks:', again.tasks.length)
  console.log('test:api passed')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
