import { PieceView } from './PieceView'
import type { GameState } from '../game/types'
import { isLegalTarget } from '../game/game'

const FILES = ['1', '2', '3', '4', '5', '6', '7', '8', '9']
const RANKS = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i']

export function BoardView({
  state,
  onSquare,
  interactive = true,
  flip = false,
}: {
  state: GameState
  onSquare: (row: number, col: number) => void
  interactive?: boolean
  flip?: boolean
}) {
  const selected =
    state.selection?.kind === 'board'
      ? { row: state.selection.row, col: state.selection.col }
      : null

  const rowOrder = flip ? [...RANKS.keys()].reverse() : [...RANKS.keys()]
  const colOrder = flip ? [...FILES.keys()].reverse() : [...FILES.keys()]

  return (
    <div className={`board-wrap${interactive ? '' : ' board-locked'}`}>
      <div className="board-frame">
        <div className="board-ranks">
          {rowOrder.map((ri) => (
            <span key={RANKS[ri]}>{RANKS[ri]}</span>
          ))}
        </div>
        <div className="board" role="grid" aria-label="グンギ盤">
          {rowOrder.map((ri) =>
            colOrder.map((ci) => {
              const stack = state.board[ri][ci]
              const legal = interactive && isLegalTarget(state, ri, ci)
              const isSel = selected?.row === ri && selected?.col === ci
              const dark = (ri + ci) % 2 === 1
              return (
                <button
                  key={`${ri}-${ci}`}
                  type="button"
                  className={[
                    'square',
                    dark ? 'square-dark' : 'square-light',
                    legal ? 'square-legal' : '',
                    isSel ? 'square-selected' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  disabled={!interactive}
                  onClick={() => onSquare(ri, ci)}
                  aria-label={`${ci + 1}${RANKS[ri]}`}
                >
                  <div className="stack">
                    {stack.map((piece, idx) => (
                      <PieceView
                        key={piece.id}
                        piece={piece}
                        compact={stack.length > 1 && idx < stack.length - 1}
                      />
                    ))}
                  </div>
                </button>
              )
            }),
          )}
        </div>
        <div className="board-files">
          {colOrder.map((ci) => (
            <span key={FILES[ci]}>{FILES[ci]}</span>
          ))}
        </div>
      </div>
    </div>
  )
}
