/**
 * Socket.IO wiring: the only place game state is mutated.
 *
 * Every handler is authoritative — the client sends intent ("guess card 7"),
 * never facts. Results are fanned out as per-viewer redacted snapshots so a
 * spymaster and an operative in the same room literally receive different
 * payloads.
 */

import type { Server as HttpServer } from 'node:http'
import { Server, type Socket } from 'socket.io'

import {
  giveClue,
  joinRoom,
  makeGuess,
  passTurn,
  resetToLobby,
  setConnected,
  setName,
  setSeat,
  startGame,
} from '../game/engine'
import { viewFor } from '../game/redact'
import { isValidRoomId, normalizeRoomId } from '../game/protocol'
import type {
  Ack,
  ClientToServerEvents,
  ServerToClientEvents,
  SocketData,
} from '../game/protocol'
import type { ActionResult, Fx, GameState } from '../game/types'
import { getOrCreateRoom, getRoom, startRoomSweeper } from './rooms'

type GameSocket = Socket<ClientToServerEvents, ServerToClientEvents, never, SocketData>
type GameServer = Server<ClientToServerEvents, ServerToClientEvents, never, SocketData>

/** Crude per-socket flood guard; a party game needs nothing cleverer. */
const RATE_LIMIT = { windowMs: 1000, max: 20 }
const buckets = new WeakMap<object, { start: number; count: number }>()

function rateLimited(socket: GameSocket): boolean {
  const now = Date.now()
  const bucket = buckets.get(socket) ?? { start: now, count: 0 }
  if (now - bucket.start > RATE_LIMIT.windowMs) {
    bucket.start = now
    bucket.count = 0
  }
  bucket.count += 1
  buckets.set(socket, bucket)
  return bucket.count > RATE_LIMIT.max
}

export function attachSocketServer(httpServer: HttpServer): GameServer {
  const io: GameServer = new Server(httpServer, {
    path: '/api/realtime',
    // Same-origin in dev and prod; widen only if you split the front end off.
    cors: { origin: process.env.SOCKET_CORS_ORIGIN ?? true, credentials: true },
    pingInterval: 20_000,
    pingTimeout: 25_000,
  })

  startRoomSweeper()

  /** Push a freshly redacted snapshot to every socket in the room. */
  async function broadcastState(roomId: string): Promise<void> {
    const state = getRoom(roomId)
    if (!state) return
    const sockets = await io.in(roomId).fetchSockets()
    for (const s of sockets) {
      s.emit('state', viewFor(state, s.data.playerId ?? null))
    }
  }

  function broadcastFx(roomId: string, fx: Fx[] | undefined): void {
    if (fx && fx.length) io.to(roomId).emit('fx', fx)
  }

  return io.on('connection', (socket: GameSocket) => {
    /**
     * Wraps a mutating handler: resolves the room, runs it, answers the ack,
     * then fans out state + effects.
     */
    function handle(
      ack: Ack | undefined,
      run: (state: GameState, playerId: string) => ActionResult,
    ): void {
      if (rateLimited(socket)) {
        ack?.({ ok: false, error: 'تمهّل قليلًا.' })
        return
      }
      const { roomId, playerId } = socket.data
      const state = roomId ? getRoom(roomId) : undefined
      if (!state || !playerId) {
        ack?.({ ok: false, error: 'أنت لست داخل غرفة.' })
        return
      }

      let result: ActionResult
      try {
        result = run(state, playerId)
      } catch (err) {
        console.error('[socket] handler threw', err)
        ack?.({ ok: false, error: 'حدث خطأ غير متوقع.' })
        return
      }

      ack?.({ ok: result.ok, error: result.error })
      if (!result.ok) {
        socket.emit('notice', result.error ?? 'تم رفض الإجراء.')
        return
      }
      void broadcastState(roomId)
      broadcastFx(roomId, result.fx)
    }

    socket.on('room:join', ({ roomId: rawRoomId, playerId, name }, ack) => {
      const roomId = normalizeRoomId(String(rawRoomId ?? ''))
      const id = String(playerId ?? '').slice(0, 64)

      if (!isValidRoomId(roomId)) {
        ack?.({ ok: false, error: 'رمز الغرفة غير صالح.' })
        return
      }
      if (!id) {
        ack?.({ ok: false, error: 'معرّف اللاعب مفقود.' })
        return
      }

      // A socket belongs to exactly one room for its lifetime.
      if (socket.data.roomId && socket.data.roomId !== roomId) {
        void socket.leave(socket.data.roomId)
      }

      socket.data.playerId = id
      socket.data.roomId = roomId
      void socket.join(roomId)

      const state = getOrCreateRoom(roomId)
      joinRoom(state, id, String(name ?? '').trim().slice(0, 18))

      ack?.({ ok: true })
      void broadcastState(roomId)
    })

    socket.on('player:rename', ({ name }, ack) =>
      handle(ack, (state, playerId) => setName(state, playerId, String(name ?? ''))),
    )

    socket.on('player:seat', ({ team, role }, ack) =>
      handle(ack, (state, playerId) => setSeat(state, playerId, team ?? null, role)),
    )

    socket.on('game:start', (_payload, ack) =>
      handle(ack, (state, playerId) => startGame(state, playerId)),
    )

    socket.on('game:clue', ({ word, count }, ack) =>
      handle(ack, (state, playerId) =>
        giveClue(state, playerId, String(word ?? ''), Number(count)),
      ),
    )

    socket.on('game:guess', ({ cardId }, ack) =>
      handle(ack, (state, playerId) => makeGuess(state, playerId, Number(cardId))),
    )

    socket.on('game:pass', (_payload, ack) =>
      handle(ack, (state, playerId) => passTurn(state, playerId)),
    )

    socket.on('game:reset', (_payload, ack) =>
      handle(ack, (state, playerId) => resetToLobby(state, playerId)),
    )

    socket.on('disconnect', () => {
      const { roomId, playerId } = socket.data
      if (!roomId || !playerId) return
      const state = getRoom(roomId)
      if (!state) return

      void (async () => {
        // The same player may have several tabs open; only mark them offline
        // once their last socket is gone.
        const remaining = await io.in(roomId).fetchSockets()
        if (remaining.some((s) => s.data.playerId === playerId)) return
        setConnected(state, playerId, false)
        await broadcastState(roomId)
      })()
    })
  })
}
