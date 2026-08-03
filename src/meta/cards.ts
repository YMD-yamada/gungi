/** Fan catalog of Greed Island–style binder slots. Art is original (non-official). */

export type CardRarity = 'C' | 'B' | 'A' | 'S' | 'SS'

export interface BinderCard {
  id: string
  /** In-story number when publicly known; otherwise fan slot code */
  no: string
  name: string
  rarity: CardRarity
  blurb: string
  /** Condition key checked by progression */
  unlock: string
  /** Official / licensed product pages (not pirate image hosts) */
  shopLinks: Array<{ label: string; url: string }>
  accent: string
}

const SHOP = {
  ichibankujiGi: {
    label: '一番くじ GREED ISLAND（公式）',
    url: 'https://1kuji.com/products/hxh6',
  },
  ichibankujiTop: {
    label: '一番くじ倶楽部（BANDAI SPIRITS）',
    url: 'https://1kuji.com/',
  },
  pbandaiHxH: {
    label: 'プレミアムバンダイでHxHを探す',
    url: 'https://p-bandai.jp/search/?q=HUNTER%C3%97HUNTER%20GREED%20ISLAND',
  },
  shueisha: {
    label: '集英社 HUNTER×HUNTER',
    url: 'https://www.shonenjump.com/j/rensai/hunter.html',
  },
} as const

export const BINDER_CARDS: BinderCard[] = [
  {
    id: 'gi-000',
    no: '000',
    name: '大天使の息吹',
    rarity: 'SS',
    blurb: '指定ポケットの象徴的な一枚。アプリ内はオリジナル再現です。',
    unlock: 'online_wins_5',
    shopLinks: [SHOP.ichibankujiGi, SHOP.pbandaiHxH],
    accent: '#d4af37',
  },
  {
    id: 'gi-001',
    no: '001',
    name: '一坪の海岸線',
    rarity: 'SS',
    blurb: '限定ポケット枠の海岸。コレクション枠として収録。',
    unlock: 'rating_online_1400',
    shopLinks: [SHOP.ichibankujiGi, SHOP.pbandaiHxH],
    accent: '#5dade2',
  },
  {
    id: 'gi-leave',
    no: '—',
    name: '離脱',
    rarity: 'A',
    blurb: '島を出るためのカード。初勝利の記念枠。',
    unlock: 'any_win_1',
    shopLinks: [SHOP.ichibankujiTop, SHOP.pbandaiHxH],
    accent: '#58d68d',
  },
  {
    id: 'gi-plot',
    no: '—',
    name: '陰謀',
    rarity: 'B',
    blurb: '対CPUで腕を磨いた証。',
    unlock: 'cpu_wins_3',
    shopLinks: [SHOP.ichibankujiGi],
    accent: '#af7ac5',
  },
  {
    id: 'gi-paladin-armor',
    no: '084',
    name: '聖騎士の鎧',
    rarity: 'S',
    blurb: '防御の象徴。オンラインで連勝すると解放。',
    unlock: 'online_wins_3',
    shopLinks: [SHOP.ichibankujiGi, SHOP.pbandaiHxH],
    accent: '#85929e',
  },
  {
    id: 'gi-risky-dice',
    no: '—',
    name: '一か八かのサイコロ',
    rarity: 'A',
    blurb: '勝負師向け。レーティング帯到達で入手。',
    unlock: 'rating_cpu_1200',
    shopLinks: [SHOP.ichibankujiTop],
    accent: '#e74c3c',
  },
  {
    id: 'gi-guide',
    no: '—',
    name: 'ガイドポスト',
    rarity: 'C',
    blurb: 'はじめての対局を終えた人へ。',
    unlock: 'matches_1',
    shopLinks: [SHOP.shueisha, SHOP.ichibankujiTop],
    accent: '#f5b041',
  },
  {
    id: 'gi-book',
    no: '—',
    name: 'ブック',
    rarity: 'B',
    blurb: 'カードを収める「本」。コレクション5種で解放。',
    unlock: 'cards_5',
    shopLinks: [SHOP.pbandaiHxH, SHOP.ichibankujiGi],
    accent: '#1a5276',
  },
  {
    id: 'gi-accompany',
    no: '—',
    name: '同伴',
    rarity: 'B',
    blurb: 'オンライン初勝利の友好カード。',
    unlock: 'online_wins_1',
    shopLinks: [SHOP.ichibankujiGi],
    accent: '#48c9b0',
  },
  {
    id: 'gi-gain',
    no: '—',
    name: '獲得',
    rarity: 'C',
    blurb: 'CPU初勝利で手に入る基本カード。',
    unlock: 'cpu_wins_1',
    shopLinks: [SHOP.ichibankujiTop],
    accent: '#aed6f1',
  },
  {
    id: 'gi-list',
    no: '—',
    name: 'リスト',
    rarity: 'C',
    blurb: '称号を1つ獲得すると解放。',
    unlock: 'titles_1',
    shopLinks: [SHOP.shueisha],
    accent: '#f9e79f',
  },
  {
    id: 'gi-magnetic',
    no: '—',
    name: '磁力',
    rarity: 'A',
    blurb: '通算10勝の引力。',
    unlock: 'any_wins_10',
    shopLinks: [SHOP.pbandaiHxH],
    accent: '#5b2c6f',
  },
]

export const CARD_BY_ID = Object.fromEntries(BINDER_CARDS.map((c) => [c.id, c])) as Record<
  string,
  BinderCard
>
