import type { AppData } from './types'

const API = '/api'

async function json<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`${res.status} ${path}: ${text}`)
  }
  return res.json() as Promise<T>
}

export function loadData(): Promise<AppData> {
  return json<AppData>('/state')
}

export function saveData(data: AppData): Promise<AppData> {
  return json<AppData>('/state', { method: 'PUT', body: JSON.stringify(data) })
}

export function clearData(): Promise<AppData> {
  return json<AppData>('/seed', { method: 'POST' })
}

export function login(email: string, password: string): Promise<{ ok: true; email: string }> {
  return json('/login', { method: 'POST', body: JSON.stringify({ email, password }) })
}

export function logout(): Promise<{ ok: true }> {
  return json('/logout', { method: 'POST' })
}

export function fetchMe(): Promise<{ email: string }> {
  return json('/me')
}
