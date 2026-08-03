import 'dotenv/config'
import cors from 'cors'
import express from 'express'
import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'
import { Workspace } from './models.js'
import { buildSeed } from './seed.js'

const PORT = Number(process.env.PORT || 8787)

async function connectDb() {
  const uri = process.env.MONGODB_URI?.trim()
  if (uri) {
    await mongoose.connect(uri)
    console.log('MongoDB: connected via MONGODB_URI')
    return { mode: 'atlas' as const }
  }

  // ponytail: no URI yet — in-memory Mongo so we can fully test today
  const mem = await MongoMemoryServer.create()
  await mongoose.connect(mem.getUri())
  console.log('MongoDB: in-memory (set MONGODB_URI in .env when you have Atlas/API)')
  return { mode: 'memory' as const, mem }
}

async function ensureWorkspace() {
  let doc = await Workspace.findById('default')
  if (!doc) {
    doc = await Workspace.create({ _id: 'default', ...buildSeed() })
    console.log('Seeded default workspace')
  }
  return doc
}

function toAppData(doc: InstanceType<typeof Workspace>) {
  return {
    clients: doc.clients,
    tasks: doc.tasks,
    deliverables: doc.deliverables,
    dailyNotes: doc.dailyNotes,
  }
}

async function main() {
  const db = await connectDb()
  await ensureWorkspace()

  const app = express()
  app.use(cors())
  app.use(express.json({ limit: '2mb' }))

  app.get('/api/health', async (_req, res) => {
    res.json({
      ok: true,
      mongo: db.mode,
      readyState: mongoose.connection.readyState,
    })
  })

  app.get('/api/state', async (_req, res) => {
    const doc = await ensureWorkspace()
    res.json(toAppData(doc))
  })

  app.put('/api/state', async (req, res) => {
    const { clients, tasks, deliverables, dailyNotes } = req.body ?? {}
    if (!Array.isArray(clients) || !Array.isArray(tasks) || !Array.isArray(deliverables) || !Array.isArray(dailyNotes)) {
      res.status(400).json({ error: 'Invalid payload: need clients, tasks, deliverables, dailyNotes arrays' })
      return
    }
    const doc = await Workspace.findByIdAndUpdate(
      'default',
      { clients, tasks, deliverables, dailyNotes },
      { new: true, upsert: true },
    )
    res.json(toAppData(doc!))
  })

  app.post('/api/seed', async (_req, res) => {
    const seed = buildSeed()
    const doc = await Workspace.findByIdAndUpdate('default', seed, {
      new: true,
      upsert: true,
    })
    res.json(toAppData(doc!))
  })

  app.listen(PORT, () => {
    console.log(`Deskly API http://localhost:${PORT}`)
  })
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
