import Peer, { type DataConnection } from 'peerjs'
import { sanitizeState } from './game'
import type { GameState } from './types'

export type OnlineRole = 'host' | 'guest'

export type NetMessage =
  | { type: 'hello'; role: OnlineRole }
  | { type: 'state'; state: GameState }
  | { type: 'resync-request' }

function randomRoomCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) code += alphabet[Math.floor(Math.random() * alphabet.length)]
  return code
}

export function roomPeerId(code: string): string {
  return `gungi-${code.toUpperCase()}`
}

export interface OnlineHandlers {
  onState: (state: GameState) => void
  onStatus: (msg: string) => void
  onPeerConnected?: () => void
  /** Host: answer guest resync with current state. */
  getStateForResync?: () => GameState
}

export interface OnlineSession {
  role: OnlineRole
  code: string
  destroy: () => void
  sendState: (state: GameState) => void
}

function waitOpen(peer: Peer): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!peer.destroyed && peer.open) {
      resolve()
      return
    }
    peer.once('open', () => resolve())
    peer.once('error', (err) => reject(err))
  })
}

function wireConn(conn: DataConnection, handlers: OnlineHandlers) {
  conn.on('data', (raw) => {
    const msg = raw as NetMessage
    if (msg?.type === 'state' && msg.state) {
      handlers.onState(msg.state)
    } else if (msg?.type === 'resync-request') {
      const state = handlers.getStateForResync?.()
      if (state) {
        conn.send({ type: 'state', state: sanitizeState(state) } satisfies NetMessage)
      }
    }
  })
  conn.on('close', () => handlers.onStatus('相手が切断しました'))
  conn.on('error', () => handlers.onStatus('データ通信エラー'))
}

export async function createHostSession(handlers: OnlineHandlers): Promise<OnlineSession> {
  const code = randomRoomCode()
  const peer = new Peer(roomPeerId(code), { debug: 0 })
  await waitOpen(peer)
  handlers.onStatus(`部屋コード ${code} を共有してください`)

  let conn: DataConnection | null = null

  peer.on('connection', (c) => {
    conn = c
    wireConn(c, handlers)
    c.on('open', () => {
      handlers.onStatus('相手が参加しました')
      handlers.onPeerConnected?.()
      c.send({ type: 'hello', role: 'host' } satisfies NetMessage)
      const state = handlers.getStateForResync?.()
      if (state) c.send({ type: 'state', state: sanitizeState(state) } satisfies NetMessage)
    })
  })

  peer.on('error', (err) => handlers.onStatus(`接続エラー: ${err.type}`))

  return {
    role: 'host',
    code,
    destroy: () => {
      try {
        conn?.close()
      } catch {
        /* ignore */
      }
      peer.destroy()
      handlers.onStatus('切断しました')
    },
    sendState: (state: GameState) => {
      if (!conn?.open) return
      conn.send({ type: 'state', state: sanitizeState(state) } satisfies NetMessage)
    },
  }
}

export async function joinGuestSession(code: string, handlers: OnlineHandlers): Promise<OnlineSession> {
  const normalized = code.trim().toUpperCase()
  const peer = new Peer({ debug: 0 })
  await waitOpen(peer)
  handlers.onStatus('部屋に接続中…')

  const conn = peer.connect(roomPeerId(normalized), { reliable: true })
  wireConn(conn, handlers)

  await new Promise<void>((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error('接続タイムアウト')), 15000)
    conn.on('open', () => {
      window.clearTimeout(timer)
      handlers.onStatus('接続しました（あなたは後手・白）')
      handlers.onPeerConnected?.()
      conn.send({ type: 'hello', role: 'guest' } satisfies NetMessage)
      conn.send({ type: 'resync-request' } satisfies NetMessage)
      resolve()
    })
    conn.on('error', () => {
      window.clearTimeout(timer)
      reject(new Error('接続に失敗しました'))
    })
    peer.on('error', (err) => {
      window.clearTimeout(timer)
      reject(new Error(String(err.type)))
    })
  })

  return {
    role: 'guest',
    code: normalized,
    destroy: () => {
      try {
        conn.close()
      } catch {
        /* ignore */
      }
      peer.destroy()
      handlers.onStatus('切断しました')
    },
    sendState: (state: GameState) => {
      if (!conn.open) return
      conn.send({ type: 'state', state: sanitizeState(state) } satisfies NetMessage)
    },
  }
}
