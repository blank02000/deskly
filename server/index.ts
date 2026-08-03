import 'dotenv/config'
import cors from 'cors'
import express from 'express'
import {
  clearSessionCookie,
  credentialsConfigured,
  requireUserId,
  sessionEmail,
  setSessionCookie,
  verifyCredentials,
} from './auth.js'
import { clearState, connectDb, getHealth, getState, putState } from './data.js'

const PORT = Number(process.env.PORT || 8787)

async function main() {
  await connectDb()

  const app = express()
  app.use(cors({ origin: true, credentials: true }))
  app.use(express.json({ limit: '2mb' }))

  app.get('/api/health', async (_req, res) => {
    res.json(await getHealth())
  })

  app.post('/api/login', (req, res) => {
    try {
      if (!credentialsConfigured() || !process.env.SESSION_SECRET?.trim()) {
        res.status(503).json({ error: 'Auth not configured' })
        return
      }
      const email = String((req.body as { email?: string })?.email ?? '')
      const password = String((req.body as { password?: string })?.password ?? '')
      if (!verifyCredentials(email, password)) {
        res.status(401).json({ error: 'Invalid email or password' })
        return
      }
      setSessionCookie(res, email.trim())
      res.json({ ok: true, email: email.trim() })
    } catch (err) {
      const status = (err as { status?: number }).status ?? 500
      res.status(status).json({ error: err instanceof Error ? err.message : String(err) })
    }
  })

  app.post('/api/logout', (_req, res) => {
    clearSessionCookie(res)
    res.json({ ok: true })
  })

  app.get('/api/me', (req, res) => {
    try {
      const email = sessionEmail(req)
      if (!email) {
        res.status(401).json({ error: 'Not signed in' })
        return
      }
      res.json({ email })
    } catch (err) {
      const status = (err as { status?: number }).status ?? 500
      res.status(status).json({ error: err instanceof Error ? err.message : String(err) })
    }
  })

  app.get('/api/state', async (req, res) => {
    try {
      const userId = await requireUserId(req)
      res.json(await getState(userId))
    } catch (err) {
      const status = (err as { status?: number }).status ?? 500
      res.status(status).json({ error: err instanceof Error ? err.message : String(err) })
    }
  })

  app.put('/api/state', async (req, res) => {
    try {
      const userId = await requireUserId(req)
      res.json(await putState(userId, req.body))
    } catch (err) {
      const status = (err as { status?: number }).status ?? 500
      res.status(status).json({ error: err instanceof Error ? err.message : String(err) })
    }
  })

  app.post('/api/seed', async (req, res) => {
    try {
      const userId = await requireUserId(req)
      res.json(await clearState(userId))
    } catch (err) {
      const status = (err as { status?: number }).status ?? 500
      res.status(status).json({ error: err instanceof Error ? err.message : String(err) })
    }
  })

  app.listen(PORT, () => {
    console.log(`Deskly API http://localhost:${PORT}`)
  })
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
