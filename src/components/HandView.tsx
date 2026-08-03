import { PIECE_METAS } from '../game/pieces'
import type { GameState, PieceType, Player } from '../game/types'

export function HandView({
  state,
  player,
  onSelect,
  interactive = true,
}: {
  state: GameState
  player: Player
  onSelect: (type: PieceType) => void
  interactive?: boolean
}) {
  const counts = new Map<PieceType, number>()
  for (const t of state.hand[player]) {
    counts.set(t, (counts.get(t) ?? 0) + 1)
  }

  const active = interactive && state.turn === player && state.phase !== 'ended'
  const handSelected = state.selection?.kind === 'hand' ? state.selection.type : null

  return (
    <div className={`hand ${player === 'black' ? 'hand-black' : 'hand-white'}`}>
      <div className="hand-title">
        <span>{player === 'black' ? '先手・黒' : '後手・白'}の手駒</span>
        {state.setupReady[player] && state.phase === 'setup' ? (
          <em className="badge">配置完了</em>
        ) : null}
        {state.turn === player && state.phase !== 'ended' ? (
          <em className="badge badge-turn">手番</em>
        ) : null}
      </div>
      <div className="hand-grid">
        {PIECE_METAS.map((meta) => {
          const n = counts.get(meta.type) ?? 0
          if (n === 0) return null
          const selected = handSelected === meta.type && active
          return (
            <button
              key={meta.type}
              type="button"
              className={`hand-piece ${selected ? 'is-selected' : ''}`}
              disabled={!active}
              onClick={() => onSelect(meta.type)}
              title={meta.summary}
            >
              <span className="hand-kanji">{meta.kanji}</span>
              <span className="hand-count">×{n}</span>
            </button>
          )
        })}
        {[...counts.values()].every((n) => n === 0) ? (
          <span className="hand-empty">手駒なし</span>
        ) : null}
      </div>
    </div>
  )
}
