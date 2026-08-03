import { createHmac, timingSafeEqual } from 'node:crypto'
import type { IncomingMessage, ServerResponse } from 'node:http'

const COOKIE = 'deskly_session'
const MAX_AGE_SEC = 60 * 60 * 24 * 30 // 30 days

export function unauthorized(message = 'Unauthorized') {
  const err = new Error(message) as Error & { status: number }
  err.status = 401
  return err
}

function sessionSecret(): string {
  const s = process.env.SESSION_SECRET?.trim()
  if (!s) throw authNotConfigured('SESSION_SECRET is not configured')
  return s
}

export function configuredEmail(): string {
  return (process.env.DESKLY_USER || process.env.AUTH_EMAIL || '').trim()
}

export function configuredPassword(): string {
  return process.env.DESKLY_PASSWORD ?? process.env.AUTH_PASSWORD ?? ''
}

/** True when login id + password env are present (SESSION_SECRET checked separately). */
export function credentialsConfigured(): boolean {
  return Boolean(configuredEmail() && configuredPassword())
}

function authNotConfigured(message: string) {
  const err = new Error(message) as Error & { status: number }
  err.status = 503
  return err
}

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ba.length !== bb.length) {
    // ponytail: still touch timingSafeEqual so length mismatch doesn't short-circuit cheaply
    timingSafeEqual(ba, ba)
    return false
  }
  return timingSafeEqual(ba, bb)
}

/**
 * Login id is treated as an opaque username (email-like strings OK; no TLD required).
 * Comparison is exact after trim on the id; password is exact (no trim).
 */
export function verifyCredentials(email: string, password: string): boolean {
  const wantEmail = configuredEmail()
  const wantPass = configuredPassword()
  if (!wantEmail || !wantPass) return false
  return safeEqual(email.trim(), wantEmail) && safeEqual(password, wantPass)
}

function b64urlJson(obj: unknown): string {
  return Buffer.from(JSON.stringify(obj), 'utf8').toString('base64url')
}

function parseB64urlJson<T>(raw: string): T | null {
  try {
    return JSON.parse(Buffer.from(raw, 'base64url').toString('utf8')) as T
  } catch {
    return null
  }
}

function sign(payload: string): string {
  const sig = createHmac('sha256', sessionSecret()).update(payload).digest('base64url')
  return `${payload}.${sig}`
}

function unsign(token: string): string | null {
  const i = token.lastIndexOf('.')
  if (i < 0) return null
  const payload = token.slice(0, i)
  const sig = token.slice(i + 1)
  const expected = createHmac('sha256', sessionSecret()).update(payload).digest('base64url')
  if (!safeEqual(sig, expected)) return null
  return payload
}

function cookieSecure(): boolean {
  return Boolean(process.env.VERCEL) || process.env.NODE_ENV === 'production'
}

export function setSessionCookie(res: ServerResponse, email: string) {
  const payload = b64urlJson({
    sub: email.trim(),
    exp: Date.now() + MAX_AGE_SEC * 1000,
  })
  const token = sign(payload)
  const parts = [
    `${COOKIE}=${token}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${MAX_AGE_SEC}`,
  ]
  if (cookieSecure()) parts.push('Secure')
  res.setHeader('Set-Cookie', parts.join('; '))
}

export function clearSessionCookie(res: ServerResponse) {
  const parts = [
    `${COOKIE}=`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=0',
  ]
  if (cookieSecure()) parts.push('Secure')
  res.setHeader('Set-Cookie', parts.join('; '))
}

function parseCookies(req: IncomingMessage): Record<string, string> {
  const header = req.headers.cookie
  if (!header) return {}
  const out: Record<string, string> = {}
  for (const part of header.split(';')) {
    const idx = part.indexOf('=')
    if (idx < 0) continue
    const k = part.slice(0, idx).trim()
    const v = part.slice(idx + 1).trim()
    if (k) out[k] = decodeURIComponent(v)
  }
  return out
}

/** Workspace id for the single configured user (stable, not the raw password). */
export function workspaceIdForEmail(email: string): string {
  return email.trim().toLowerCase()
}

/** Require signed session cookie; returns workspace user id. */
export async function requireUserId(
  req: IncomingMessage & { headers: IncomingMessage['headers'] },
): Promise<string> {
  const cookies = parseCookies(req)
  const token = cookies[COOKIE]
  if (!token) throw unauthorized('Not signed in')

  let payloadRaw: string | null
  try {
    payloadRaw = unsign(token)
  } catch (err) {
    if ((err as { status?: number }).status === 401) throw err
    throw unauthorized('Invalid session')
  }
  if (!payloadRaw) throw unauthorized('Invalid session')

  const data = parseB64urlJson<{ sub?: string; exp?: number }>(payloadRaw)
  if (!data?.sub || typeof data.exp !== 'number') throw unauthorized('Invalid session')
  if (Date.now() > data.exp) throw unauthorized('Session expired')

  const want = configuredEmail()
  if (!want || !safeEqual(data.sub.trim(), want)) throw unauthorized('Invalid session')

  return workspaceIdForEmail(data.sub)
}

export function sessionEmail(
  req: IncomingMessage & { headers: IncomingMessage['headers'] },
): string | null {
  try {
    const cookies = parseCookies(req)
    const token = cookies[COOKIE]
    if (!token) return null
    const payloadRaw = unsign(token)
    if (!payloadRaw) return null
    const data = parseB64urlJson<{ sub?: string; exp?: number }>(payloadRaw)
    if (!data?.sub || typeof data.exp !== 'number') return null
    if (Date.now() > data.exp) return null
    const want = configuredEmail()
    if (!want || !safeEqual(data.sub.trim(), want)) return null
    return data.sub.trim()
  } catch {
    return null
  }
}
