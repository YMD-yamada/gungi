import { cloneBoard, inBounds, inSetupTerritory, topPiece } from './board'
import { forwardDelta } from './pieces'
import {
  BOARD_SIZE,
  MAX_STACK,
  type Board,
  type Coord,
  type Piece,
  type PieceType,
  type Player,
} from './types'

function isEnemy(board: Board, row: number, col: number, player: Player): boolean {
  const top = topPiece(board[row][col])
  return !!top && top.owner !== player
}

function isFriendly(board: Board, row: number, col: number, player: Player): boolean {
  const top = topPiece(board[row][col])
  return !!top && top.owner === player
}

function canLand(
  board: Board,
  row: number,
  col: number,
  player: Player,
  piece: Piece,
  opts: { captureOnly?: boolean; moveOnly?: boolean } = {},
): boolean {
  const stack = board[row][col]
  if (stack.length === 0) return !opts.captureOnly

  const top = topPiece(stack)!
  if (top.owner === player) {
    if (opts.captureOnly) return false
    if (piece.type === 'marshal') return false
    if (stack.some((p) => p.type === 'marshal')) return false
    return stack.length < MAX_STACK
  }

  // Enemy square = capture (replace whole enemy stack)
  if (opts.moveOnly) return false
  if (piece.type === 'spy' && top.type === 'marshal') {
    // Spy may capture marshal only when alone (will be checked by caller via stack height of mover)
    return true
  }
  return true
}

function pushUnique(out: Coord[], row: number, col: number) {
  if (!out.some((c) => c.row === row && c.col === col)) out.push({ row, col })
}

function slide(
  board: Board,
  from: Coord,
  player: Player,
  piece: Piece,
  dirs: Array<[number, number]>,
  maxSteps: number,
  out: Coord[],
) {
  for (const [dr, dc] of dirs) {
    for (let step = 1; step <= maxSteps; step++) {
      const r = from.row + dr * step
      const c = from.col + dc * step
      if (!inBounds(r, c)) break
      const stack = board[r][c]
      if (stack.length === 0) {
        pushUnique(out, r, c)
        continue
      }
      if (isFriendly(board, r, c, player)) {
        if (canLand(board, r, c, player, piece)) pushUnique(out, r, c)
        break
      }
      if (isEnemy(board, r, c, player) && canLand(board, r, c, player, piece)) {
        pushUnique(out, r, c)
      }
      break
    }
  }
}

function cannonMoves(board: Board, from: Coord, player: Player, piece: Piece, out: Coord[]) {
  const dirs: Array<[number, number]> = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ]
  for (const [dr, dc] of dirs) {
    let jumped = false
    for (let step = 1; step < BOARD_SIZE; step++) {
      const r = from.row + dr * step
      const c = from.col + dc * step
      if (!inBounds(r, c)) break
      const stack = board[r][c]
      if (!jumped) {
        if (stack.length === 0) {
          pushUnique(out, r, c)
        } else {
          jumped = true
        }
        continue
      }
      // After screen: first occupied square may be captured; friendly stack-on allowed only if empty path... after jump must be enemy capture or stop
      if (stack.length === 0) continue
      if (isEnemy(board, r, c, player) && canLand(board, r, c, player, piece, { captureOnly: true })) {
        pushUnique(out, r, c)
      }
      break
    }
  }
}

function filterSpyMarshal(board: Board, piece: Piece, fromStackHeight: number, targets: Coord[]): Coord[] {
  if (piece.type !== 'spy') return targets
  return targets.filter((t) => {
    const top = topPiece(board[t.row][t.col])
    if (top?.type === 'marshal' && top.owner !== piece.owner) {
      return fromStackHeight === 1
    }
    return true
  })
}

export function getMoveTargets(board: Board, from: Coord, player: Player): Coord[] {
  const stack = board[from.row][from.col]
  const piece = topPiece(stack)
  if (!piece || piece.owner !== player) return []
  if (piece.type === 'fortress') return []

  const out: Coord[] = []
  const fwd = forwardDelta(player)
  const orth: Array<[number, number]> = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ]
  const diag: Array<[number, number]> = [
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1],
  ]
  const all8 = [...orth, ...diag]

  const tryStep = (r: number, c: number) => {
    if (!inBounds(r, c)) return
    if (canLand(board, r, c, player, piece)) pushUnique(out, r, c)
  }

  switch (piece.type) {
    case 'marshal':
    case 'spy':
      for (const [dr, dc] of all8) tryStep(from.row + dr, from.col + dc)
      break
    case 'general':
      slide(board, from, player, piece, orth, BOARD_SIZE, out)
      break
    case 'lieutenant':
      slide(board, from, player, piece, diag, BOARD_SIZE, out)
      break
    case 'major':
      slide(board, from, player, piece, orth, 2, out)
      break
    case 'samurai':
      tryStep(from.row + fwd, from.col)
      for (const [dr, dc] of diag) tryStep(from.row + dr, from.col + dc)
      break
    case 'ninja':
      for (const [dr, dc] of diag) tryStep(from.row + dr, from.col + dc)
      break
    case 'spear':
      slide(board, from, player, piece, [[fwd, 0]], BOARD_SIZE, out)
      tryStep(from.row - fwd, from.col)
      break
    case 'cavalry':
      tryStep(from.row + fwd, from.col + 1)
      tryStep(from.row + fwd, from.col - 1)
      {
        const midR = from.row + fwd
        const midC = from.col
        const destR = from.row + fwd * 2
        if (inBounds(midR, midC) && board[midR][midC].length === 0) tryStep(destR, from.col)
      }
      break
    case 'archer':
      for (const [dr, dc] of all8) tryStep(from.row + dr * 2, from.col + dc * 2)
      break
    case 'cannon':
      cannonMoves(board, from, player, piece, out)
      break
    case 'pawn':
      tryStep(from.row + fwd, from.col)
      break
    default:
      break
  }

  return filterSpyMarshal(board, piece, stack.length, out)
}

export function getDropTargets(
  board: Board,
  player: Player,
  type: PieceType,
  phase: 'setup' | 'play',
): Coord[] {
  const out: Coord[] = []
  const ghost: Piece = { id: 'drop', type, owner: player }

  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if (phase === 'setup' && !inSetupTerritory(player, row)) continue
      const stack = board[row][col]
      if (stack.length === 0) {
        out.push({ row, col })
        continue
      }
      if (phase === 'setup') continue // setup: empty squares only
      if (isFriendly(board, row, col, player) && canLand(board, row, col, player, ghost)) {
        out.push({ row, col })
      }
    }
  }
  return out
}

export function applyMove(board: Board, from: Coord, to: Coord): { board: Board; capturedMarshal: Player | null } {
  const next = cloneBoard(board)
  const fromStack = next[from.row][from.col]
  const piece = fromStack.pop()
  if (!piece) return { board, capturedMarshal: null }

  const dest = next[to.row][to.col]
  let capturedMarshal: Player | null = null

  if (dest.length > 0 && topPiece(dest)!.owner !== piece.owner) {
    if (dest.some((p) => p.type === 'marshal')) {
      capturedMarshal = topPiece(dest)!.owner
    }
    next[to.row][to.col] = [piece]
  } else {
    dest.push(piece)
  }

  return { board: next, capturedMarshal }
}

export function applyDrop(
  board: Board,
  to: Coord,
  piece: Piece,
): { board: Board; capturedMarshal: Player | null } {
  const next = cloneBoard(board)
  const dest = next[to.row][to.col]
  // Drops never capture in this ruleset
  dest.push(piece)
  return { board: next, capturedMarshal: null }
}
