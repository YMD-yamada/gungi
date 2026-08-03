export default function handler(req: { method?: string; body?: unknown }, res: {
  status: (code: number) => { end: (body?: string) => void }
}) {
  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return
  }
  if (req.method !== 'POST') {
    res.status(405).end()
    return
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
    const events = Array.isArray((body as { events?: unknown })?.events)
      ? (body as { events: unknown[] }).events.slice(0, 40)
      : [body]
    console.info(
      JSON.stringify({
        kind: 'gungi_telemetry_batch',
        n: events.length,
        sample: events[0] ?? null,
      }),
    )
    res.status(204).end()
  } catch {
    res.status(400).end()
  }
}
