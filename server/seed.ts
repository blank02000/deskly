/** Empty workspace used on first authenticated load and "Clear all data". */
export function buildEmpty() {
  return {
    clients: [],
    tasks: [],
    deliverables: [],
    dailyNotes: [],
  }
}
