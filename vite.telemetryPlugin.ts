import fs from 'node:fs'
import path from 'node:path'
import type { Plugin } from 'vite'

const LOG_DIR = path.resolve(process.cwd(), 'logs')
const LOG_FILE = path.join(LOG_DIR, 'telemetry.jsonl')
const MAX_BODY = 32_000

function appendLines(payload: unknown) {
  fs.mkdirSync(LOG_DIR, { recursive: true })
  const lines = Array.isArray(payload) ? payload : [payload]
  const chunk =
    lines
      .slice(0, 40)
      .map((row) => JSON.stringify({ receivedAt: Date.now(), ...((row as object) ?? {}) }))
      .join('\n') + '\n'
  fs.appendFileSync(LOG_FILE, chunk, 'utf8')
}

/** Dev / preview: POST /api/log → logs/telemetry.jsonl (lightweight). */
export function telemetryLogPlugin(): Plugin {
  return {
    name: 'gungi-telemetry-log',
    configureServer(server) {
      server.middlewares.use('/api/log', (req, res, next) => {
        if (req.method === 'OPTIONS') {
          res.statusCode = 204
          res.end()
          return
        }
        if (req.method !== 'POST') {
          next()
          return
        }
        const chunks: Buffer[] = []
        let size = 0
        req.on('data', (c: Buffer) => {
          size += c.length
          if (size <= MAX_BODY) chunks.push(c)
        })
        req.on('end', () => {
          try {
            if (size > MAX_BODY) {
              res.statusCode = 413
              res.end('too large')
              return
            }
            const raw = Buffer.concat(chunks).toString('utf8')
            const body = raw ? JSON.parse(raw) : {}
            appendLines(body.events ?? body)
            res.statusCode = 204
            res.end()
          } catch {
            res.statusCode = 400
            res.end('bad json')
          }
        })
      })
    },
    configurePreviewServer(server) {
      server.middlewares.use('/api/log', (req, res, next) => {
        if (req.method === 'OPTIONS') {
          res.statusCode = 204
          res.end()
          return
        }
        if (req.method !== 'POST') {
          next()
          return
        }
        const chunks: Buffer[] = []
        let size = 0
        req.on('data', (c: Buffer) => {
          size += c.length
          if (size <= MAX_BODY) chunks.push(c)
        })
        req.on('end', () => {
          try {
            if (size > MAX_BODY) {
              res.statusCode = 413
              res.end('too large')
              return
            }
            const raw = Buffer.concat(chunks).toString('utf8')
            const body = raw ? JSON.parse(raw) : {}
            appendLines(body.events ?? body)
            res.statusCode = 204
            res.end()
          } catch {
            res.statusCode = 400
            res.end('bad json')
          }
        })
      })
    },
  }
}
