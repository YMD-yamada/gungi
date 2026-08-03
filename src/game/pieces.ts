import type { PieceType, Player } from './types'

export interface PieceMeta {
  type: PieceType
  name: string
  kanji: string
  count: number
  summary: string
  detail: string
}

/** Fan reconstruction inventory (playable set based on guidebook fragments). */
export const PIECE_METAS: PieceMeta[] = [
  {
    type: 'marshal',
    name: '帥',
    kanji: '帥',
    count: 1,
    summary: 'どの方向にも1マス。取られたら負け。',
    detail:
      '将軍そのもの。縦・横・斜めに1マスだけ動けます。相手に取られるとその時点で敗北です。山（スタック）の下には潜れません（常に単体か山の頂点のみ）。',
  },
  {
    type: 'general',
    name: '大',
    kanji: '大',
    count: 1,
    summary: '縦横に何マスでも（飛車型）。',
    detail: '縦または横に、道が開いていれば何マスでも進めます。斜めには動けません。',
  },
  {
    type: 'lieutenant',
    name: '中',
    kanji: '中',
    count: 1,
    summary: '斜めに何マスでも（角行型）。',
    detail: '斜め4方向に、道が開いていれば何マスでも進めます。縦横には動けません。',
  },
  {
    type: 'major',
    name: '小',
    kanji: '小',
    count: 2,
    summary: '縦横に最大2マス。',
    detail: '縦または横に、最大2マスまで進めます。途中に駒があると止まります。',
  },
  {
    type: 'samurai',
    name: '侍',
    kanji: '侍',
    count: 2,
    summary: '前1マス、または斜め1マス。',
    detail: '自分から見て前方の1マス、もしくは斜めいずれか1マスへ進めます。',
  },
  {
    type: 'ninja',
    name: '忍',
    kanji: '忍',
    count: 2,
    summary: '斜め1マス（跳躍可）。',
    detail: '斜め1マスへ進みます。隣接マスでも「跳び」扱いなので、隣接の有無に関係なく斜め隣へ行けます。',
  },
  {
    type: 'spear',
    name: '槍',
    kanji: '槍',
    count: 2,
    summary: '前方に何マスでも、後方に1マス。',
    detail: '前方（縦）には道が開いていれば何マスでも。後方には1マスだけ下がれます。横・斜めは不可。',
  },
  {
    type: 'cavalry',
    name: '騎',
    kanji: '騎',
    count: 2,
    summary: '前方斜め1、または前方2マス。',
    detail: '前方斜めに1マス、または真正面に2マス（1マス目が空いている必要あり）進めます。',
  },
  {
    type: 'archer',
    name: '弓',
    kanji: '弓',
    count: 2,
    summary: 'どの方向にもちょうど2マス（跳躍）。',
    detail: '縦・横・斜めいずれかちょうど2マス先へ跳びます。間のマスは無視します。',
  },
  {
    type: 'cannon',
    name: '砲',
    kanji: '砲',
    count: 2,
    summary: '縦横移動。取るときは1枚越え必須。',
    detail:
      '移動のみのときは縦横に何マスでも（途中に駒がないこと）。駒を取るときは、間にちょうど1つの山を飛び越えて相手の駒へ着地します（象棋の砲に近い）。',
  },
  {
    type: 'fortress',
    name: '砦',
    kanji: '砦',
    count: 1,
    summary: '動けない。山の土台向き。',
    detail: '自らは移動できません。自駒を重ねて山を作る拠点になります。手駒からの配置は可能です。',
  },
  {
    type: 'pawn',
    name: '兵',
    kanji: '兵',
    count: 4,
    summary: '前方に1マス。',
    detail: '自分から見て真正面の1マスだけ進めます。',
  },
  {
    type: 'spy',
    name: '間',
    kanji: '間',
    count: 2,
    summary: 'どの方向にも1マス。帥は単独時のみ可。',
    detail:
      '縦・横・斜めに1マス。相手の帥を取れるのは、間が山になっていない（単独）ときだけです。',
  },
]

export const PIECE_BY_TYPE: Record<PieceType, PieceMeta> = Object.fromEntries(
  PIECE_METAS.map((m) => [m.type, m]),
) as Record<PieceType, PieceMeta>

export function initialHand(): PieceType[] {
  const hand: PieceType[] = []
  for (const meta of PIECE_METAS) {
    for (let i = 0; i < meta.count; i++) hand.push(meta.type)
  }
  return hand
}

export function playerLabel(player: Player): string {
  return player === 'black' ? '先手（黒）' : '後手（白）'
}

export function forwardDelta(player: Player): number {
  return player === 'black' ? 1 : -1
}
