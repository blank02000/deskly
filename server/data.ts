import mongoose from 'mongoose'
import { Workspace } from './models.js'
import { buildSeed } from './seed.js'

export type DbMode = 'atlas' | 'memory'

let connectPromise: Promise<DbMode> | null = null
let dbMode: DbMode | null = null

export async function connectDb(): Promise<DbMode> {
  if (dbMode && mongoose.connection.readyState === 1) return dbMode
  if (connectPromise) return connectPromise

  connectPromise = (async () => {
    const uri = process.env.MONGODB_URI?.trim()
    if (uri) {
      await mongoose.connect(uri)
      dbMode = 'atlas'
      console.log('MongoDB: connected via MONGODB_URI')
      return dbMode
    }

    if (process.env.VERCEL) {
      throw new Error('MONGODB_URI is required on Vercel (in-memory Mongo is local-only)')
    }

    // ponytail: dynamic import so Vercel never bundles mongodb-memory-server
    const { MongoMemoryServer } = await import('mongodb-memory-server')
    const mem = await MongoMemoryServer.create()
    await mongoose.connect(mem.getUri())
    dbMode = 'memory'
    console.log('MongoDB: in-memory (set MONGODB_URI in .env when you have Atlas/API)')
    return dbMode
  })()

  try {
    return await connectPromise
  } catch (err) {
    connectPromise = null
    throw err
  }
}

export async function ensureWorkspace() {
  let doc = await Workspace.findById('default')
  if (!doc) {
    doc = await Workspace.create({ _id: 'default', ...buildSeed() })
    console.log('Seeded default workspace')
  }
  return doc
}

export function toAppData(doc: InstanceType<typeof Workspace>) {
  return {
    clients: doc.clients,
    tasks: doc.tasks,
    deliverables: doc.deliverables,
    dailyNotes: doc.dailyNotes,
  }
}

export async function getHealth() {
  const mode = await connectDb()
  return {
    ok: true as const,
    mongo: mode,
    readyState: mongoose.connection.readyState,
  }
}

export async function getState() {
  await connectDb()
  const doc = await ensureWorkspace()
  return toAppData(doc)
}

export async function putState(body: unknown) {
  await connectDb()
  const { clients, tasks, deliverables, dailyNotes } = (body ?? {}) as Record<string, unknown>
  if (
    !Array.isArray(clients) ||
    !Array.isArray(tasks) ||
    !Array.isArray(deliverables) ||
    !Array.isArray(dailyNotes)
  ) {
    const err = new Error('Invalid payload: need clients, tasks, deliverables, dailyNotes arrays')
    ;(err as Error & { status: number }).status = 400
    throw err
  }
  const doc = await Workspace.findByIdAndUpdate(
    'default',
    { clients, tasks, deliverables, dailyNotes },
    { new: true, upsert: true },
  )
  return toAppData(doc!)
}

export async function seedState() {
  await connectDb()
  const seed = buildSeed()
  const doc = await Workspace.findByIdAndUpdate('default', seed, {
    new: true,
    upsert: true,
  })
  return toAppData(doc!)
}
