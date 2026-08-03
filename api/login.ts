import { setSessionCookie, verifyCredentials } from '../server/auth.js'
import { readJsonBody, sendJson, withHandler } from './_util.js'

export default withHandler(async (req, res) => {
  if (req.method?.toUpperCase() !== 'POST') {
    sendJson(res, 405, { error: 'Method not allowed' })
    return
  }
  const body = (await readJsonBody(req)) as { email?: string; password?: string }
  const email = String(body?.email ?? '')
  const password = String(body?.password ?? '')
  if (!verifyCredentials(email, password)) {
    sendJson(res, 401, { error: 'Invalid email or password' })
    return
  }
  setSessionCookie(res, email.trim())
  sendJson(res, 200, { ok: true, email: email.trim() })
})
