import { getState, putState } from '../server/data.js'
import { sendJson, withHandler } from './_util.js'

export default withHandler(async (req, res) => {
  const method = req.method?.toUpperCase()
  if (method === 'GET') {
    sendJson(res, 200, await getState())
    return
  }
  if (method === 'PUT') {
    sendJson(res, 200, await putState(req.body))
    return
  }
  sendJson(res, 405, { error: 'Method not allowed' })
})