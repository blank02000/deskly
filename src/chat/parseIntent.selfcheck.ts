import { applyActions, parseChat } from './parseIntent'
import type { AppData } from '../types'

/** ponytail: tiny assert demo — no test runner. Fail loudly if chat actions break. */
function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg)
}

const empty: AppData = {
  clients: [],
  tasks: [],
  deliverables: [],
  dailyNotes: [],
}

const r1 = parseChat('add task call client tomorrow urgent', empty)
assert(r1.actions[0]?.type === 'task', 'expected task action')
const d1 = applyActions(empty, r1.actions)
assert(d1.tasks.length === 1, 'task not created')
assert(d1.tasks[0]!.priority === 'high', 'urgent should be high')

const r2 = parseChat('add client Sam at Acme Co', d1)
const d2 = applyActions(d1, r2.actions)
assert(d2.clients.length === 1 && d2.clients[0]!.company.includes('Acme'), 'client missing')

const r3 = parseChat('note: hello desk', d2)
const d3 = applyActions(d2, r3.actions)
assert(d3.dailyNotes.length === 1, 'note missing')

console.log('parseIntent self-check ok')
