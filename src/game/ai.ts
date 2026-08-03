import { findMarshal, topPiece } from './board'
import { applyAction, listActions } from './game'
import { BOARD_SIZE, type GameAction, type GameState, type PieceType, type Player } from './types'

const VALUES: Record<PieceType, number> = {
  marshal: 10000,
  general: 90,
  lieutenant: 85,
  major: 45,
  samurai: 40,
  ninja: 38,
  spear: 42,
  cavalry: 40,
  archer: 48,
  cannon: 55,
  fortress: 25,
  pawn: 12,
  spy: 35,
}

function materialScore(state: GameState, player: Player): number {
  let score = 0
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      for (const p of state.board[r][c]) {
        const v = VALUES[p.type]
        score += p.owner === player ? v : -v
      }
    }
  }
  for (const t of state.hand[player]) score += VALUES[t] * 0.85
  for (const t of state.hand[player === 'black' ? 'white' : 'black']) score -= VALUES[t] * 0.85
  return score
}

function positionalScore(state: GameState, player: Player): number {
  let score = 0
  const myMarshal = findMarshal(state.board, player)
  const opp = player === 'black' ? 'white' : 'black'
  const oppMarshal = findMarshal(state.board, opp)

  if (myMarshal) {
    // Prefer marshal not on front line
    const depth = player === 'black' ? myMarshal.row : BOARD_SIZE - 1 - myMarshal.row
    score += depth * 3
  }
  if (oppMarshal) {
    // Encourage approaching enemy marshal
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        const top = topPiece(state.board[r][c])
        if (!top || top.owner !== player) continue
        const dist = Math.abs(r - oppMarshal.row) + Math.abs(c - oppMarshal.col)
        score += Math.max(0, 12 - dist)
      }
    }
  }
  return score
}

function evaluate(state: GameState, player: Player): number {
  if (state.phase === 'ended') {
    if (state.winner === player) return 1_000_000
    if (state.winner) return -1_000_000
  }
  return materialScore(state, player) + positionalScore(state, player)
}

function setupPriority(action: GameAction, player: Player): number {
  if (action.kind === 'ready') return 50
  if (action.kind !== 'drop') return 0
  const back = player === 'black' ? 0 : 8
  const mid = 4
  let score = VALUES[action.type]
  if (action.type === 'marshal') {
    score += 500
    score += (3 - Math.abs(action.to.col - mid)) * 20
    score += (2 - Math.abs(action.to.row - back)) * 30
  } else if (action.type === 'fortress') {
    score += 40
    score += (2 - Math.abs(action.to.row - back)) * 10
  } else if (action.type === 'pawn' || action.type === 'spear') {
    score += action.to.row === (player === 'black' ? 2 : 6) ? 15 : 0
  }
  // Prefer filling board a bit before ready, but not forever
  return score
}

function scoreAction(state: GameState, action: GameAction, player: Player): number {
  if (state.phase === 'setup') {
    const placed = BOARD_SIZE * 3 - countEmptyInTerritory(state, player)
    // After ~10 pieces, prefer ready if marshal is out
    if (action.kind === 'ready' && placed >= 10) return 10_000
    if (action.kind === 'ready') return setupPriority(action, player) - 200
    return setupPriority(action, player) + Math.random() * 3
  }

  const next = applyAction(state, action)
  let score = evaluate(next, player)

  if (action.kind === 'move') {
    const dest = state.board[action.to.row][action.to.col]
    const top = dest[dest.length - 1]
    if (top && top.owner !== player) {
      score += VALUES[top.type] * 1.2
      if (dest.some((p) => p.type === 'marshal')) score += 50_000
    }
  }

  // Light noise so games vary
  return score + Math.random() * 4
}

function countEmptyInTerritory(state: GameState, player: Player): number {
  let n = 0
  const rows = player === 'black' ? [0, 1, 2] : [6, 7, 8]
  for (const r of rows) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (state.board[r][c].length === 0) n++
    }
  }
  return n
}

/** Pick a CPU move for the side to move. */
export function chooseCpuAction(state: GameState): GameAction | null {
  const actions = listActions(state)
  if (actions.length === 0) return null

  const player = state.turn
  let best = actions[0]
  let bestScore = -Infinity

  // Cap evaluation count for responsiveness
  const sample = actions.length > 180 ? sampleActions(actions, 180) : actions
  for (const action of sample) {
    const s = scoreAction(state, action, player)
    if (s > bestScore) {
      bestScore = s
      best = action
    }
  }
  return best
}

function sampleActions(actions: GameAction[], limit: number): GameAction[] {
  // Keep all captures / ready, fill rest randomly
  const priority: GameAction[] = []
  const rest: GameAction[] = []
  for (const a of actions) {
    if (a.kind === 'ready') {
      priority.push(a)
      continue
    }
    if (a.kind === 'move') {
      // rough: always include; we'll trim later
      priority.push(a)
    } else {
      rest.push(a)
    }
  }
  const out = [...priority]
  while (out.length < limit && rest.length) {
    const i = Math.floor(Math.random() * rest.length)
    out.push(rest.splice(i, 1)[0])
  }
  return out.slice(0, limit)
}
