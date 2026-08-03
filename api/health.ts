import { getHealth } from '../server/data.js'
import { sendJson, withHandler } from './_util.js'

export default withHandler(async (_req, res) => {
  sendJson(res, 200, await getHealth())
})
