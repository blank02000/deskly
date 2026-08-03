import type { AppData, Client, Deliverable, Task } from '../types'
import { monthISO, todayISO, uid } from '../types'

export type ChatAction =
  | { type: 'task'; task: Omit<Task, 'id'> }
  | { type: 'client'; client: Omit<Client, 'id'> }
  | { type: 'deliverable'; deliverable: Omit<Deliverable, 'id'> }
  | { type: 'note'; text: string }
  | { type: 'complete_task'; titleHint: string }

export interface ParseResult {
  reply: string
  actions: ChatAction[]
}

/**
 * Heuristic parser for the prototype.
 * Swap this for Gemini later — same ChatAction shape.
 */
export function parseChat(input: string, data: AppData): ParseResult {
  const text = input.trim()
  const lower = text.toLowerCase()
  if (!text) {
    return { reply: 'Say something like “add task call Acme tomorrow” or “daily note: finished QBR prep”.', actions: [] }
  }

  const findClient = (hint: string) =>
    data.clients.find(
      (c) =>
        c.name.toLowerCase().includes(hint) ||
        c.company.toLowerCase().includes(hint),
    )

  // Daily note
  if (/^(daily\s*note|note|update)\s*[:\-]/i.test(lower) || lower.startsWith('log ')) {
    const body = text.replace(/^(daily\s*note|note|update|log)\s*[:\-]?\s*/i, '').trim()
    return {
      reply: `Logged today's note.`,
      actions: [{ type: 'note', text: body || text }],
    }
  }

  // Complete task
  const doneMatch = lower.match(/^(done|complete|finish(ed)?)\s+(.+)/)
  if (doneMatch) {
    const hint = doneMatch[3].trim()
    return {
      reply: `Marked matching task done: “${hint}”.`,
      actions: [{ type: 'complete_task', titleHint: hint }],
    }
  }

  // Add client
  if (/^(add|new)\s+client\b/.test(lower)) {
    const rest = text.replace(/^(add|new)\s+client\s*/i, '').replace(/^[:\-]\s*/, '')
    const [namePart, ...companyParts] = rest.split(/\s+at\s+|\s+from\s+|\s*[-–—]\s*/i)
    const name = (namePart || rest || 'New contact').trim()
    const company = companyParts.join(' ').trim() || name
    return {
      reply: `Added client ${name}${company !== name ? ` (${company})` : ''}.`,
      actions: [
        {
          type: 'client',
          client: {
            name,
            company,
            status: 'active',
            notes: '',
            assignedAt: todayISO(),
          },
        },
      ],
    }
  }

  // Add deliverable
  if (/deliverable|monthly\s+deliver/.test(lower)) {
    const title = text
      .replace(/^(add|new|create)\s+/i, '')
      .replace(/\b(monthly\s+)?deliverable\s*(for\s+)?/i, '')
      .replace(/^[:\-]\s*/, '')
      .trim() || 'Monthly deliverable'
    let clientId: string | null = null
    for (const c of data.clients) {
      if (lower.includes(c.company.toLowerCase().split(' ')[0]!) || lower.includes(c.name.toLowerCase().split(' ')[0]!)) {
        clientId = c.id
        break
      }
    }
    return {
      reply: `Added monthly deliverable “${title}”.`,
      actions: [
        {
          type: 'deliverable',
          deliverable: {
            title,
            clientId,
            month: monthISO(),
            status: 'planned',
            notes: '',
          },
        },
      ],
    }
  }

  // Add task (default for “add/task/todo/remind”)
  if (/^(add|new|create|todo|task|remind)\b/.test(lower) || /\btask\b/.test(lower)) {
    let title = text
      .replace(/^(add|new|create|todo|task|remind(er)?)\s*(me\s+to\s+)?/i, '')
      .replace(/^[:\-]\s*/, '')
      .trim()

    let dueDate = todayISO()
    if (/\btomorrow\b/i.test(title)) {
      const d = new Date()
      d.setDate(d.getDate() + 1)
      dueDate = d.toISOString().slice(0, 10)
      title = title.replace(/\btomorrow\b/gi, '').trim()
    } else if (/\btoday\b/i.test(title)) {
      title = title.replace(/\btoday\b/gi, '').trim()
    }

    let priority: Task['priority'] = 'med'
    if (/\burgent|asap|high\b/i.test(title)) {
      priority = 'high'
      title = title.replace(/\b(urgent|asap|high)\b/gi, '').trim()
    }

    let clientId: string | null = null
    const forMatch = title.match(/\bfor\s+([a-z0-9 .&'-]+)$/i)
    if (forMatch) {
      const hint = forMatch[1].trim().toLowerCase()
      const c = findClient(hint)
      if (c) {
        clientId = c.id
        title = title.replace(forMatch[0], '').trim()
      }
    } else {
      for (const c of data.clients) {
        const token = c.company.toLowerCase().split(/\s+/)[0]!
        if (token.length > 3 && lower.includes(token)) {
          clientId = c.id
          break
        }
      }
    }

    title = title.replace(/\s{2,}/g, ' ').replace(/^[:\-]\s*/, '') || 'Untitled task'

    return {
      reply: `Created task “${title}” due ${dueDate}.`,
      actions: [
        {
          type: 'task',
          task: {
            title,
            clientId,
            dueDate,
            status: 'todo',
            priority,
            notes: '',
          },
        },
      ],
    }
  }

  // Fallback: treat as daily note
  return {
    reply: `Saved as today's note. Tip: start with “add task…”, “add client…”, “deliverable…”, or “done …”.`,
    actions: [{ type: 'note', text }],
  }
}

export function applyActions(data: AppData, actions: ChatAction[]): AppData {
  let next = { ...data }
  for (const action of actions) {
    if (action.type === 'task') {
      next = { ...next, tasks: [...next.tasks, { ...action.task, id: uid() }] }
    } else if (action.type === 'client') {
      next = { ...next, clients: [...next.clients, { ...action.client, id: uid() }] }
    } else if (action.type === 'deliverable') {
      next = {
        ...next,
        deliverables: [...next.deliverables, { ...action.deliverable, id: uid() }],
      }
    } else if (action.type === 'note') {
      const date = todayISO()
      const existing = next.dailyNotes.find((n) => n.date === date)
      if (existing) {
        next = {
          ...next,
          dailyNotes: next.dailyNotes.map((n) =>
            n.id === existing.id
              ? { ...n, text: `${n.text}\n${action.text}`.trim() }
              : n,
          ),
        }
      } else {
        next = {
          ...next,
          dailyNotes: [...next.dailyNotes, { id: uid(), date, text: action.text }],
        }
      }
    } else if (action.type === 'complete_task') {
      const hint = action.titleHint.toLowerCase()
      const match = next.tasks.find(
        (t) => t.status !== 'done' && t.title.toLowerCase().includes(hint),
      )
      if (match) {
        next = {
          ...next,
          tasks: next.tasks.map((t) =>
            t.id === match.id ? { ...t, status: 'done' as const } : t,
          ),
        }
      }
    }
  }
  return next
}
