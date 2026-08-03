import { useEffect, useMemo, useRef, useState } from 'react'
import { applyActions, parseChat } from './chat/parseIntent'
import { clearData, loadData, saveData } from './store'
import type {
  AppData,
  Client,
  ClientStatus,
  Deliverable,
  DeliverableStatus,
  Task,
  TaskStatus,
  View,
} from './types'
import { monthISO, todayISO, uid } from './types'

type Props = {
  onLogout: () => void
}

export default function DeskApp({ onLogout }: Props) {
  const [data, setData] = useState<AppData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [view, setView] = useState<View>('today')
  const [chatOpen, setChatOpen] = useState(false)
  const skipSave = useRef(true)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    loadData()
      .then((d) => {
        skipSave.current = true
        setData(d)
      })
      .catch((e: Error) => setError(e.message || 'Failed to load from MongoDB API'))
  }, [])

  useEffect(() => {
    if (!data) return
    if (skipSave.current) {
      skipSave.current = false
      return
    }
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      setSaving(true)
      saveData(data)
        .catch((e: Error) => setError(e.message || 'Save failed'))
        .finally(() => setSaving(false))
    }, 400)
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
  }, [data])

  if (error && !data) {
    return (
      <div className="boot-msg">
        <h1>Can&apos;t reach Deskly API</h1>
        <p>{error}</p>
        <p>Run <code>npm run dev</code> (starts API + UI). Check MongoDB URI in <code>.env</code> when you add it.</p>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="boot-msg">
        <p>Loading workspace from MongoDB?</p>
      </div>
    )
  }

  const clientName = (id: string | null) => {
    if (!id) return '?'
    return data.clients.find((c) => c.id === id)?.company ?? '?'
  }

  const patch = (fn: (d: AppData) => AppData) => setData((d) => (d ? fn(d) : d))

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark" aria-hidden />
          <div>
            <p className="brand-name">Deskly</p>
            <p className="brand-sub">Office work desk</p>
          </div>
        </div>
        <nav className="nav">
          {(
            [
              ['today', 'Today'],
              ['tasks', 'Daily tasks'],
              ['deliverables', 'Deliverables'],
              ['clients', 'Clients'],
              ['chat', 'Quick chat'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={view === id ? 'nav-item active' : 'nav-item'}
              onClick={() => setView(id)}
            >
              {label}
            </button>
          ))}
        </nav>
        <div className="sidebar-foot">
          {saving && <p className="row-meta">Saving?</p>}
          {error && <p className="row-meta" style={{ color: 'var(--danger)' }}>{error}</p>}
          <button
            type="button"
            className="ghost"
            onClick={() => {
              if (!confirm('Clear all clients, tasks, and notes in MongoDB?')) return
              clearData()
                .then((d) => {
                  skipSave.current = true
                  setData(d)
                  setError(null)
                })
                .catch((e: Error) => setError(e.message))
            }}
          >
            Clear all data
          </button>
          <div className="account-row">
            <button type="button" className="ghost" onClick={onLogout}>
              Sign out
            </button>
          </div>
        </div>
      </aside>

      <main className="main">
        {view === 'today' && (
          <TodayView
            data={data}
            clientName={clientName}
            onNote={(text) =>
              patch((d) => {
                const date = todayISO()
                const existing = d.dailyNotes.find((n) => n.date === date)
                if (existing) {
                  return {
                    ...d,
                    dailyNotes: d.dailyNotes.map((n) =>
                      n.id === existing.id ? { ...n, text } : n,
                    ),
                  }
                }
                return {
                  ...d,
                  dailyNotes: [...d.dailyNotes, { id: uid(), date, text }],
                }
              })
            }
            onToggleTask={(id) =>
              patch((d) => ({
                ...d,
                tasks: d.tasks.map((t) =>
                  t.id === id
                    ? {
                        ...t,
                        status: t.status === 'done' ? 'todo' : 'done',
                      }
                    : t,
                ),
              }))
            }
            onOpenChat={() => {
              setView('chat')
              setChatOpen(true)
            }}
          />
        )}
        {view === 'clients' && (
          <ClientsView
            clients={data.clients}
            onAdd={(c) => patch((d) => ({ ...d, clients: [...d.clients, c] }))}
            onUpdate={(c) =>
              patch((d) => ({
                ...d,
                clients: d.clients.map((x) => (x.id === c.id ? c : x)),
              }))
            }
            onDelete={(id) =>
              patch((d) => ({
                ...d,
                clients: d.clients.filter((c) => c.id !== id),
              }))
            }
          />
        )}
        {view === 'tasks' && (
          <TasksView
            tasks={data.tasks}
            clients={data.clients}
            clientName={clientName}
            onAdd={(t) => patch((d) => ({ ...d, tasks: [...d.tasks, t] }))}
            onUpdate={(t) =>
              patch((d) => ({
                ...d,
                tasks: d.tasks.map((x) => (x.id === t.id ? t : x)),
              }))
            }
            onDelete={(id) =>
              patch((d) => ({
                ...d,
                tasks: d.tasks.filter((t) => t.id !== id),
              }))
            }
          />
        )}
        {view === 'deliverables' && (
          <DeliverablesView
            items={data.deliverables}
            clients={data.clients}
            clientName={clientName}
            onAdd={(item) =>
              patch((d) => ({ ...d, deliverables: [...d.deliverables, item] }))
            }
            onUpdate={(item) =>
              patch((d) => ({
                ...d,
                deliverables: d.deliverables.map((x) =>
                  x.id === item.id ? item : x,
                ),
              }))
            }
            onDelete={(id) =>
              patch((d) => ({
                ...d,
                deliverables: d.deliverables.filter((x) => x.id !== id),
              }))
            }
          />
        )}
        {view === 'chat' && (
          <ChatView
            data={data}
            focus={chatOpen}
            onApply={(next) => setData(next)}
          />
        )}
      </main>

      {view !== 'chat' && (
        <button
          type="button"
          className="fab"
          onClick={() => {
            setView('chat')
            setChatOpen(true)
          }}
          aria-label="Open quick chat"
        >
          Chat
        </button>
      )}
    </div>
  )
}

