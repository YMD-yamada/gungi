import { BINDER_CARDS } from './cards'

const STORAGE_KEY = 'gungi.progress.v1'

export interface RankStats {
  rating: number
  wins: number
  losses: number
  streak: number
  bestStreak: number
  matches: number
}

export interface ProgressState {
  cpu: RankStats
  online: RankStats
  /** Finished games in any mode (for casual unlocks) */
  activityMatches: number
  unlockedCardIds: string[]
  unlockedTitleIds: string[]
  /** Newly unlocked since last view */
  pendingRewards: Array<{ kind: 'card' | 'title'; id: string }>
  lastResultAt?: number
}

export interface TitleDef {
  id: string
  name: string
  blurb: string
  unlock: string
}

export const TITLES: TitleDef[] = [
  { id: 'rookie', name: '見習いハンター', blurb: 'はじめての対局を終えた', unlock: 'matches_1' },
  { id: 'hunter-cand', name: 'ハンター試験受験者', blurb: 'CPUで初勝利', unlock: 'cpu_wins_1' },
  { id: 'pro-hunter', name: 'プロハンター', blurb: '通算5勝', unlock: 'any_wins_5' },
  { id: 'two-star', name: '二ツ星ハンター', blurb: 'オンラインレーティング 1300', unlock: 'rating_online_1300' },
  { id: 'three-star', name: '三ツ星ハンター', blurb: 'オンラインレーティング 1500', unlock: 'rating_online_1500' },
  { id: 'gi-newbie', name: 'G.I.新人', blurb: 'カードを3枚集めた', unlock: 'cards_3' },
  { id: 'binder-keeper', name: 'ブックの番人', blurb: 'カードを5枚集めた', unlock: 'cards_5' },
  { id: 'spell-user', name: '呪文使い見習い', blurb: 'オンライン3勝', unlock: 'online_wins_3' },
  { id: 'island-champ', name: '島の実力者', blurb: 'CPUレーティング 1300', unlock: 'rating_cpu_1300' },
  { id: 'calm-player', name: '悠々たる対局者', blurb: '通算10対局（焦らず楽しむ）', unlock: 'matches_10' },
]

function defaultRank(): RankStats {
  return { rating: 1000, wins: 0, losses: 0, streak: 0, bestStreak: 0, matches: 0 }
}

export function defaultProgress(): ProgressState {
  return {
    cpu: defaultRank(),
    online: defaultRank(),
    activityMatches: 0,
    unlockedCardIds: [],
    unlockedTitleIds: [],
    pendingRewards: [],
  }
}

export function loadProgress(): ProgressState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultProgress()
    return { ...defaultProgress(), ...JSON.parse(raw) }
  } catch {
    return defaultProgress()
  }
}

export function saveProgress(state: ProgressState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    /* ignore */
  }
}

function eloDelta(my: number, opp: number, won: boolean): number {
  const expected = 1 / (1 + 10 ** ((opp - my) / 400))
  const score = won ? 1 : 0
  const k = 28
  return Math.round(k * (score - expected))
}

export function titleName(id: string): string {
  return TITLES.find((t) => t.id === id)?.name ?? id
}

function cond(progress: ProgressState, key: string): boolean {
  const anyWins = progress.cpu.wins + progress.online.wins
  const matches = progress.activityMatches
  const cards = progress.unlockedCardIds.length
  const titles = progress.unlockedTitleIds.length

  switch (key) {
    case 'matches_1':
      return matches >= 1
    case 'matches_10':
      return matches >= 10
    case 'any_win_1':
    case 'any_wins_1':
      return anyWins >= 1
    case 'any_wins_5':
      return anyWins >= 5
    case 'any_wins_10':
      return anyWins >= 10
    case 'cpu_wins_1':
      return progress.cpu.wins >= 1
    case 'cpu_wins_3':
      return progress.cpu.wins >= 3
    case 'online_wins_1':
      return progress.online.wins >= 1
    case 'online_wins_3':
      return progress.online.wins >= 3
    case 'online_wins_5':
      return progress.online.wins >= 5
    case 'rating_cpu_1200':
      return progress.cpu.rating >= 1200
    case 'rating_cpu_1300':
      return progress.cpu.rating >= 1300
    case 'rating_online_1300':
      return progress.online.rating >= 1300
    case 'rating_online_1400':
      return progress.online.rating >= 1400
    case 'rating_online_1500':
      return progress.online.rating >= 1500
    case 'cards_3':
      return cards >= 3
    case 'cards_5':
      return cards >= 5
    case 'titles_1':
      return titles >= 1
    default:
      return false
  }
}

