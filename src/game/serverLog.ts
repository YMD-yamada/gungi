/** Fire-and-forget telemetry to /api/log (batched, low rate). */

type TelemetryRow = Record<string, unknown>

const queue: TelemetryRow[] = []
let flushTimer: ReturnType<typeof setTimeout> | null = null
let lastFlush = 0

const MAX_QUEUE = 60
const FLUSH_MS = 8000
const MIN_GAP_MS = 4000

function scheduleFlush() {
  if (flushTimer) return
  flushTimer = setTimeout(() => {
    flushTimer = null
    void flush()
  }, FLUSH_MS)
}

async function flush() {
  if (!queue.length) return
  const now = Date.now()
  if (now - lastFlush < MIN_GAP_MS && queue.length < 20) {
    scheduleFlush()
    return
  }
  const batch = queue.splice(0, 40)
  lastFlush = now
  try {
    await fetch('/api/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events: batch }),
      keepalive: true,
    })
  } catch {
    // Drop on failure — localStorage match logs remain as backup
  }
}

export function shipTelemetry(row: TelemetryRow) {
  queue.push({ ...row, clientAt: Date.now() })
  if (queue.length > MAX_QUEUE) queue.splice(0, queue.length - MAX_QUEUE)
  if (queue.length >= 12) {
    if (flushTimer) {
      clearTimeout(flushTimer)
      flushTimer = null
    }
    void flush()
    return
  }
  scheduleFlush()
}

export function flushTelemetryNow() {
  if (flushTimer) {
    clearTimeout(flushTimer)
    flushTimer = null
  }
  void flush()
}
