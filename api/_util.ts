import type { IncomingMessage, ServerResponse } from 'node:http'

type Handler = (req: IncomingMessage & { method?: string; body?: unknown }, res: ServerResponse) => Promise<void>

export function sendJson(res: ServerResponse, status: number, data: unknown) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(data))
}

export function withHandler(fn: Handler) {
  return async (req: IncomingMessage & { method?: string; body?: unknown }, res: ServerResponse) => {
    try {
      await fn(req, res)
    } catch (err) {
      const status = (err as { status?: number }).status ?? 500
      sendJson(res, status, { error: err instanceof Error ? err.message : String(err) })
    }
  }
}