function applyUnlocks(progress: ProgressState): ProgressState {
  let next = { ...progress }
  const pending = [...progress.pendingRewards]

  // Titles first (some cards depend on titles_1)
  for (const title of TITLES) {
    if (next.unlockedTitleIds.includes(title.id)) continue
    if (!cond(next, title.unlock)) continue
    next = {
      ...next,
      unlockedTitleIds: [...next.unlockedTitleIds, title.id],
    }
    pending.push({ kind: 'title', id: title.id })
  }

  // Cards may unlock more titles (cards_3 etc.) — iterate twice
  for (let pass = 0; pass < 3; pass++) {
    for (const card of BINDER_CARDS) {
      if (next.unlockedCardIds.includes(card.id)) continue
      if (!cond(next, card.unlock)) continue
      next = {
        ...next,
        unlockedCardIds: [...next.unlockedCardIds, card.id],
      }
      pending.push({ kind: 'card', id: card.id })
    }
    for (const title of TITLES) {
      if (next.unlockedTitleIds.includes(title.id)) continue
      if (!cond(next, title.unlock)) continue
      next = {
        ...next,
        unlockedTitleIds: [...next.unlockedTitleIds, title.id],
      }
      pending.push({ kind: 'title', id: title.id })
    }
  }

  return { ...next, pendingRewards: pending }
}

export function recordRankedResult(
  progress: ProgressState,
  mode: 'cpu' | 'online',
  won: boolean,
  /** Optional opponent rating; defaults near your rating */
  opponentRating?: number,
): ProgressState {
  const lane = { ...progress[mode] }
  const opp = opponentRating ?? lane.rating + (won ? 20 : -20)
  const delta = eloDelta(lane.rating, opp, won)
  lane.rating = Math.max(100, lane.rating + delta)
  lane.matches += 1
  if (won) {
    lane.wins += 1
    lane.streak += 1
    lane.bestStreak = Math.max(lane.bestStreak, lane.streak)
  } else {
    lane.losses += 1
    lane.streak = 0
  }

  let next: ProgressState = {
    ...progress,
    [mode]: lane,
    activityMatches: progress.activityMatches + 1,
    lastResultAt: Date.now(),
  }
  next = applyUnlocks(next)
  saveProgress(next)
  return next
}

/** Local casual match: no rating, still counts for light unlocks. */
export function recordCasualMatch(progress: ProgressState): ProgressState {
  let next: ProgressState = {
    ...progress,
    activityMatches: progress.activityMatches + 1,
    lastResultAt: Date.now(),
  }
  next = applyUnlocks(next)
  saveProgress(next)
  return next
}

export function clearPending(progress: ProgressState): ProgressState {
  const next = { ...progress, pendingRewards: [] }
  saveProgress(next)
  return next
}

export function rankLabel(rating: number): string {
  if (rating >= 1500) return '三ツ星帯'
  if (rating >= 1350) return '二ツ星帯'
  if (rating >= 1200) return 'プロ帯'
  if (rating >= 1100) return '受験者帯'
  return '見習い帯'
}

export function primaryTitle(progress: ProgressState): string {
  const order = [...progress.unlockedTitleIds].reverse()
  const last = order[0]
  return last ? titleName(last) : '未称号'
}
