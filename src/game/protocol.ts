/** Socket.IO event contract, shared by server and client for type safety. */

import type { Fx, Role, Team } from './types'
import type { ClientState } from './redact'

export interface ClientToServerEvents {
  'room:join': (
    payload: { roomId: string; playerId: string; name: string },
    ack?: (res: { ok: boolean; error?: string }) => void,
  ) => void
  'player:rename': (payload: { name: string }, ack?: Ack) => void
  'player:seat': (payload: { team: Team | null; role: Role }, ack?: Ack) => void
  'game:start': (payload: Record<string, never>, ack?: Ack) => void
  'game:clue': (payload: { word: string; count: number }, ack?: Ack) => void
  'game:guess': (payload: { cardId: number }, ack?: Ack) => void
  'game:pass': (payload: Record<string, never>, ack?: Ack) => void
  'game:reset': (payload: Record<string, never>, ack?: Ack) => void
}

export interface ServerToClientEvents {
  state: (state: ClientState) => void
  fx: (fx: Fx[]) => void
  /** Named `notice` rather than `error` — `error` is reserved by Socket.IO. */
  notice: (message: string) => void
}

export type Ack = (res: { ok: boolean; error?: string }) => void

export interface SocketData {
  playerId: string
  roomId: string
}

/** Room codes are human-shareable: 6 chars, no vowels (avoids real words). */
const ROOM_ALPHABET = '23456789BCDFGHJKLMNPQRSTVWXZ'

export function makeRoomId(): string {
  let out = ''
  for (let i = 0; i < 6; i += 1) {
    out += ROOM_ALPHABET[Math.floor(Math.random() * ROOM_ALPHABET.length)]
  }
  return out
}

export function normalizeRoomId(raw: string): string {
  return raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12)
}

export const isValidRoomId = (raw: string): boolean => /^[A-Z0-9]{4,12}$/.test(raw)
