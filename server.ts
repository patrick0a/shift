/**
 * Custom Next.js server with Socket.IO bolted onto the same HTTP listener.
 *
 * One process, one port — `npm run dev` gives you the app *and* realtime sync
 * with no extra infrastructure. Socket.IO owns `/api/realtime`; Next handles
 * everything else.
 */

import { createServer } from 'node:http'
import next from 'next'

import { attachSocketServer } from './src/server/socket'

const dev = process.env.NODE_ENV !== 'production'
const hostname = process.env.HOST ?? '0.0.0.0'
const port = Number(process.env.PORT ?? 3000)

const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

async function main() {
  await app.prepare()

  const server = createServer((req, res) => {
    handle(req, res).catch((err) => {
      console.error('[next] request failed', err)
      res.statusCode = 500
      res.end('Internal Server Error')
    })
  })

  attachSocketServer(server)

  server.listen(port, hostname, () => {
    const shown = hostname === '0.0.0.0' ? 'localhost' : hostname
    console.log(`\n  Codenames: Shift  →  http://${shown}:${port}`)
    console.log(`  realtime          →  ws://${shown}:${port}/api/realtime`)
    console.log(`  mode              →  ${dev ? 'development' : 'production'}\n`)
  })

  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.on(signal, () => {
      server.close(() => process.exit(0))
    })
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
