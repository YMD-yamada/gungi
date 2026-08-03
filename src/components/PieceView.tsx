import type { Piece, PieceType } from '../game/types'
import { PIECE_BY_TYPE } from '../game/pieces'

export function PieceView({
  piece,
  compact,
}: {
  piece: Piece
  compact?: boolean
}) {
  const meta = PIECE_BY_TYPE[piece.type as PieceType]
  return (
    <span
      className={`piece piece-${piece.owner}${compact ? ' piece-compact' : ''}`}
      title={`${meta.name}（${piece.owner === 'black' ? '黒' : '白'}）`}
    >
      {meta.kanji}
    </span>
  )
}
