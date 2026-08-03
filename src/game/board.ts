import { BOARD_SIZE, type Board, type Coord, type Piece, type Player, type Stack } from './types'

export function emptyBoard(): Board {
  return Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => [] as Stack),
  )
}

export function cloneBoard(board: Board): Board {
  return board.map((row) => row.map((stack) => stack.map((p) => ({ ...p }))))
}

export function inBounds(row: number, col: number): boolean {
  return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE
}

export function topPiece(stack: Stack): Piece | undefined {
  return stack[stack.length - 1]
}

export function coordsEqual(a: Coord, b: Coord): boolean {
  return a.row === b.row && a.col === b.col
}

/** Setup territory: black uses rows 0–2, white uses 6–8. */
export function inSetupTerritory(player: Player, row: number): boolean {
  return player === 'black' ? row <= 2 : row >= 6
}

export function findMarshal(board: Board, player: Player): Coord | null {
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      const hit = board[row][col].find((p) => p.owner === player && p.type === 'marshal')
      if (hit) return { row, col }
    }
  }
  return null
}

export function squareLabel(row: number, col: number): string {
  return `${col + 1}${String.fromCharCode(97 + row)}`
}
