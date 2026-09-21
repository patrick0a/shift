/**
 * In-memory room store.
 *
 * Deliberately simple: one Node process owns every room. That is the right
 * trade for a party game (rooms are ephemeral, sessions are minutes long) and
 * it keeps the whole thing runnable with `npm run dev` and no database.
 *
 * To scale horizontally, swap this module for Redis (state as a hash per room)
 * and attach `@socket.io/redis-adapter` in `socket.ts` — nothing else changes,
 * because every mutation already funnels through `withRoom`.
 */

import { createRoom } from '../game/engine'
import type { GameState } from '../game/types'

/** Rooms untouched for this long are swept. */
const ROOM_TTL_MS = 6 * 60 * 60 * 1000
const SWEEP_INTERVAL_MS = 15 * 60 * 1000

const rooms = new Map<string, GameState>()

export function getRoom(roomId: string): GameState | undefined {
  return rooms.get(roomId)
}

export function getOrCreateRoom(roomId: string): GameState {
  let room = rooms.get(roomId)
  if (!room) {
    room = createRoom(roomId)
    rooms.set(roomId, room)
  }
  return room
}

export const roomCount = (): number => rooms.size

export function startRoomSweeper(): NodeJS.Timeout {
  const timer = setInterval(() => {
    const cutoff = Date.now() - ROOM_TTL_MS
    for (const [id, room] of rooms) {
      const empty = room.players.every((p) => !p.connected)
      if (empty && room.updatedAt < cutoff) rooms.delete(id)
    }
  }, SWEEP_INTERVAL_MS)
  timer.unref?.()
  return timer
}
