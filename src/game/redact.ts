/**
 * Server → client redaction.
 *
 * The authoritative state holds the full key grid and exact trap locations.
 * Operatives must never receive either, or the game is trivially cheatable by
 * opening devtools. Everything an operative isn't entitled to is stripped
 * *before* serialisation, not merely hidden in CSS.
 */

import { abilitiesFor, findPlayer } from './engine'
import type { Abilities, Card, GameState, LogEntry, Trap } from './types'

/** Sentinel used for a trap whose location the viewer may not know. */
export const HIDDEN_CARD = -1

export interface ClientState extends GameState {
  /** The viewing player's id, or null for an unseated observer. */
  youId: string | null
  abilities: Abilities
  /** Traps lethal *this* turn — count is public, location is not. */
  liveTrapCount: number
  /** Traps armed but not yet lethal. */
  armedTrapCount: number
}

function redactCards(cards: Card[], seesKey: boolean, gameOver: boolean): Card[] {
  if (seesKey || gameOver) return cards
  return cards.map((c) => (c.revealed ? c : { ...c, kind: null }))
}

function redactTraps(traps: Trap[], seesKey: boolean, gameOver: boolean): Trap[] {
  if (seesKey || gameOver) return traps
  return traps.map((t) => ({ ...t, cardId: HIDDEN_CARD }))
}

function redactLog(log: LogEntry[], seesKey: boolean, gameOver: boolean): LogEntry[] {
  if (seesKey || gameOver) return log
  return log.map((e) => (e.type === 'shift' ? { ...e, word: null } : e))
}

export function viewFor(state: GameState, playerId: string | null): ClientState {
  const abilities = abilitiesFor(state, playerId ?? '')
  const gameOver = state.phase === 'ended'
  const seesKey = abilities.seesKey

  return {
    ...state,
    cards: redactCards(state.cards, seesKey, gameOver),
    traps: redactTraps(state.traps, seesKey, gameOver),
    log: redactLog(state.log, seesKey, gameOver),
    youId: playerId && findPlayer(state, playerId) ? playerId : null,
    abilities,
    liveTrapCount: state.traps.filter((t) => t.live).length,
    armedTrapCount: state.traps.filter((t) => !t.live).length,
  }
}
