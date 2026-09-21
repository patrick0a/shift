/**
 * Deterministic rules tests. Run with `npm test`.
 *
 * No framework on purpose — the engine is pure, so a seeded RNG plus asserts
 * covers the rules (and the Shift state machine) without adding a dependency.
 */

import assert from 'node:assert/strict'

import {
  ASSASSIN_CARDS,
  FIRST_TEAM_CARDS,
  GRID_SIZE,
  NEUTRAL_CARDS,
  SECOND_TEAM_CARDS,
  buildGrid,
  createRoom,
  giveClue,
  joinRoom,
  makeGuess,
  normalizeWord,
  other,
  passTurn,
  setSeat,
  startGame,
} from '../src/game/engine'
import { HIDDEN_CARD, viewFor } from '../src/game/redact'
import type { CardKind, GameState, Team } from '../src/game/types'

/** mulberry32 — small, seedable, good enough for tests. */
function rngFrom(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

let passed = 0
function test(name: string, fn: () => void) {
  try {
    fn()
    passed += 1
    console.log(`  ok  ${name}`)
  } catch (err) {
    console.error(`  FAIL  ${name}`)
    console.error(err)
    process.exitCode = 1
  }
}

/** A room with a 1v1 table seated and the game started. */
function seatedGame(seed: number): GameState {
  const state = createRoom('TEST01')
  joinRoom(state, 'p-red', 'Red One')
  joinRoom(state, 'p-blue', 'Blue One')
  assert.equal(setSeat(state, 'p-red', 'red', 'both').ok, true)
  assert.equal(setSeat(state, 'p-blue', 'blue', 'both').ok, true)
  assert.equal(startGame(state, 'p-red', rngFrom(seed)).ok, true)
  return state
}

const playerOf = (team: Team) => (team === 'red' ? 'p-red' : 'p-blue')
const unrevealedOf = (state: GameState, kind: CardKind) =>
  state.cards.filter((c) => !c.revealed && c.kind === kind)

console.log('\nCodenames: Shift — engine\n')

// ---------------------------------------------------------------------------

test('grid has the classic 9 / 8 / 7 / 1 composition', () => {
  const cards = buildGrid('red', rngFrom(1))
  assert.equal(cards.length, GRID_SIZE)
  assert.equal(cards.filter((c) => c.kind === 'red').length, FIRST_TEAM_CARDS)
  assert.equal(cards.filter((c) => c.kind === 'blue').length, SECOND_TEAM_CARDS)
  assert.equal(cards.filter((c) => c.kind === 'neutral').length, NEUTRAL_CARDS)
  assert.equal(cards.filter((c) => c.kind === 'assassin').length, ASSASSIN_CARDS)
  assert.equal(new Set(cards.map((c) => c.word)).size, GRID_SIZE)
})

test('the starting team owns the extra card', () => {
  const state = seatedGame(7)
  assert.equal(state.remaining[state.startingTeam], FIRST_TEAM_CARDS)
  assert.equal(state.remaining[other(state.startingTeam)], SECOND_TEAM_CARDS)
  assert.equal(state.turn, state.startingTeam)
  assert.equal(state.phase, 'clue')
})

test('only the active spymaster may clue, and not with a board word', () => {
  const state = seatedGame(11)
  const idle = playerOf(other(state.turn))
  assert.equal(giveClue(state, idle, 'ANYTHING', 2).ok, false)

  const boardWord = state.cards[0].word
  assert.equal(giveClue(state, playerOf(state.turn), boardWord, 2).ok, false)
  assert.equal(giveClue(state, playerOf(state.turn), 'TWO WORDS', 2).ok, false)

  assert.equal(giveClue(state, playerOf(state.turn), 'إشعاع', 2).ok, true)
  assert.equal(state.phase, 'guess')
  assert.equal(state.clue?.word, 'إشعاع')
  assert.equal(state.guessesLeft, 3) // count + 1 bonus
})

test('a clue matching a board word is rejected despite hamza/ta-marbuta spelling', () => {
  const state = seatedGame(11)
  const giver = playerOf(state.turn)
  const boardWord = state.cards.find((c) => /[أإآةى]/.test(c.word))?.word

  // Rewrite the word the way a player might casually type it.
  const loose = (boardWord ?? state.cards[0].word)
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')

  assert.equal(normalizeWord(loose), normalizeWord(boardWord ?? state.cards[0].word))
  assert.equal(giveClue(state, giver, loose, 2).ok, false)
})

test('a correct guess keeps the turn; a bystander ends it', () => {
  const state = seatedGame(3)
  const team = state.turn
  giveClue(state, playerOf(team), 'alpha', 3)

  makeGuess(state, playerOf(team), unrevealedOf(state, team)[0].id, rngFrom(5))
  assert.equal(state.turn, team, 'turn should still belong to the guessing team')
  assert.equal(state.remaining[team], FIRST_TEAM_CARDS - 1)

  makeGuess(state, playerOf(team), unrevealedOf(state, 'neutral')[0].id, rngFrom(5))
  assert.equal(state.turn, other(team), 'bystander must hand over the turn')
  assert.equal(state.phase, 'clue')
})

test('SHIFT: two correct in a row arms exactly one trap on a neutral', () => {
  const state = seatedGame(21)
  const team = state.turn
  giveClue(state, playerOf(team), 'alpha', 3)

  const own = unrevealedOf(state, team)
  makeGuess(state, playerOf(team), own[0].id, rngFrom(9))
  assert.equal(state.traps.length, 0, 'one correct guess must not shift')
  assert.equal(state.streak, 1)

  makeGuess(state, playerOf(team), own[1].id, rngFrom(9))
  assert.equal(state.streak, 2)
  assert.equal(state.traps.length, 1, 'second correct guess must shift')
  assert.equal(state.shiftCount, 1)

  const trap = state.traps[0]
  const card = state.cards.find((c) => c.id === trap.cardId)!
  assert.equal(card.kind, 'neutral', 'traps only land on bystanders')
  assert.equal(card.revealed, false)
  assert.equal(trap.live, false, 'not lethal during the turn that created it')
  assert.equal(trap.liveOnTurn, state.turnSerial + 1)
})

test('SHIFT: the trap is lethal for exactly one turn, then expires', () => {
  const state = seatedGame(21)
  const team = state.turn
  giveClue(state, playerOf(team), 'alpha', 3)
  const own = unrevealedOf(state, team)
  makeGuess(state, playerOf(team), own[0].id, rngFrom(9))
  makeGuess(state, playerOf(team), own[1].id, rngFrom(9))
  const trapCardId = state.traps[0].cardId

  // Hand over: the trap goes live for the opponent.
  makeGuess(state, playerOf(team), unrevealedOf(state, 'neutral').find((c) => c.id !== trapCardId)!.id, rngFrom(9))
  assert.equal(state.turn, other(team))
  assert.equal(state.traps.length, 1)
  assert.equal(state.traps[0].live, true, 'trap must be live on the next turn')

  // Opponent plays it safe and passes; the trap must now be gone.
  giveClue(state, playerOf(state.turn), 'bravo', 1)
  passTurn(state, playerOf(state.turn))
  assert.equal(state.traps.length, 0, 'trap must expire after one turn')
})

test('SHIFT: stepping on a live trap loses the game instantly', () => {
  const state = seatedGame(21)
  const team = state.turn
  giveClue(state, playerOf(team), 'alpha', 3)
  const own = unrevealedOf(state, team)
  makeGuess(state, playerOf(team), own[0].id, rngFrom(9))
  makeGuess(state, playerOf(team), own[1].id, rngFrom(9))
  const trapCardId = state.traps[0].cardId

  makeGuess(state, playerOf(team), unrevealedOf(state, 'neutral').find((c) => c.id !== trapCardId)!.id, rngFrom(9))
  const victim = state.turn
  assert.equal(victim, other(team))

  giveClue(state, playerOf(victim), 'bravo', 2)
  makeGuess(state, playerOf(victim), trapCardId, rngFrom(9))

  assert.equal(state.phase, 'ended')
  assert.equal(state.winner, other(victim))
  assert.equal(state.winReason, 'trap')
  assert.equal(state.log.at(-1)?.type, 'end')
})

test('the assassin ends the game for whoever touches it', () => {
  const state = seatedGame(33)
  const team = state.turn
  giveClue(state, playerOf(team), 'alpha', 2)
  makeGuess(state, playerOf(team), unrevealedOf(state, 'assassin')[0].id, rngFrom(1))
  assert.equal(state.phase, 'ended')
  assert.equal(state.winner, other(team))
  assert.equal(state.winReason, 'assassin')
})

test('revealing every one of your words wins, even mid-streak', () => {
  const state = seatedGame(44)
  let guard = 0
  while (state.phase !== 'ended' && guard < 60) {
    guard += 1
    const team = state.turn
    if (state.phase === 'clue') {
      giveClue(state, playerOf(team), `clue${guard}`, 9)
      continue
    }
    const own = unrevealedOf(state, team)
    // Sidestep any live trap so the only way this loop ends is a win by words.
    const liveTraps = new Set(state.traps.filter((t) => t.live).map((t) => t.cardId))
    const pick = own.find((c) => !liveTraps.has(c.id))
    assert.ok(pick, 'team should always have one of its own words left')
    makeGuess(state, playerOf(team), pick.id, rngFrom(guard))
  }
  assert.equal(state.phase, 'ended')
  assert.equal(state.winReason, 'words')
  assert.equal(state.remaining[state.winner!], 0)
})

test('guessing the opponent’s word scores for them and can lose you the game', () => {
  const state = seatedGame(8)
  const team = state.turn
  const foe = other(team)
  // Strip the opponent down to a single card, then hand it to them.
  const foeCards = unrevealedOf(state, foe)
  for (const c of foeCards.slice(1)) {
    c.revealed = true
    c.revealedBy = team
    state.remaining[foe] -= 1
  }
  assert.equal(state.remaining[foe], 1)

  giveClue(state, playerOf(team), 'alpha', 2)
  makeGuess(state, playerOf(team), foeCards[0].id, rngFrom(2))
  assert.equal(state.phase, 'ended')
  assert.equal(state.winner, foe)
  assert.equal(state.winReason, 'words')
})

// --- Redaction -------------------------------------------------------------

test('operatives never receive the key grid or trap locations', () => {
  const state = createRoom('TEST02')
  joinRoom(state, 'p-sm', 'Spy')
  joinRoom(state, 'p-op', 'Op')
  joinRoom(state, 'p-foe', 'Foe')
  setSeat(state, 'p-sm', 'red', 'spymaster')
  setSeat(state, 'p-op', 'red', 'operative')
  setSeat(state, 'p-foe', 'blue', 'both')
  startGame(state, 'p-sm', rngFrom(12))

  // Force a trap onto the board so redaction has something to hide.
  state.traps.push({
    id: 't1',
    cardId: unrevealedOf(state, 'neutral')[0].id,
    createdBy: 'red',
    liveOnTurn: state.turnSerial,
    live: true,
  })
  state.log.push({
    id: 'l1',
    at: Date.now(),
    type: 'shift',
    team: 'red',
    word: 'SECRET',
  })

  const opView = viewFor(state, 'p-op')
  assert.ok(
    opView.cards.every((c) => c.revealed || c.kind === null),
    'operative must not see any unrevealed card kind',
  )
  assert.ok(
    opView.traps.every((t) => t.cardId === HIDDEN_CARD),
    'operative must not see trap locations',
  )
  assert.equal(opView.liveTrapCount, 1, 'but must know a trap is live')
  const opShift = opView.log.find((e) => e.type === 'shift')
  assert.equal(opShift?.type === 'shift' ? opShift.word : 'x', null)
  assert.equal(opView.abilities.seesKey, false)

  const smView = viewFor(state, 'p-sm')
  assert.ok(smView.cards.every((c) => c.kind !== null), 'spymaster sees the full key')
  assert.equal(smView.traps[0].cardId, state.traps[0].cardId)
  assert.equal(smView.abilities.seesKey, true)
  assert.equal(smView.abilities.canGuess, false, 'a pure spymaster cannot guess')

  // Everything opens up once the game is over.
  state.phase = 'ended'
  state.winner = 'red'
  const endView = viewFor(state, 'p-op')
  assert.ok(endView.cards.every((c) => c.kind !== null), 'full reveal at game end')
})

test('a solo player can both clue and guess for their team', () => {
  const state = seatedGame(55)
  const team = state.turn
  const view = viewFor(state, playerOf(team))
  assert.equal(view.abilities.seesKey, true)
  assert.equal(view.abilities.canGiveClue, true)
  giveClue(state, playerOf(team), 'alpha', 1)
  assert.equal(viewFor(state, playerOf(team)).abilities.canGuess, true)
})

test('the lobby refuses to start without a clue-giver and a guesser per team', () => {
  const state = createRoom('TEST03')
  joinRoom(state, 'a', 'A')
  joinRoom(state, 'b', 'B')
  assert.equal(startGame(state, 'a').ok, false, 'no teams')
  setSeat(state, 'a', 'red', 'spymaster')
  assert.equal(startGame(state, 'a').ok, false, 'blue empty')
  setSeat(state, 'b', 'blue', 'both')
  assert.equal(startGame(state, 'a').ok, false, 'red has no operative')
  setSeat(state, 'a', 'red', 'both')
  assert.equal(startGame(state, 'a').ok, true)
  assert.equal(startGame(state, 'b').ok, false, 'only the host may start')
})

console.log(`\n${passed} passed${process.exitCode ? ' (with failures)' : ''}\n`)
