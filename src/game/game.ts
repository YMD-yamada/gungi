import { emptyBoard, findMarshal, squareLabel } from './board'
import { initialHand, PIECE_BY_TYPE, playerLabel } from './pieces'
import { applyDrop, applyMove, getDropTargets, getMoveTargets } from './moves'
import type { Coord, GameAction, GameState, Piece, PieceType, Player, Selection } from './types'
import { BOARD_SIZE } from './types'

function makePiece(state: GameState, type: PieceType, owner: Player): { piece: Piece; nextPieceId: number } {
  const piece: Piece = { id: `${owner}-${type}-${state.nextPieceId}`, type, owner }
  return { piece, nextPieceId: state.nextPieceId + 1 }
}

export function createInitialState(): GameState {
  return {
    board: emptyBoard(),
    hand: {
      black: initialHand(),
      white: initialHand(),
    },
    turn: 'black',
    phase: 'setup',
    winner: null,
    selection: null,
    legalTargets: [],
    setupReady: { black: false, white: false },
    moveLog: [
      '配置フェーズ開始。自陣（先手は下3段／後手は上3段）に手駒を置いてください。帥の配置後に「配置完了」が可能です。',
    ],
    nextPieceId: 1,
  }
}

export function opposite(p: Player): Player {
  return p === 'black' ? 'white' : 'black'
}

function withSelection(state: GameState, selection: Selection, legalTargets: Coord[]): GameState {
  return { ...state, selection, legalTargets }
}

function removeFromHand(hand: PieceType[], type: PieceType): PieceType[] {
  const idx = hand.indexOf(type)
  if (idx < 0) return hand
  return [...hand.slice(0, idx), ...hand.slice(idx + 1)]
}

function uniqueHandTypes(hand: PieceType[]): PieceType[] {
  return [...new Set(hand)]
}

export function listActions(state: GameState): GameAction[] {
  if (state.phase === 'ended') return []
  const player = state.turn
  const actions: GameAction[] = []

  if (state.phase === 'setup') {
    if (state.setupReady[player]) return []
    for (const type of uniqueHandTypes(state.hand[player])) {
      for (const to of getDropTargets(state.board, player, type, 'setup')) {
        actions.push({ kind: 'drop', type, to })
      }
    }
    if (findMarshal(state.board, player)) {
      actions.push({ kind: 'ready' })
    }
    return actions
  }

  // play
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      const stack = state.board[row][col]
      const top = stack[stack.length - 1]
      if (!top || top.owner !== player) continue
      const from = { row, col }
      for (const to of getMoveTargets(state.board, from, player)) {
        actions.push({ kind: 'move', from, to })
      }
    }
  }
  for (const type of uniqueHandTypes(state.hand[player])) {
    for (const to of getDropTargets(state.board, player, type, 'play')) {
      actions.push({ kind: 'drop', type, to })
    }
  }
  return actions
}

