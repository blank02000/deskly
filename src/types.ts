export type Id = string

export type TaskStatus = 'todo' | 'doing' | 'done'
export type DeliverableStatus = 'planned' | 'in_progress' | 'delivered' | 'blocked'
export type ClientStatus = 'active' | 'on_hold' | 'archived'

export interface Client {
  id: Id
  name: string
  company: string
  status: ClientStatus
  notes: string
  assignedAt: string
}

export interface Task {
  id: Id
  title: string
  clientId: Id | null
  dueDate: string
  status: TaskStatus
  priority: 'low' | 'med' | 'high'
  notes: string
}

export interface Deliverable {
  id: Id
  title: string
  clientId: Id | null
  month: string // YYYY-MM
  status: DeliverableStatus
  notes: string
}

export interface DailyNote {
  id: Id
  date: string // YYYY-MM-DD
  text: string
}

export interface AppData {
  clients: Client[]
  tasks: Task[]
  deliverables: Deliverable[]
  dailyNotes: DailyNote[]
}

export type View = 'today' | 'clients' | 'tasks' | 'deliverables' | 'chat'

export function uid(): Id {
  return crypto.randomUUID()
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

export function monthISO(d = new Date()): string {
  return d.toISOString().slice(0, 7)
}
