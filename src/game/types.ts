/**
 * Shared domain model for Codenames: Shift.
 *
 * This module is imported by BOTH the Socket.IO server and the React client,
 * so it must stay free of any node-only or dom-only imports.
 */

export type Team = 'red' | 'blue'

/** The secret identity of a card on the key grid. */
export type CardKind = 'red' | 'blue' | 'neutral' | 'assassin'

/**
 * `both` exists so a 1v1 (or solo-practice) game works: one person acts as
 * their team's Spymaster *and* Operative.
 */
export type Role = 'spymaster' | 'operative' | 'both'

export type Phase = 'lobby' | 'clue' | 'guess' | 'ended'

export type WinReason = 'words' | 'assassin' | 'trap' | 'forfeit'

export interface Card {
  id: number
  word: string
  /**
   * Redacted to `null` for operatives on unrevealed cards — the secret key
   * never leaves the server for a client that isn't allowed to see it.
   */
  kind: CardKind | null
  revealed: boolean
  /** Which team's guess flipped this card (null if unrevealed). */
  revealedBy: Team | null
}

/**
 * A Shifting Trap: a neutral card that is temporarily lethal.
 *
 * Armed the instant a team lands their 2nd consecutive correct guess in a
 * turn, but it only goes *live* on the following turn — see `liveOnTurn`.
 */
export interface Trap {
  id: string
  /** The neutral card that has been weaponised. */
  cardId: number
  /** Team whose streak created it (for flavour text in the log). */
  createdBy: Team
  /** `turnSerial` on which this trap is lethal. Exactly one turn. */
  liveOnTurn: number
  /** True once `state.turnSerial === liveOnTurn`. */
  live: boolean
}

export interface Clue {
  word: string
  count: number
  team: Team
  by: string
  at: number
}

export type LogEntry =
  | { id: string; at: number; type: 'system'; text: string }
  | { id: string; at: number; type: 'clue'; team: Team; by: string; word: string; count: number }
  | {
      id: string
      at: number
      type: 'guess'
      team: Team
      by: string
      word: string
      outcome: 'correct' | 'neutral' | 'opponent' | 'assassin' | 'trap'
    }
  | { id: string; at: number; type: 'pass'; team: Team; by: string }
  | { id: string; at: number; type: 'turn'; team: Team }
  /** `word` is redacted to null for anyone who can't see the key grid. */
  | { id: string; at: number; type: 'shift'; team: Team; word: string | null }
  | { id: string; at: number; type: 'end'; team: Team; reason: WinReason }

/**
 * A log entry before the store stamps it. Plain `Omit` over a union keeps only
 * the keys common to every member, so it has to distribute.
 */
export type NewLogEntry = LogEntry extends infer T
  ? T extends LogEntry
    ? Omit<T, 'id' | 'at'>
    : never
  : never

export interface Player {
  id: string
  name: string
  /** null = spectator. */
  team: Team | null
  role: Role
  connected: boolean
  /** Room creator; the only one who can start / reset the game. */
  host: boolean
  lastSeen: number
}

export interface GameState {
  roomId: string
  createdAt: number
  updatedAt: number
  phase: Phase

  cards: Card[]
  /** The team that goes first and therefore owns 9 cards instead of 8. */
  startingTeam: Team
  turn: Team
  /** Monotonic counter, incremented on every turn handover. Drives trap expiry. */
  turnSerial: number

  clue: Clue | null
  /** Remaining guesses for the active clue (clue count + 1 bonus). */
  guessesLeft: number
  /** Consecutive correct guesses within the current turn. Resets on handover. */
  streak: number

  traps: Trap[]
  /** Bumped every time a Shift fires, so clients can trigger the alert once. */
  shiftCount: number

  remaining: Record<Team, number>
  winner: Team | null
  winReason: WinReason | null

  players: Player[]
  log: LogEntry[]
}

/** What a specific client is allowed to do right now. */
export interface Abilities {
  seesKey: boolean
  canGiveClue: boolean
  canGuess: boolean
  canPass: boolean
  canStart: boolean
  canReset: boolean
}

export interface ActionResult {
  ok: boolean
  error?: string
  /** Transient one-shot effects for the client to animate. */
  fx?: Fx[]
}

export type Fx =
  | { type: 'reveal'; cardId: number; kind: CardKind; correct: boolean }
  /** Location is deliberately absent — only spymasters learn it, via state. */
  | { type: 'shift'; team: Team; trapCount: number }
  | { type: 'assassin'; team: Team; trap: boolean }
  | { type: 'turn'; team: Team }
  | { type: 'win'; team: Team; reason: WinReason }
