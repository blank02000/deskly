import { randomUUID } from 'node:crypto'

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function monthISO() {
  return new Date().toISOString().slice(0, 7)
}

/** Sample office data used on first boot and /api/seed. */
export function buildSeed() {
  const c1 = randomUUID()
  const c2 = randomUUID()
  const c3 = randomUUID()
  const today = todayISO()
  const month = monthISO()

  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowISO = tomorrow.toISOString().slice(0, 10)

  return {
    clients: [
      {
        id: c1,
        name: 'Priya Nair',
        company: 'Northwind Logistics',
        status: 'active',
        notes: 'Weekly ops sync Fridays.',
        assignedAt: '2026-04-12',
      },
      {
        id: c2,
        name: 'Marcus Chen',
        company: 'Harbor Analytics',
        status: 'active',
        notes: 'Monthly dashboard pack.',
        assignedAt: '2026-01-08',
      },
      {
        id: c3,
        name: 'Elena Rossi',
        company: 'Brightline HR',
        status: 'on_hold',
        notes: 'Paused until contract renewal.',
        assignedAt: '2025-11-20',
      },
    ],
    tasks: [
      {
        id: randomUUID(),
        title: 'Send Northwind weekly status',
        clientId: c1,
        dueDate: today,
        status: 'todo',
        priority: 'high',
        notes: '',
      },
      {
        id: randomUUID(),
        title: 'Review Harbor KPI draft',
        clientId: c2,
        dueDate: today,
        status: 'doing',
        priority: 'med',
        notes: 'Focus on churn chart.',
      },
      {
        id: randomUUID(),
        title: 'Prep QBR talking points',
        clientId: c2,
        dueDate: tomorrowISO,
        status: 'todo',
        priority: 'med',
        notes: '',
      },
      {
        id: randomUUID(),
        title: 'File timesheet',
        clientId: null,
        dueDate: today,
        status: 'todo',
        priority: 'low',
        notes: 'Internal',
      },
    ],
    deliverables: [
      {
        id: randomUUID(),
        title: 'Monthly ops report',
        clientId: c1,
        month,
        status: 'in_progress',
        notes: 'Due last Friday of month.',
      },
      {
        id: randomUUID(),
        title: 'Executive dashboard pack',
        clientId: c2,
        month,
        status: 'planned',
        notes: '',
      },
      {
        id: randomUUID(),
        title: 'Onboarding checklist refresh',
        clientId: c3,
        month,
        status: 'blocked',
        notes: 'Waiting on legal.',
      },
    ],
    dailyNotes: [
      {
        id: randomUUID(),
        date: today,
        text: 'Focus: Northwind status + Harbor KPI review. Flag Brightline hold in standup.',
      },
    ],
  }
}