function TodayView({
  data,
  clientName,
  onNote,
  onToggleTask,
  onOpenChat,
}: {
  data: AppData
  clientName: (id: string | null) => string
  onNote: (text: string) => void
  onToggleTask: (id: string) => void
  onOpenChat: () => void
}) {
  const today = todayISO()
  const month = monthISO()
  const note = data.dailyNotes.find((n) => n.date === today)?.text ?? ''

  const todaysTasks = useMemo(
    () =>
      data.tasks
        .filter((t) => t.dueDate <= today && t.status !== 'done')
        .sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority)),
    [data.tasks, today],
  )
  const doneToday = data.tasks.filter(
    (t) => t.dueDate === today && t.status === 'done',
  ).length
  const monthDeliverables = data.deliverables.filter((d) => d.month === month)
  const activeClients = data.clients.filter((c) => c.status === 'active')

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <p className="eyebrow">{formatLongDate(today)}</p>
          <h1>Your daily update</h1>
          <p className="lede">
            {todaysTasks.length} open ? {doneToday} done today ?{' '}
            {activeClients.length} active clients
          </p>
        </div>
        <button type="button" className="btn" onClick={onOpenChat}>
          Emergency chat
        </button>
      </header>

      <section className="brief">
        <h2>Standing brief</h2>
        <ul className="brief-list">
          <li>
            <strong>{todaysTasks.length}</strong> tasks due today or overdue
          </li>
          <li>
            <strong>
              {monthDeliverables.filter((d) => d.status !== 'delivered').length}
            </strong>{' '}
            monthly deliverables still open
          </li>
          <li>
            <strong>
              {monthDeliverables.filter((d) => d.status === 'blocked').length}
            </strong>{' '}
            blocked this month
          </li>
        </ul>
      </section>

      <div className="split">
        <section>
          <h2>Today&apos;s tasks</h2>
          {todaysTasks.length === 0 ? (
            <p className="empty">Nothing open for today. Nice.</p>
          ) : (
            <ul className="list">
              {todaysTasks.map((t) => (
                <li key={t.id} className="list-row">
                  <label className="check">
                    <input
                      type="checkbox"
                      checked={false}
                      onChange={() => onToggleTask(t.id)}
                    />
                    <span>
                      <span className="row-title">{t.title}</span>
                      <span className="row-meta">
                        {clientName(t.clientId)} ? {t.dueDate === today ? 'today' : `overdue ${t.dueDate}`} ?{' '}
                        {t.priority}
                      </span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2>This month</h2>
          <ul className="list">
            {monthDeliverables.map((d) => (
              <li key={d.id} className="list-row stacked">
                <span className="row-title">{d.title}</span>
                <span className="row-meta">
                  {clientName(d.clientId)} ?{' '}
                  <span className={`pill status-${d.status}`}>
                    {d.status.replace('_', ' ')}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="note-block">
        <h2>Daily note</h2>
        <textarea
          value={note}
          onChange={(e) => onNote(e.target.value)}
          rows={4}
          placeholder="What matters today?"
        />
      </section>
    </div>
  )
}

function ClientsView({
  clients,
  onAdd,
  onUpdate,
  onDelete,
}: {
  clients: Client[]
  onAdd: (c: Client) => void
  onUpdate: (c: Client) => void
  onDelete: (id: string) => void
}) {
  const [name, setName] = useState('')
  const [company, setCompany] = useState('')

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <p className="eyebrow">Assignments</p>
          <h1>Clients</h1>
        </div>
      </header>

      <form
        className="inline-form"
        onSubmit={(e) => {
          e.preventDefault()
          if (!name.trim() || !company.trim()) return
          onAdd({
            id: uid(),
            name: name.trim(),
            company: company.trim(),
            status: 'active',
            notes: '',
            assignedAt: todayISO(),
          })
          setName('')
          setCompany('')
        }}
      >
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Contact name"
          required
        />
        <input
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          placeholder="Company"
          required
        />
        <button type="submit" className="btn">
          Add client
        </button>
      </form>

      <ul className="card-list">
        {clients.map((c) => (
          <li key={c.id} className="entity">
            <div className="entity-top">
              <div>
                <p className="entity-title">{c.company}</p>
                <p className="row-meta">{c.name}</p>
              </div>
              <select
                value={c.status}
                onChange={(e) =>
                  onUpdate({ ...c, status: e.target.value as ClientStatus })
                }
              >
                <option value="active">active</option>
                <option value="on_hold">on hold</option>
                <option value="archived">archived</option>
              </select>
            </div>
            <textarea
              value={c.notes}
              onChange={(e) => onUpdate({ ...c, notes: e.target.value })}
              rows={2}
              placeholder="Notes"
            />
            <div className="entity-foot">
              <span className="row-meta">Assigned {c.assignedAt}</span>
              <button type="button" className="ghost danger" onClick={() => onDelete(c.id)}>
                Remove
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

function TasksView({
  tasks,
  clients,
  clientName,
  onAdd,
  onUpdate,
  onDelete,
}: {
  tasks: Task[]
  clients: Client[]
  clientName: (id: string | null) => string
  onAdd: (t: Task) => void
  onUpdate: (t: Task) => void
  onDelete: (id: string) => void
}) {
  const [title, setTitle] = useState('')
  const [clientId, setClientId] = useState('')
  const [dueDate, setDueDate] = useState(todayISO())
  const [priority, setPriority] = useState<Task['priority']>('med')

  const sorted = [...tasks].sort((a, b) => a.dueDate.localeCompare(b.dueDate))

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <p className="eyebrow">Day to day</p>
          <h1>Daily tasks</h1>
        </div>
      </header>

      <form
        className="inline-form wrap"
        onSubmit={(e) => {
          e.preventDefault()
          if (!title.trim()) return
          onAdd({
            id: uid(),
            title: title.trim(),
            clientId: clientId || null,
            dueDate,
            status: 'todo',
            priority,
            notes: '',
          })
          setTitle('')
        }}
      >
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Task title"
          required
        />
        <select value={clientId} onChange={(e) => setClientId(e.target.value)}>
          <option value="">No client</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.company}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
        />
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value as Task['priority'])}
        >
          <option value="low">low</option>
          <option value="med">med</option>
          <option value="high">high</option>
        </select>
        <button type="submit" className="btn">
          Add task
        </button>
      </form>

      <ul className="list dense">
        {sorted.map((t) => (
          <li key={t.id} className="list-row task-row">
            <div className="grow">
              <input
                className="plain-input"
                value={t.title}
                onChange={(e) => onUpdate({ ...t, title: e.target.value })}
              />
              <span className="row-meta">
                {clientName(t.clientId)} ? due{' '}
                <input
                  type="date"
                  className="date-inline"
                  value={t.dueDate}
                  onChange={(e) => onUpdate({ ...t, dueDate: e.target.value })}
                />
              </span>
            </div>
            <select
              value={t.status}
              onChange={(e) =>
                onUpdate({ ...t, status: e.target.value as TaskStatus })
              }
            >
              <option value="todo">todo</option>
              <option value="doing">doing</option>
              <option value="done">done</option>
            </select>
            <select
              value={t.priority}
              onChange={(e) =>
                onUpdate({
                  ...t,
                  priority: e.target.value as Task['priority'],
                })
              }
            >
              <option value="low">low</option>
              <option value="med">med</option>
              <option value="high">high</option>
            </select>
            <button type="button" className="ghost danger" onClick={() => onDelete(t.id)}>
              ?
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

function DeliverablesView({
  items,
  clients,
  clientName,
  onAdd,
  onUpdate,
  onDelete,
}: {
  items: Deliverable[]
  clients: Client[]
  clientName: (id: string | null) => string
  onAdd: (d: Deliverable) => void
  onUpdate: (d: Deliverable) => void
  onDelete: (id: string) => void
}) {
  const [title, setTitle] = useState('')
  const [clientId, setClientId] = useState('')
  const [month, setMonth] = useState(monthISO())

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <p className="eyebrow">Month view</p>
          <h1>Monthly deliverables</h1>
        </div>
      </header>

      <form
        className="inline-form wrap"
        onSubmit={(e) => {
          e.preventDefault()
          if (!title.trim()) return
          onAdd({
            id: uid(),
            title: title.trim(),
            clientId: clientId || null,
            month,
            status: 'planned',
            notes: '',
          })
          setTitle('')
        }}
      >
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Deliverable"
          required
        />
        <select value={clientId} onChange={(e) => setClientId(e.target.value)}>
          <option value="">No client</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.company}
            </option>
          ))}
        </select>
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
        />
        <button type="submit" className="btn">
          Add deliverable
        </button>
      </form>

      <ul className="card-list">
        {items.map((d) => (
          <li key={d.id} className="entity">
            <div className="entity-top">
              <div>
                <input
                  className="plain-input entity-title"
                  value={d.title}
                  onChange={(e) => onUpdate({ ...d, title: e.target.value })}
                />
                <p className="row-meta">
                  {clientName(d.clientId)} ? {d.month}
                </p>
              </div>
              <select
                value={d.status}
                onChange={(e) =>
                  onUpdate({
                    ...d,
                    status: e.target.value as DeliverableStatus,
                  })
                }
              >
                <option value="planned">planned</option>
                <option value="in_progress">in progress</option>
                <option value="delivered">delivered</option>
                <option value="blocked">blocked</option>
              </select>
            </div>
            <textarea
              value={d.notes}
              onChange={(e) => onUpdate({ ...d, notes: e.target.value })}
              rows={2}
              placeholder="Notes"
            />
            <div className="entity-foot">
              <span />
              <button type="button" className="ghost danger" onClick={() => onDelete(d.id)}>
                Remove
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

function ChatView({
  data,
  onApply,
}: {
  data: AppData
  focus?: boolean
  onApply: (d: AppData) => void
}) {
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<
    { role: 'user' | 'bot'; text: string }[]
  >([
    {
      role: 'bot',
      text: 'Quick entry mode. Try: ?add task call Northwind tomorrow urgent?, ?add client Sam at Acme?, ?deliverable SLA report for Harbor?, ?done weekly status?, or ?note: stuck on legal?. Gemini can replace this parser later.',
    },
  ])

  const send = () => {
    const text = input.trim()
    if (!text) return
    const result = parseChat(text, data)
    const next = applyActions(data, result.actions)
    onApply(next)
    setMessages((m) => [
      ...m,
      { role: 'user', text },
      { role: 'bot', text: result.reply },
    ])
    setInput('')
  }

  return (
    <div className="page chat-page">
      <header className="page-head">
        <div>
          <p className="eyebrow">Emergency entry</p>
          <h1>Quick chat</h1>
          <p className="lede">
            Type plain text ? prototype creates tasks, clients, notes, and
            deliverables without a form.
          </p>
        </div>
      </header>

      <div className="chat-log">
        {messages.map((m, i) => (
          <div key={i} className={`bubble ${m.role}`}>
            {m.text}
          </div>
        ))}
      </div>

      <form
        className="chat-compose"
        onSubmit={(e) => {
          e.preventDefault()
          send()
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="e.g. add task send invoice for Northwind tomorrow"
          autoFocus
        />
        <button type="submit" className="btn">
          Send
        </button>
      </form>
    </div>
  )
}

function priorityRank(p: Task['priority']) {
  return p === 'high' ? 0 : p === 'med' ? 1 : 2
}

function formatLongDate(iso: string) {
  return new Date(iso + 'T12:00:00').toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
}