export function applyAction(state: GameState, action: GameAction): GameState {
  if (state.phase === 'ended') return state

  if (action.kind === 'ready') {
    return markSetupReady(clearSelection(state))
  }

  if (action.kind === 'drop') {
    if (!state.hand[state.turn].includes(action.type)) return state
    const phase = state.phase === 'setup' ? 'setup' : 'play'
    const legal = getDropTargets(state.board, state.turn, action.type, phase)
    if (!legal.some((t) => t.row === action.to.row && t.col === action.to.col)) return state

    const { piece, nextPieceId } = makePiece(state, action.type, state.turn)
    const { board } = applyDrop(state.board, action.to, piece)
    const hand = {
      ...state.hand,
      [state.turn]: removeFromHand(state.hand[state.turn], action.type),
    }
    const log = `${playerLabel(state.turn)}が${PIECE_BY_TYPE[action.type].kanji}を${squareLabel(action.to.row, action.to.col)}へ配置`
    return withSelection(
      {
        ...state,
        board,
        hand,
        nextPieceId,
        turn: opposite(state.turn),
        moveLog: [...state.moveLog, log],
      },
      null,
      [],
    )
  }

  // move
  const moving = state.board[action.from.row][action.from.col]
  const piece = moving[moving.length - 1]
  if (!piece || piece.owner !== state.turn) return state
  const targets = getMoveTargets(state.board, action.from, state.turn)
  if (!targets.some((t) => t.row === action.to.row && t.col === action.to.col)) return state

  const { board, capturedMarshal } = applyMove(state.board, action.from, action.to)
  const log = `${playerLabel(state.turn)}が${PIECE_BY_TYPE[piece.type].kanji}を${squareLabel(action.from.row, action.from.col)}→${squareLabel(action.to.row, action.to.col)}`

  if (capturedMarshal) {
    return withSelection(
      {
        ...state,
        board,
        phase: 'ended',
        winner: state.turn,
        moveLog: [...state.moveLog, log, `${playerLabel(state.turn)}の勝ち（帥を捕獲）`],
      },
      null,
      [],
    )
  }

  return withSelection(
    {
      ...state,
      board,
      turn: opposite(state.turn),
      moveLog: [...state.moveLog, log],
    },
    null,
    [],
  )
}

export function selectBoard(state: GameState, row: number, col: number): GameState {
  if (state.phase === 'ended') return state

  const targeted = state.legalTargets.some((t) => t.row === row && t.col === col)
  if (state.selection && targeted) {
    if (state.selection.kind === 'hand') {
      return applyAction(state, { kind: 'drop', type: state.selection.type, to: { row, col } })
    }
    return applyAction(state, {
      kind: 'move',
      from: { row: state.selection.row, col: state.selection.col },
      to: { row, col },
    })
  }

  if (state.phase === 'setup') return state

  const stack = state.board[row][col]
  const top = stack[stack.length - 1]
  if (!top || top.owner !== state.turn) {
    return withSelection(state, null, [])
  }

  const targets = getMoveTargets(state.board, { row, col }, state.turn)
  return withSelection(state, { kind: 'board', row, col }, targets)
}

export function selectHand(state: GameState, type: PieceType): GameState {
  if (state.phase === 'ended') return state
  if (state.setupReady[state.turn] && state.phase === 'setup') return state
  if (!state.hand[state.turn].includes(type)) return state

  const phase = state.phase === 'setup' ? 'setup' : 'play'
  const targets = getDropTargets(state.board, state.turn, type, phase)
  return withSelection(state, { kind: 'hand', type }, targets)
}

export function clearSelection(state: GameState): GameState {
  return withSelection(state, null, [])
}

export function markSetupReady(state: GameState): GameState {
  if (state.phase !== 'setup') return state
  if (!findMarshal(state.board, state.turn)) {
    return {
      ...state,
      moveLog: [...state.moveLog, '帥を盤上に置いてから配置完了にしてください。'],
    }
  }

  const setupReady = { ...state.setupReady, [state.turn]: true }
  const bothReady = setupReady.black && setupReady.white

  if (bothReady) {
    return withSelection(
      {
        ...state,
        setupReady,
        phase: 'play',
        turn: 'black',
        moveLog: [...state.moveLog, `${playerLabel(state.turn)}が配置完了`, '対局開始。先手（黒）の手番です。'],
      },
      null,
      [],
    )
  }

  return withSelection(
    {
      ...state,
      setupReady,
      turn: opposite(state.turn),
      moveLog: [...state.moveLog, `${playerLabel(state.turn)}が配置完了`],
    },
    null,
    [],
  )
}

export function isLegalTarget(state: GameState, row: number, col: number): boolean {
  return state.legalTargets.some((t) => t.row === row && t.col === col)
}

/** Strip UI selection before network sync. */
export function sanitizeState(state: GameState): GameState {
  return { ...state, selection: null, legalTargets: [] }
}
