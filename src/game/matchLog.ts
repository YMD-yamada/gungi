import type { PlayMode, Player } from './types'
import { flushTelemetryNow, shipTelemetry } from './serverLog'

const STORAGE_KEY = 'gungi.matchLogs.v1'
const PREFS_KEY = 'gungi.pacePrefs.v1'
const MAX_MATCHES = 40
const MAX_EVENTS_PER_MATCH = 400

export type LogEventKind =
  | 'match_start'
  | 'match_end'
  | 'connect'
  | 'disconnect'
  | 'turn_start'
  | 'action'
  | 'utterance'
  | 'net_send'
  | 'net_recv'
  | 'note'

export interface LogEvent {
  t: number
  kind: LogEventKind
  side?: Player
  phase?: string
  source?: 'local' | 'remote' | 'cpu' | 'system'
  actionKind?: 'drop' | 'move' | 'ready'
  thinkMs?: number
  text?: string
  winner?: Player | null
}

export interface MatchLog {
  id: string
  startedAt: number
  endedAt?: number
  mode: PlayMode
  roomCode?: string
  mySide?: Player
  events: LogEvent[]
}

export type PaceProfile = 'fast' | 'steady' | 'deliberate'

export interface PacePrefs {
  profile: PaceProfile
  myAvgThinkMs: number
  updatedAt: number
  tips: string[]
}

function readAll(): MatchLog[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as MatchLog[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeAll(logs: MatchLog[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(logs.slice(0, MAX_MATCHES)))
  } catch {
    /* quota — ignore */
  }
}

export function loadPacePrefs(): PacePrefs | null {
  try {
    const raw = localStorage.getItem(PREFS_KEY)
    return raw ? (JSON.parse(raw) as PacePrefs) : null
  } catch {
    return null
  }
}

export function savePacePrefs(prefs: PacePrefs) {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs))
  } catch {
    /* ignore */
  }
}

export function listMatchLogs(): MatchLog[] {
  return readAll()
}

export function getMatchLog(id: string): MatchLog | undefined {
  return readAll().find((m) => m.id === id)
}

