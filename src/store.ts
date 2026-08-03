import type { AppData } from './types'

const API = '/api'

async function json<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
    ...init,
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

export function resetData(): Promise<AppData> {
  return json<AppData>('/seed', { method: 'POST' })
}
