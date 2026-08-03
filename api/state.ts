import { getState, putState } from '../server/data.js'
import { requireUserId } from '../server/auth.js'
import { sendJson, withHandler } from './_util.js'

export default withHandler(async (req, res) => {
  const userId = await requireUserId(req)
  const method = req.method?.toUpperCase()
  if (method === 'GET') {
    sendJson(res, 200, await getState(userId))
    return
  }
  if (method === 'PUT') {
    sendJson(res, 200, await putState(userId, req.body))
    return
  }
  sendJson(res, 405, { error: 'Method not allowed' })
})