export function createMatchLog(input: {
  mode: PlayMode
  roomCode?: string
  mySide?: Player
}): MatchLog {
  const match: MatchLog = {
    id: `m-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    startedAt: Date.now(),
    mode: input.mode,
    roomCode: input.roomCode,
    mySide: input.mySide,
    events: [
      {
        t: Date.now(),
        kind: 'match_start',
        source: 'system',
        side: input.mySide,
      },
    ],
  }
  const all = readAll()
  all.unshift(match)
  writeAll(all)
  shipTelemetry({
    matchId: match.id,
    mode: match.mode,
    roomCode: match.roomCode,
    mySide: match.mySide,
    kind: 'match_start',
    t: match.startedAt,
    source: 'system',
  })
  return match
}

const SHIP_KINDS = new Set<LogEventKind>([
  'match_start',
  'match_end',
  'action',
  'connect',
  'disconnect',
  'utterance',
])

export function appendMatchEvent(matchId: string, event: Omit<LogEvent, 't'> & { t?: number }) {
  const all = readAll()
  const idx = all.findIndex((m) => m.id === matchId)
  if (idx < 0) return
  const match = all[idx]
  const next: LogEvent = { ...event, t: event.t ?? Date.now() }
  match.events = [...match.events, next].slice(-MAX_EVENTS_PER_MATCH)
  if (event.kind === 'match_end') match.endedAt = next.t
  all[idx] = match
  writeAll(all)

  if (SHIP_KINDS.has(next.kind)) {
    shipTelemetry({
      matchId,
      mode: match.mode,
      roomCode: match.roomCode,
      mySide: match.mySide,
      ...next,
    })
  }
  if (next.kind === 'match_end') flushTelemetryNow()
}

export function clearMatchLogs() {
  writeAll([])
}

export interface TimingInsight {
  matchId: string
  myActions: number
  myAvgThinkMs: number
  myMedianThinkMs: number
  myP90ThinkMs: number
  myLongThinks: number
  oppAvgThinkMs: number
  utteranceCount: number
  /** Ms from opponent action / turn_start to nearest utterance */
  utteranceLagSamples: number[]
  avgUtteranceLagMs: number | null
  setupMs: number | null
  playMs: number | null
  tips: string[]
  profile: PaceProfile
}

function median(xs: number[]): number {
  if (!xs.length) return 0
  const s = [...xs].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2
}

function percentile(xs: number[], p: number): number {
  if (!xs.length) return 0
  const s = [...xs].sort((a, b) => a - b)
  const i = Math.min(s.length - 1, Math.max(0, Math.ceil(p * s.length) - 1))
  return s[i]!
}

function avg(xs: number[]): number {
  if (!xs.length) return 0
  return xs.reduce((a, b) => a + b, 0) / xs.length
}

function profileFromAvg(ms: number): PaceProfile {
  if (ms > 0 && ms < 8000) return 'fast'
  if (ms >= 20000) return 'deliberate'
  return 'steady'
}

export function analyzeMatch(match: MatchLog): TimingInsight {
  const my = match.mySide
  const myThinks: number[] = []
  const oppThinks: number[] = []
  const utteranceLagSamples: number[] = []
  let utteranceCount = 0
  let setupStart = match.startedAt
  let playStart: number | null = null
  let end = match.endedAt ?? match.events[match.events.length - 1]?.t ?? Date.now()

  let lastOppSignal = match.startedAt

  for (const e of match.events) {
    if (e.kind === 'turn_start' && e.phase === 'play' && !playStart) playStart = e.t
    if (e.kind === 'action' && typeof e.thinkMs === 'number') {
      if (my && e.side === my) myThinks.push(e.thinkMs)
      else if (my && e.side && e.side !== my) oppThinks.push(e.thinkMs)
      else if (e.source === 'local') myThinks.push(e.thinkMs)
      else if (e.source === 'remote' || e.source === 'cpu') oppThinks.push(e.thinkMs)
    }
    if (e.kind === 'action' && e.source !== 'local' && my && e.side !== my) {
      lastOppSignal = e.t
    }
    if (e.kind === 'turn_start' && my && e.side === my) {
      lastOppSignal = e.t
    }
    if (e.kind === 'utterance') {
      utteranceCount++
      utteranceLagSamples.push(Math.max(0, e.t - lastOppSignal))
    }
    if (e.kind === 'match_end') end = e.t
  }

  const myAvg = avg(myThinks)
  const profile = profileFromAvg(myAvg)
  const tips: string[] = []

  if (myThinks.length >= 3) {
    if (profile === 'fast') {
      tips.push('テンポよく指せています。勝ち負けより、好きな手順を増やすのもおすすめです。')
    } else if (profile === 'deliberate') {
      tips.push('じっくり型です。時間を気にせず楽しめていれば十分です。')
    } else {
      tips.push('無理のないペースです。解析は目安程度にどうぞ。')
    }
  } else {
    tips.push('対局を重ねると、自分のペースの傾向がふんわり見えてきます。')
  }

  if (utteranceCount > 0) {
    tips.push('発言マーカーが残っています。振り返りのメモとして使えます。')
  } else if (match.mode === 'online') {
    tips.push('オンラインでは「発言を記録」で、話したタイミングを残せます（任意）。')
  }

  return {
    matchId: match.id,
    myActions: myThinks.length,
    myAvgThinkMs: Math.round(myAvg),
    myMedianThinkMs: Math.round(median(myThinks)),
    myP90ThinkMs: Math.round(percentile(myThinks, 0.9)),
    myLongThinks: myThinks.filter((x) => x >= 30000).length,
    oppAvgThinkMs: Math.round(avg(oppThinks)),
    utteranceCount,
    utteranceLagSamples,
    avgUtteranceLagMs: utteranceLagSamples.length ? Math.round(avg(utteranceLagSamples)) : null,
    setupMs: playStart ? playStart - setupStart : null,
    playMs: playStart ? end - playStart : end - setupStart,
    tips,
    profile,
  }
}

export function analyzeRecentOnline(limit = 8): {
  insights: TimingInsight[]
  aggregate: PacePrefs | null
} {
  const online = readAll().filter((m) => m.mode === 'online').slice(0, limit)
  const insights = online.map(analyzeMatch)
  const thinks = insights.flatMap((i) => (i.myActions ? [i.myAvgThinkMs] : []))
  if (!thinks.length) return { insights, aggregate: null }

  const myAvgThinkMs = Math.round(avg(thinks))
  const profile = profileFromAvg(myAvgThinkMs)
  const tipSet = new Set<string>()
  for (const i of insights) for (const tip of i.tips.slice(0, 2)) tipSet.add(tip)

  const aggregate: PacePrefs = {
    profile,
    myAvgThinkMs,
    updatedAt: Date.now(),
    tips: [...tipSet].slice(0, 4),
  }
  savePacePrefs(aggregate)
  return { insights, aggregate }
}

export function formatMs(ms: number): string {
  const sec = Math.max(0, Math.round(ms / 1000))
  if (sec < 60) return `${sec}秒`
  const m = Math.floor(sec / 60)
  const rem = sec % 60
  return `${m}分${rem}秒`
}

/** Integer seconds only (for online clock). */
export function formatSec(ms: number): string {
  return `${Math.max(0, Math.floor(ms / 1000))}秒`
}

/** CPU delay / nudge thresholds derived from pace. */
export function paceTuning(prefs: PacePrefs | null): {
  cpuSetupMs: number
  cpuPlayMs: number
  softNudgeMs: number
  turnPulse: boolean
} {
  const avgMs = prefs?.myAvgThinkMs || 12000
  const profile = prefs?.profile ?? 'steady'
  return {
    cpuSetupMs: profile === 'fast' ? 220 : profile === 'deliberate' ? 480 : 320,
    cpuPlayMs: Math.min(900, Math.max(280, Math.round(avgMs * 0.04))),
    softNudgeMs: Math.max(12000, Math.round(avgMs * 1.35)),
    turnPulse: profile !== 'fast',
  }
}
