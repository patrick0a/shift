'use client'

/**
 * The single client-side connection to the authoritative game server.
 *
 * Owns the socket lifecycle, exposes the redacted room state, and surfaces
 * one-shot `fx` events (reveals, Shifts, assassinations) that the UI animates.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { io, type Socket } from 'socket.io-client'

import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from '@/game/protocol'
import type { ClientState } from '@/game/redact'
import type { Fx, Role, Team } from '@/game/types'
import { getPlayerId, getPlayerName, setPlayerName } from './identity'

type GameSocket = Socket<ServerToClientEvents, ClientToServerEvents>

export type ConnectionStatus = 'connecting' | 'live' | 'reconnecting' | 'offline'

export interface Toast {
  id: number
  message: string
}

export interface UseGame {
  state: ClientState | null
  status: ConnectionStatus
  toasts: Toast[]
  /** Newest batch of one-shot effects; consumers key off `fxSeq`. */
  fx: Fx[]
  fxSeq: number
  dismissToast: (id: number) => void
  rename: (name: string) => void
  takeSeat: (team: Team | null, role: Role) => void
  start: () => void
  clue: (word: string, count: number) => void
  guess: (cardId: number) => void
  pass: () => void
  reset: () => void
}

export function useGame(roomId: string): UseGame {
  const socketRef = useRef<GameSocket | null>(null)
  const [state, setState] = useState<ClientState | null>(null)
  const [status, setStatus] = useState<ConnectionStatus>('connecting')
  const [toasts, setToasts] = useState<Toast[]>([])
  const [fx, setFx] = useState<Fx[]>([])
  const [fxSeq, setFxSeq] = useState(0)
  const toastId = useRef(0)

  const pushToast = useCallback((message: string) => {
    const id = (toastId.current += 1)
    setToasts((t) => [...t.slice(-2), { id, message }])
    window.setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id))
    }, 3200)
  }, [])

  const dismissToast = useCallback((id: number) => {
    setToasts((t) => t.filter((x) => x.id !== id))
  }, [])

  useEffect(() => {
    if (!roomId) return

    const playerId = getPlayerId()
    const name = getPlayerName()

    const socket: GameSocket = io({
      path: '/api/realtime',
      transports: ['websocket', 'polling'],
      reconnectionDelay: 400,
      reconnectionDelayMax: 4000,
    })
    socketRef.current = socket

    const join = () => {
      socket.emit('room:join', { roomId, playerId, name }, (res) => {
        if (!res.ok) pushToast(res.error ?? 'Could not join room.')
      })
    }

    socket.on('connect', () => {
      setStatus('live')
      join() // also re-runs after a reconnect, restoring the seat
    })
    socket.on('disconnect', () => setStatus('reconnecting'))
    socket.io.on('reconnect_attempt', () => setStatus('reconnecting'))
    socket.io.on('error', () => setStatus('offline'))
    socket.on('connect_error', () => setStatus('reconnecting'))

    socket.on('state', (next) => setState(next))
    socket.on('fx', (batch) => {
      setFx(batch)
      setFxSeq((n) => n + 1)
    })
    socket.on('notice', (message) => pushToast(message))

    return () => {
      socket.removeAllListeners()
      socket.disconnect()
      socketRef.current = null
    }
  }, [roomId, pushToast])

  const emit = useCallback(
    <E extends keyof ClientToServerEvents>(
      event: E,
      payload: Parameters<ClientToServerEvents[E]>[0],
    ) => {
      const socket = socketRef.current
      if (!socket) return
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(socket as any).emit(event, payload, (res: { ok: boolean; error?: string }) => {
        if (res && !res.ok && res.error) pushToast(res.error)
      })
    },
    [pushToast],
  )

  const rename = useCallback(
    (name: string) => {
      const clean = name.trim().slice(0, 18)
      if (!clean) return
      setPlayerName(clean)
      emit('player:rename', { name: clean })
    },
    [emit],
  )

  const takeSeat = useCallback(
    (team: Team | null, role: Role) => emit('player:seat', { team, role }),
    [emit],
  )
  const start = useCallback(() => emit('game:start', {}), [emit])
  const clue = useCallback(
    (word: string, count: number) => emit('game:clue', { word, count }),
    [emit],
  )
  const guess = useCallback((cardId: number) => emit('game:guess', { cardId }), [emit])
  const pass = useCallback(() => emit('game:pass', {}), [emit])
  const reset = useCallback(() => emit('game:reset', {}), [emit])

  return useMemo(
    () => ({
      state,
      status,
      toasts,
      fx,
      fxSeq,
      dismissToast,
      rename,
      takeSeat,
      start,
      clue,
      guess,
      pass,
      reset,
    }),
    [state, status, toasts, fx, fxSeq, dismissToast, rename, takeSeat, start, clue, guess, pass, reset],
  )
}
