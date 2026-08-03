import 'dotenv/config'
import cors from 'cors'
import express from 'express'
import { connectDb, ensureWorkspace, getHealth, getState, putState, seedState } from './data.js'

const PORT = Number(process.env.PORT || 8787)

async function main() {
  await connectDb()
  await ensureWorkspace()

  const app = express()
  app.use(cors())
  app.use(express.json({ limit: '2mb' }))

  app.get('/api/health', async (_req, res) => {
    res.json(await getHealth())
  })

  app.get('/api/state', async (_req, res) => {
    res.json(await getState())
  })

  app.put('/api/state', async (req, res) => {
    try {
      res.json(await putState(req.body))
    } catch (err) {
      const status = (err as { status?: number }).status ?? 500
      res.status(status).json({ error: err instanceof Error ? err.message : String(err) })
    }
  })

  app.post('/api/seed', async (_req, res) => {
    res.json(await seedState())
  })

  app.listen(PORT, () => {
    console.log(`Deskly API http://localhost:${PORT}`)
  })
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
