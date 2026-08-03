import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { BoardView } from './components/BoardView'
import { CollectionPanel } from './components/CollectionPanel'
import { HandView } from './components/HandView'
import { RulesPanel } from './components/RulesPanel'
import { chooseCpuAction } from './game/ai'
import {
  applyAction,
  clearSelection,
  createInitialState,
  markSetupReady,
  selectBoard,
  selectHand,
} from './game/game'
import { findMarshal } from './game/board'
import { appendMatchEvent, createMatchLog, formatSec, loadPacePrefs, paceTuning } from './game/matchLog'
import { createHostSession, joinGuestSession, type OnlineRole, type OnlineSession } from './game/online'
import { playerLabel } from './game/pieces'
import { diffAndLog } from './game/telemetry'
import {
  loadProgress,
  primaryTitle,
  rankLabel,
  recordCasualMatch,
  recordRankedResult,
  type ProgressState,
} from './meta/progression'
import type { GameState, PlayMode, Player } from './game/types'
import './App.css'

function statusText(state: GameState, mode: PlayMode, mySide: Player | null): string {
  if (state.phase === 'ended' && state.winner) {
    return `${playerLabel(state.winner)}の勝利`
  }
  const you = mySide && state.turn === mySide ? '（あなた）' : ''
  const cpu = mode === 'cpu' && state.turn === 'white' ? '（CPU）' : ''
  if (state.phase === 'setup') {
    return `配置中 — ${playerLabel(state.turn)}${you}${cpu}`
  }
  return `対局中 — ${playerLabel(state.turn)}の手番${you}${cpu}`
}

function modeLabel(mode: PlayMode): string {
  if (mode === 'cpu') return '対CPU'
  if (mode === 'online') return 'オンライン'
  return 'ローカル2人'
}

