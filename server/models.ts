import mongoose, { Schema } from 'mongoose'

const ClientSchema = new Schema(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    company: { type: String, required: true },
    status: { type: String, enum: ['active', 'on_hold', 'archived'], default: 'active' },
    notes: { type: String, default: '' },
    assignedAt: { type: String, required: true },
  },
  { _id: false },
)

const TaskSchema = new Schema(
  {
    id: { type: String, required: true },
    title: { type: String, required: true },
    clientId: { type: String, default: null },
    dueDate: { type: String, required: true },
    status: { type: String, enum: ['todo', 'doing', 'done'], default: 'todo' },
    priority: { type: String, enum: ['low', 'med', 'high'], default: 'med' },
    notes: { type: String, default: '' },
  },
  { _id: false },
)

const DeliverableSchema = new Schema(
  {
    id: { type: String, required: true },
    title: { type: String, required: true },
    clientId: { type: String, default: null },
    month: { type: String, required: true },
    status: {
      type: String,
      enum: ['planned', 'in_progress', 'delivered', 'blocked'],
      default: 'planned',
    },
    notes: { type: String, default: '' },
  },
  { _id: false },
)

const DailyNoteSchema = new Schema(
  {
    id: { type: String, required: true },
    date: { type: String, required: true },
    text: { type: String, default: '' },
  },
  { _id: false },
)

// _id = signed-in user id (email, normalized) — one private workspace per user
const WorkspaceSchema = new Schema({
  _id: { type: String, required: true },
  clients: { type: [ClientSchema], default: [] },
  tasks: { type: [TaskSchema], default: [] },
  deliverables: { type: [DeliverableSchema], default: [] },
  dailyNotes: { type: [DailyNoteSchema], default: [] },
})

export const Workspace = mongoose.model('Workspace', WorkspaceSchema)
