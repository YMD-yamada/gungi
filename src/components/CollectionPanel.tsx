import { BINDER_CARDS, type BinderCard } from '../meta/cards'
import {
  clearPending,
  loadProgress,
  primaryTitle,
  rankLabel,
  titleName,
  TITLES,
  type ProgressState,
} from '../meta/progression'

function CardFace({ card, owned }: { card: BinderCard; owned: boolean }) {
  return (
    <article className={`gi-card rarity-${card.rarity}${owned ? ' is-owned' : ' is-locked'}`}>
      <div className="gi-card-inner" style={{ ['--gi-accent' as string]: card.accent }}>
        <header>
          <span className="gi-no">No.{card.no}</span>
          <span className="gi-rarity">{card.rarity}</span>
        </header>
        <div className="gi-art" aria-hidden>
          <span>{owned ? card.name.slice(0, 1) : '?'}</span>
        </div>
        <h3>{owned ? card.name : '未入手'}</h3>
        <p>{owned ? card.blurb : '条件を満たすとブックに加わります。'}</p>
        {owned ? (
          <div className="gi-shops">
            <p className="gi-shop-note">公式商品・情報（別サイト）</p>
            {card.shopLinks.map((link) => (
              <a key={link.url} href={link.url} target="_blank" rel="noopener noreferrer">
                {link.label}
              </a>
            ))}
          </div>
        ) : null}
      </div>
    </article>
  )
}

export function CollectionPanel({
  progress,
  onProgress,
}: {
  progress: ProgressState
  onProgress: (p: ProgressState) => void
}) {
  const owned = new Set(progress.unlockedCardIds)

  return (
    <aside className="collection" aria-label="ランキングとコレクション">
      <header className="collection-head">
        <div>
          <h2>ランキング / 称号 / カードブック</h2>
          <p>
            CPU・オンラインの成績でレーティングと称号が育ちます。条件達成でG.I.風カードを入手（画像はファン向けオリジナル再現）。公式カード商品は各カードのリンクから。
          </p>
        </div>
        {progress.pendingRewards.length > 0 ? (
          <button type="button" className="btn" onClick={() => onProgress(clearPending(progress))}>
            報酬を確認済みにする（{progress.pendingRewards.length}）
          </button>
        ) : null}
      </header>

      {progress.pendingRewards.length > 0 ? (
        <section className="reward-banner">
          <h3>新しい入手</h3>
          <ul>
            {progress.pendingRewards.map((r, i) => (
              <li key={`${r.kind}-${r.id}-${i}`}>
                {r.kind === 'card'
                  ? `カード「${BINDER_CARDS.find((c) => c.id === r.id)?.name ?? r.id}」`
                  : `称号「${titleName(r.id)}」`}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="rank-grid">
        <div className="rank-card">
          <h3>対CPU</h3>
          <p className="rank-score">{progress.cpu.rating}</p>
          <p>{rankLabel(progress.cpu.rating)}</p>
          <p>
            {progress.cpu.wins}勝 {progress.cpu.losses}敗 · 連勝 {progress.cpu.streak}（最高{' '}
            {progress.cpu.bestStreak}）
          </p>
        </div>
        <div className="rank-card">
          <h3>オンライン</h3>
          <p className="rank-score">{progress.online.rating}</p>
          <p>{rankLabel(progress.online.rating)}</p>
          <p>
            {progress.online.wins}勝 {progress.online.losses}敗 · 連勝 {progress.online.streak}（最高{' '}
            {progress.online.bestStreak}）
          </p>
        </div>
        <div className="rank-card">
          <h3>称号</h3>
          <p className="rank-score title-main">{primaryTitle(progress)}</p>
          <p>対局数 {progress.activityMatches}</p>
          <ul className="title-list">
            {TITLES.map((t) => (
              <li key={t.id} className={progress.unlockedTitleIds.includes(t.id) ? 'have' : 'need'}>
                {progress.unlockedTitleIds.includes(t.id) ? '◆' : '◇'} {t.name}
                <small>{t.blurb}</small>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section>
        <h3>カードブック（{owned.size}/{BINDER_CARDS.length}）</h3>
        <p className="collection-legal">
          本アプリのカード面は非公式のオリジナル再現です。著作権は各権利者に帰属します。本物のカード・一番くじ等は公式リンク先でご確認ください。
        </p>
        <div className="gi-grid">
          {BINDER_CARDS.map((card) => (
            <CardFace key={card.id} card={card} owned={owned.has(card.id)} />
          ))}
        </div>
      </section>

      <p className="collection-foot">
        <button type="button" className="btn btn-ghost" onClick={() => onProgress(loadProgress())}>
          再読み込み
        </button>
      </p>
    </aside>
  )
}
