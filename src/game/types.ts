export type Player = 'black' | 'white'

export type PieceType =
  | 'marshal'
  | 'general'
  | 'lieutenant'
  | 'major'
  | 'samurai'
  | 'ninja'
  | 'spear'
  | 'cavalry'
  | 'archer'
  | 'cannon'
  | 'fortress'
  | 'pawn'
  | 'spy'

export interface Piece {
  id: string
  type: PieceType
  owner: Player
}

/** Bottom → top. Max height 3. */
export type Stack = Piece[]

export type Board = Stack[][]

export type Phase = 'setup' | 'play' | 'ended'

export interface Coord {
  row: number
  col: number
}

export type Selection =
  | { kind: 'board'; row: number; col: number }
  | { kind: 'hand'; type: PieceType }
  | null

export type GameAction =
  | { kind: 'drop'; type: PieceType; to: Coord }
  | { kind: 'move'; from: Coord; to: Coord }
  | { kind: 'ready' }

export interface GameState {
  board: Board
  hand: Record<Player, PieceType[]>
  turn: Player
  phase: Phase
  winner: Player | null
  selection: Selection
  legalTargets: Coord[]
  setupReady: Record<Player, boolean>
  moveLog: string[]
  nextPieceId: number
}

export type PlayMode = 'local' | 'cpu' | 'online'

export const BOARD_SIZE = 9
export const MAX_STACK = 3
