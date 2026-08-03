import { appendMatchEvent } from './matchLog'
import type { GameState, Player } from './types'

export function diffAndLog(
  matchId: string | null,
  prev: GameState,
  next: GameState,
  opts: {
    source: 'local' | 'remote' | 'cpu'
    mySide?: Player | null
    turnStartedAt: number
    now?: number
  },
): number {
  if (!matchId) return opts.turnStartedAt
  const now = opts.now ?? Date.now()
  let turnStartedAt = opts.turnStartedAt

  const logGrew = next.moveLog.length > prev.moveLog.length
  const readyChanged =
    next.setupReady.black !== prev.setupReady.black || next.setupReady.white !== prev.setupReady.white
  const phaseEnded = prev.phase !== 'ended' && next.phase === 'ended'
  const turnChanged = prev.turn !== next.turn || prev.phase !== next.phase

  if (logGrew || readyChanged) {
    const thinkMs = Math.max(0, now - turnStartedAt)
    const actor = prev.turn
    let actionKind: 'drop' | 'move' | 'ready' | undefined
    const last = next.moveLog[next.moveLog.length - 1] ?? ''
    if (last.includes('配置完了')) actionKind = 'ready'
    else if (last.includes('→')) actionKind = 'move'
    else if (last.includes('配置')) actionKind = 'drop'

    // ready may not add via move from applyAction the same way - markSetupReady adds log
    if (readyChanged && !actionKind) actionKind = 'ready'

    appendMatchEvent(matchId, {
      kind: 'action',
      t: now,
      side: actor,
      phase: prev.phase,
      source: opts.source,
      actionKind,
      thinkMs,
    })

    if (opts.source === 'local') {
      appendMatchEvent(matchId, { kind: 'net_send', t: now, side: actor, source: 'local' })
    } else if (opts.source === 'remote') {
      appendMatchEvent(matchId, { kind: 'net_recv', t: now, side: actor, source: 'remote' })
    }
  }

  if (turnChanged && next.phase !== 'ended') {
    turnStartedAt = now
    appendMatchEvent(matchId, {
      kind: 'turn_start',
      t: now,
      side: next.turn,
      phase: next.phase,
      source: 'system',
    })
  }

  if (phaseEnded) {
    appendMatchEvent(matchId, {
      kind: 'match_end',
      t: now,
      winner: next.winner,
      source: 'system',
      side: next.winner ?? undefined,
    })
  }

  return turnStartedAt
}
