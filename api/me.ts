import { sessionEmail } from '../server/auth.js'
import { sendJson, withHandler } from './_util.js'

export default withHandler(async (req, res) => {
  if (req.method?.toUpperCase() !== 'GET') {
    sendJson(res, 405, { error: 'Method not allowed' })
    return
  }
  const email = sessionEmail(req)
  if (!email) {
    sendJson(res, 401, { error: 'Not signed in' })
    return
  }
  sendJson(res, 200, { email })
})
