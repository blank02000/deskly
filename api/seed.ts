import { seedState } from '../server/data.js'
import { sendJson, withHandler } from './_util.js'

export default withHandler(async (req, res) => {
  if (req.method?.toUpperCase() !== 'POST') {
    sendJson(res, 405, { error: 'Method not allowed' })
    return
  }
  sendJson(res, 200, await seedState())
})
