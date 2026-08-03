import type { IncomingMessage, ServerResponse } from 'node:http'

type Req = IncomingMessage & { method?: string; body?: unknown }

type Handler = (req: Req, res: ServerResponse) => Promise<void>

export function sendJson(res: ServerResponse, status: number, data: unknown) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(data))
}

export async function readJsonBody(req: Req): Promise<unknown> {
  if (req.body !== undefined && req.body !== null && typeof req.body === 'object') {
    return req.body
  }
  const chunks: Buffer[] = []
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
  }
  const raw = Buffer.concat(chunks).toString('utf8').trim()
  if (!raw) return {}
  return JSON.parse(raw) as unknown
}

export function withHandler(fn: Handler) {
  return async (req: Req, res: ServerResponse) => {
    try {
      await fn(req, res)
    } catch (err) {
      const status = (err as { status?: number }).status ?? 500
      sendJson(res, status, { error: err instanceof Error ? err.message : String(err) })
    }
  }
}