export default function App() {
  const [state, setState] = useState<GameState>(() => createInitialState())
  const [tab, setTab] = useState<'play' | 'rules' | 'collection'>('play')
  const [mode, setMode] = useState<PlayMode | null>(null)
  const [onlineRole, setOnlineRole] = useState<OnlineRole | null>(null)
  const [onlineStatus, setOnlineStatus] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [busyOnline, setBusyOnline] = useState(false)
  const [roomCode, setRoomCode] = useState<string | null>(null)
  const [progress, setProgress] = useState<ProgressState>(() => loadProgress())
  const [elapsedMs, setElapsedMs] = useState(0)

  const sessionRef = useRef<OnlineSession | null>(null)
  const stateRef = useRef(state)
  const matchIdRef = useRef<string | null>(null)
  const turnStartedAtRef = useRef(Date.now())
  const scoredMatchRef = useRef<string | null>(null)
  const modeRef = useRef(mode)
  const sideRef = useRef<Player | null>(null)
  stateRef.current = state
  modeRef.current = mode

  const tuning = useMemo(() => paceTuning(loadPacePrefs()), [])

  const controllingSide: Player | null =
    mode === 'cpu' ? 'black' : mode === 'online' ? (onlineRole === 'guest' ? 'white' : 'black') : null
  sideRef.current = controllingSide

  const canInteract =
    mode === 'local' ||
    (mode !== null &&
      controllingSide !== null &&
      state.phase !== 'ended' &&
      state.turn === controllingSide &&
      !(state.phase === 'setup' && state.setupReady[controllingSide]))

  const beginMatchLog = useCallback((nextMode: PlayMode, side: Player | undefined, code?: string) => {
    const match = createMatchLog({ mode: nextMode, mySide: side, roomCode: code })
    matchIdRef.current = match.id
    scoredMatchRef.current = null
    turnStartedAtRef.current = Date.now()
    appendMatchEvent(match.id, {
      kind: 'turn_start',
      side: 'black',
      phase: 'setup',
      source: 'system',
    })
    return match.id
  }, [])

  const applyMatchScore = useCallback((ended: GameState) => {
    const id = matchIdRef.current
    if (!id || scoredMatchRef.current === id) return
    scoredMatchRef.current = id
    const m = modeRef.current
    const side = sideRef.current
    if (m === 'cpu' || m === 'online') {
      const won = !!ended.winner && ended.winner === side
      setProgress((p) => recordRankedResult(p, m, won))
    } else if (m === 'local') {
      setProgress((p) => recordCasualMatch(p))
    }
  }, [])

  const commitTransition = useCallback(
    (prev: GameState, next: GameState, source: 'local' | 'remote' | 'cpu') => {
      turnStartedAtRef.current = diffAndLog(matchIdRef.current, prev, next, {
        source,
        mySide: sideRef.current,
        turnStartedAt: turnStartedAtRef.current,
      })
      if (prev.phase !== 'ended' && next.phase === 'ended') {
        applyMatchScore(next)
      }
      return next
    },
    [applyMatchScore],
  )

  const pushState = useCallback(
    (updater: (s: GameState) => GameState) => {
      setState((prev) => {
        const next = updater(prev)
        if (next === prev) return prev
        commitTransition(prev, next, 'local')
        sessionRef.current?.sendState(next)
        return next
      })
    },
    [commitTransition],
  )

  const applyRemoteState = useCallback(
    (incoming: GameState) => {
      setState((prev) => {
        commitTransition(prev, incoming, 'remote')
        return incoming
      })
    },
    [commitTransition],
  )

  useEffect(() => {
    if (mode !== 'cpu') return
    if (state.phase === 'ended') return
    if (state.turn !== 'white') return

    const delay = state.phase === 'setup' ? tuning.cpuSetupMs : tuning.cpuPlayMs
    const timer = window.setTimeout(() => {
      setState((s) => {
        if (s.turn !== 'white' || s.phase === 'ended') return s
        const action = chooseCpuAction(s)
        if (!action) return s
        const next = applyAction(s, action)
        commitTransition(s, next, 'cpu')
        return next
      })
    }, delay)

    return () => window.clearTimeout(timer)
  }, [mode, state.turn, state.phase, state.moveLog.length, state.setupReady.white, tuning, commitTransition])

  useEffect(() => {
    return () => {
      sessionRef.current?.destroy()
      sessionRef.current = null
    }
  }, [])

  useEffect(() => {
    if (mode !== 'online' || state.phase === 'ended') {
      setElapsedMs(0)
      return
    }
    const tick = () => setElapsedMs(Date.now() - turnStartedAtRef.current)
    tick()
    const id = window.setInterval(tick, 1000)
    return () => window.clearInterval(id)
  }, [mode, state.turn, state.phase, state.moveLog.length])

  const startLocal = () => {
    sessionRef.current?.destroy()
    sessionRef.current = null
    setOnlineRole(null)
    setOnlineStatus('')
    setRoomCode(null)
    setMode('local')
    setState(createInitialState())
    beginMatchLog('local', undefined)
  }

  const startCpu = () => {
    sessionRef.current?.destroy()
    sessionRef.current = null
    setOnlineRole(null)
    setOnlineStatus('')
    setRoomCode(null)
    setMode('cpu')
    setState(createInitialState())
    beginMatchLog('cpu', 'black')
  }

  const startHost = async () => {
    setBusyOnline(true)
    setOnlineStatus('部屋を準備中…')
    try {
      sessionRef.current?.destroy()
      const fresh = createInitialState()
      setState(fresh)
      stateRef.current = fresh
      const session = await createHostSession({
        onState: applyRemoteState,
        onStatus: setOnlineStatus,
        getStateForResync: () => stateRef.current,
        onPeerConnected: () => {
          if (matchIdRef.current) {
            appendMatchEvent(matchIdRef.current, { kind: 'connect', source: 'system' })
          }
        },
      })
      sessionRef.current = session
      setOnlineRole('host')
      setRoomCode(session.code)
      setMode('online')
      beginMatchLog('online', 'black', session.code)
    } catch (e) {
      setOnlineStatus(e instanceof Error ? e.message : '部屋作成に失敗しました')
    } finally {
      setBusyOnline(false)
    }
  }

  const startJoin = async () => {
    if (!joinCode.trim()) {
      setOnlineStatus('部屋コードを入力してください')
      return
    }
    setBusyOnline(true)
    setOnlineStatus('接続中…')
    try {
      sessionRef.current?.destroy()
      const session = await joinGuestSession(joinCode, {
        onState: applyRemoteState,
        onStatus: setOnlineStatus,
        onPeerConnected: () => {
          if (matchIdRef.current) {
            appendMatchEvent(matchIdRef.current, { kind: 'connect', source: 'system' })
          }
        },
      })
      sessionRef.current = session
      setOnlineRole('guest')
      setRoomCode(session.code)
      setMode('online')
      beginMatchLog('online', 'white', session.code)
    } catch (e) {
      setOnlineStatus(e instanceof Error ? e.message : '参加に失敗しました')
      sessionRef.current = null
      setOnlineRole(null)
      setRoomCode(null)
    } finally {
      setBusyOnline(false)
    }
  }

  const resetMatch = () => {
    if (mode === 'online' && onlineRole === 'guest') {
      setOnlineStatus('新しい対局はホスト側から開始してください')
      return
    }
    if (!mode) return
    const next = createInitialState()
    setState(next)
    sessionRef.current?.sendState(next)
    beginMatchLog(mode, controllingSide ?? undefined, roomCode ?? undefined)
  }

  const leaveMode = () => {
    if (matchIdRef.current && state.phase !== 'ended') {
      appendMatchEvent(matchIdRef.current, { kind: 'disconnect', source: 'system' })
    }
    sessionRef.current?.destroy()
    sessionRef.current = null
    setOnlineRole(null)
    setRoomCode(null)
    setMode(null)
    setOnlineStatus('')
    matchIdRef.current = null
    setState(createInitialState())
  }

  const canReady =
    canInteract &&
    state.phase === 'setup' &&
    controllingSide !== null
      ? !state.setupReady[controllingSide] && !!findMarshal(state.board, controllingSide)
      : canInteract &&
        state.phase === 'setup' &&
        !state.setupReady[state.turn] &&
        !!findMarshal(state.board, state.turn)

  const flipBoard = mode === 'online' && onlineRole === 'guest'
  const rewardHint =
    progress.pendingRewards.length > 0
      ? `新しい報酬 ${progress.pendingRewards.length}件（コレクション）`
      : null

  return (
    <div className="app">
      <header className="hero">
        <div className="hero-brand">
          <p className="eyebrow">HUNTER×HUNTER inspired</p>
          <h1>グンギ</h1>
          <p className="tagline">焦らず楽しむ軍議。称号とカードも少しずつ。</p>
        </div>
        <nav className="tabs" aria-label="表示切替">
          <button type="button" className={tab === 'play' ? 'active' : ''} onClick={() => setTab('play')}>
            対局
          </button>
          <button type="button" className={tab === 'rules' ? 'active' : ''} onClick={() => setTab('rules')}>
            ルール
          </button>
          <button
            type="button"
            className={tab === 'collection' ? 'active' : ''}
            onClick={() => setTab('collection')}
          >
            コレクション
          </button>
        </nav>
      </header>

      {tab === 'rules' ? (
        <RulesPanel />
      ) : tab === 'collection' ? (
        <CollectionPanel progress={progress} onProgress={setProgress} />
      ) : mode === null ? (
        <section className="mode-panel">
          <h2>対戦モード</h2>
          <p className="mode-lead">勝ち負けより対局そのものを楽しむ想定です。ランキングはCPU／オンラインのみ。</p>
          <p className="pace-banner">
            称号「{primaryTitle(progress)}」 · CPU {progress.cpu.rating}（{rankLabel(progress.cpu.rating)}） ·
            オンライン {progress.online.rating}（{rankLabel(progress.online.rating)}） · カード{' '}
            {progress.unlockedCardIds.length}
          </p>
          {rewardHint ? <p className="online-status">{rewardHint}</p> : null}
          <div className="mode-grid">
            <button type="button" className="mode-card" onClick={startLocal}>
              <strong>ローカル2人</strong>
              <span>レーティングなし。気軽に</span>
            </button>
            <button type="button" className="mode-card" onClick={startCpu}>
              <strong>対CPU</strong>
              <span>時間表示なし · ランキング対象</span>
            </button>
            <div className="mode-card mode-card-online">
              <strong>オンライン</strong>
              <span>経過は整数秒のみ · ランキング対象</span>
              <div className="online-actions">
                <button type="button" className="btn" disabled={busyOnline} onClick={startHost}>
                  部屋を作る
                </button>
                <div className="join-row">
                  <input
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    placeholder="部屋コード"
                    maxLength={8}
                    aria-label="部屋コード"
                  />
                  <button type="button" className="btn btn-ghost" disabled={busyOnline} onClick={startJoin}>
                    参加
                  </button>
                </div>
              </div>
            </div>
          </div>
          {onlineStatus ? <p className="online-status">{onlineStatus}</p> : null}
        </section>
      ) : (
        <main className="play">
          <section className="panel panel-side">
            <HandView
              state={state}
              player="white"
              interactive={canInteract && state.turn === 'white'}
              onSelect={(t) => pushState((s) => selectHand(s, t))}
            />
            <div className="status-card">
              <p className="mode-chip">{modeLabel(mode)}</p>
              <p className="status">{statusText(state, mode, controllingSide)}</p>
              {mode === 'cpu' || mode === 'online' ? (
                <p className="rank-inline">
                  {mode === 'cpu' ? 'CPU' : 'オンライン'} {progress[mode].rating} · {primaryTitle(progress)}
                </p>
              ) : null}
              {mode === 'online' ? (
                <div className="timer-row" aria-label="手番経過（参考）">
                  <span className="timer-value">{formatSec(elapsedMs)}</span>
                  <span className="timer-avg">参考（厳密な制限なし）</span>
                </div>
              ) : null}
              {rewardHint && state.phase === 'ended' ? (
                <p className="online-status tight">{rewardHint}</p>
              ) : null}
              {onlineStatus ? <p className="online-status tight">{onlineStatus}</p> : null}
              {mode === 'online' && roomCode ? (
                <p className="room-code">
                  部屋 <code>{roomCode}</code>
                </p>
              ) : null}
              <div className="actions">
                {state.phase === 'setup' ? (
                  <button
                    type="button"
                    className="btn"
                    disabled={!canReady}
                    onClick={() => pushState((s) => markSetupReady(s))}
                  >
                    配置完了
                  </button>
                ) : null}
                <button
                  type="button"
                  className="btn btn-ghost"
                  disabled={!canInteract}
                  onClick={() => pushState((s) => clearSelection(s))}
                >
                  選択解除
                </button>
                <button type="button" className="btn btn-ghost" onClick={resetMatch}>
                  新しい対局
                </button>
                <button type="button" className="btn btn-ghost" onClick={leaveMode}>
                  モード選択へ
                </button>
              </div>
            </div>
            <HandView
              state={state}
              player="black"
              interactive={canInteract && state.turn === 'black'}
              onSelect={(t) => pushState((s) => selectHand(s, t))}
            />
          </section>

          <section className="panel panel-board">
            <BoardView
              state={state}
              interactive={canInteract}
              flip={flipBoard}
              onSquare={(r, c) => {
                if (!canInteract) return
                pushState((s) => selectBoard(s, r, c))
              }}
            />
          </section>

          <section className="panel panel-log">
            <h2>棋譜ログ</h2>
            <ol className="log">
              {[...state.moveLog].reverse().map((line, i) => (
                <li key={`${state.moveLog.length - i}-${line}`}>{line}</li>
              ))}
            </ol>
          </section>
        </main>
      )}

      <footer className="footer">
        <span>ローカル: npm run dev / 静的配信: npm run build</span>
        <span>ファン再構成ルール（非公式）</span>
      </footer>
    </div>
  )
}
