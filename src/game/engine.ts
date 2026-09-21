/**
 * Pure game engine for Codenames: Shift.
 *
 * Every function here takes the authoritative `GameState` and mutates it in
 * place, returning an `ActionResult`. The server owns the only real instance;
 * clients receive redacted snapshots (see `redact.ts`). Keeping the rules in
 * one dependency-free module means they can be unit-tested and reasoned about
 * without spinning up a socket.
 */

import type {
  Abilities,
  ActionResult,
  Card,
  CardKind,
  Fx,
  GameState,
  LogEntry,
  NewLogEntry,
  Player,
  Role,
  Team,
  Trap,
  WinReason,
} from './types'
import { WORDS } from './words'

export const GRID_SIZE = 25
/** Cards owned by the team that moves first. */
export const FIRST_TEAM_CARDS = 9
export const SECOND_TEAM_CARDS = 8
export const NEUTRAL_CARDS = 7
export const ASSASSIN_CARDS = 1
/** Correct guesses in a row that arm a Shifting Trap. */
export const SHIFT_THRESHOLD = 2
/** A clue of 0 means "unlimited" in Codenames; we cap it so the UI stays sane. */
export const UNLIMITED_GUESSES = 99
export const MAX_LOG = 200

export const other = (team: Team): Team => (team === 'red' ? 'blue' : 'red')

let idCounter = 0
function uid(prefix: string): string {
  idCounter += 1
  return `${prefix}_${Date.now().toString(36)}_${idCounter.toString(36)}`
}

function shuffle<T>(input: readonly T[], rng: () => number = Math.random): T[] {
  const arr = input.slice()
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

function log(state: GameState, entry: NewLogEntry): void {
  state.log.push({ id: uid('l'), at: Date.now(), ...entry } as LogEntry)
  if (state.log.length > MAX_LOG) state.log.splice(0, state.log.length - MAX_LOG)
}

const fail = (error: string): ActionResult => ({ ok: false, error })

/**
 * يوحّد صور الحروف العربية قبل المقارنة، حتى لا يمرّ دليلٌ مطابقٌ لكلمة على
 * اللوح لمجرد اختلاف الهمزة أو التاء المربوطة أو التشكيل.
 */
export function normalizeWord(input: string): string {
  return input
    .replace(/[ً-ْٰـ]/g, '') // التشكيل والتطويل
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/[ىئ]/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ة/g, 'ه')
    .replace(/\s+/g, '')
    .toUpperCase()
}

// ---------------------------------------------------------------------------
// Construction
// ---------------------------------------------------------------------------

/** Builds the 5x5 grid and its secret key. */
export function buildGrid(startingTeam: Team, rng: () => number = Math.random): Card[] {
  const words = shuffle(WORDS, rng).slice(0, GRID_SIZE)

  const kinds: CardKind[] = [
    ...Array<CardKind>(FIRST_TEAM_CARDS).fill(startingTeam),
    ...Array<CardKind>(SECOND_TEAM_CARDS).fill(other(startingTeam)),
    ...Array<CardKind>(NEUTRAL_CARDS).fill('neutral'),
    ...Array<CardKind>(ASSASSIN_CARDS).fill('assassin'),
  ]
  const shuffledKinds = shuffle(kinds, rng)

  return words.map((word, i) => ({
    id: i,
    word,
    kind: shuffledKinds[i],
    revealed: false,
    revealedBy: null,
  }))
}

export function createRoom(roomId: string): GameState {
  const now = Date.now()
  return {
    roomId,
    createdAt: now,
    updatedAt: now,
    phase: 'lobby',
    cards: [],
    startingTeam: 'red',
    turn: 'red',
    turnSerial: 0,
    clue: null,
    guessesLeft: 0,
    streak: 0,
    traps: [],
    shiftCount: 0,
    remaining: { red: 0, blue: 0 },
    winner: null,
    winReason: null,
    players: [],
    log: [],
  }
}

// ---------------------------------------------------------------------------
// Players & lobby
// ---------------------------------------------------------------------------

export const findPlayer = (state: GameState, playerId: string): Player | undefined =>
  state.players.find((p) => p.id === playerId)

export function joinRoom(state: GameState, playerId: string, name: string): Player {
  let player = findPlayer(state, playerId)
  if (player) {
    player.connected = true
    player.lastSeen = Date.now()
    if (name && name !== player.name) player.name = name
  } else {
    player = {
      id: playerId,
      name: name || 'عميل',
      team: null,
      role: 'operative',
      connected: true,
      // First human through the door runs the room.
      host: state.players.every((p) => !p.host),
      lastSeen: Date.now(),
    }
    state.players.push(player)
    log(state, { type: 'system', text: `انضم ${player.name} إلى الغرفة.` })
  }
  state.updatedAt = Date.now()
  return player
}

export function setConnected(state: GameState, playerId: string, connected: boolean): void {
  const player = findPlayer(state, playerId)
  if (!player) return
  player.connected = connected
  player.lastSeen = Date.now()
  state.updatedAt = Date.now()
  // Never strand a room without a host.
  if (!connected && player.host) {
    const heir = state.players.find((p) => p.id !== playerId && p.connected)
    if (heir) {
      player.host = false
      heir.host = true
    }
  }
}

export function setName(state: GameState, playerId: string, name: string): ActionResult {
  const player = findPlayer(state, playerId)
  if (!player) return fail('أنت لست ضمن هذه الغرفة.')
  const clean = name.trim().slice(0, 18)
  if (!clean) return fail('الاسم لا يمكن أن يكون فارغًا.')
  player.name = clean
  state.updatedAt = Date.now()
  return { ok: true }
}

/** Seat (or unseat, with `team: null`) a player. Locked once the game is live. */
export function setSeat(
  state: GameState,
  playerId: string,
  team: Team | null,
  role: Role,
): ActionResult {
  const player = findPlayer(state, playerId)
  if (!player) return fail('أنت لست ضمن هذه الغرفة.')
  if (state.phase !== 'lobby' && state.phase !== 'ended') {
    return fail('لا يمكن تغيير الفرق بعد بدء المهمة.')
  }
  player.team = team
  player.role = team ? role : 'operative'
  state.updatedAt = Date.now()
  return { ok: true }
}

const canClueFor = (p: Player, team: Team) =>
  p.team === team && (p.role === 'spymaster' || p.role === 'both')
const canGuessFor = (p: Player, team: Team) =>
  p.team === team && (p.role === 'operative' || p.role === 'both')

/** سبب تعذّر بدء المهمة بصيغة مقروءة، أو null إذا كان كل شيء جاهزًا. */
export function startBlocker(state: GameState): string | null {
  for (const team of ['red', 'blue'] as Team[]) {
    const label = team === 'red' ? 'الأحمر' : 'الأزرق'
    const roster = state.players.filter((p) => p.team === team)
    if (roster.length === 0) return `الفريق ${label} يحتاج إلى عميل واحد على الأقل.`
    if (!roster.some((p) => canClueFor(p, team))) {
      return `الفريق ${label} يحتاج إلى قائد تجسس.`
    }
    if (!roster.some((p) => canGuessFor(p, team))) {
      return `الفريق ${label} يحتاج إلى عميل ميداني.`
    }
  }
  return null
}

// ---------------------------------------------------------------------------
// Game lifecycle
// ---------------------------------------------------------------------------

export function startGame(
  state: GameState,
  playerId: string,
  rng: () => number = Math.random,
): ActionResult {
  const player = findPlayer(state, playerId)
  if (!player) return fail('أنت لست ضمن هذه الغرفة.')
  if (!player.host) return fail('المضيف وحده يستطيع بدء المهمة.')
  if (state.phase === 'clue' || state.phase === 'guess') return fail('المهمة جارية بالفعل.')

  const blocker = startBlocker(state)
  if (blocker) return fail(blocker)

  const startingTeam: Team = rng() < 0.5 ? 'red' : 'blue'
  state.cards = buildGrid(startingTeam, rng)
  state.startingTeam = startingTeam
  state.turn = startingTeam
  state.turnSerial = 1
  state.phase = 'clue'
  state.clue = null
  state.guessesLeft = 0
  state.streak = 0
  state.traps = []
  state.shiftCount = 0
  state.remaining = {
    red: state.cards.filter((c) => c.kind === 'red').length,
    blue: state.cards.filter((c) => c.kind === 'blue').length,
  }
  state.winner = null
  state.winReason = null
  state.log = []
  state.updatedAt = Date.now()

  log(state, { type: 'system', text: 'بدأت المهمة — ٢٥ عميلًا في الميدان.' })
  log(state, { type: 'turn', team: startingTeam })

  return { ok: true, fx: [{ type: 'turn', team: startingTeam }] }
}

export function resetToLobby(state: GameState, playerId: string): ActionResult {
  const player = findPlayer(state, playerId)
  if (!player) return fail('أنت لست ضمن هذه الغرفة.')
  if (!player.host) return fail('المضيف وحده يستطيع إعادة ضبط الغرفة.')

  state.phase = 'lobby'
  state.cards = []
  state.clue = null
  state.guessesLeft = 0
  state.streak = 0
  state.traps = []
  state.shiftCount = 0
  state.winner = null
  state.winReason = null
  state.turnSerial = 0
  state.remaining = { red: 0, blue: 0 }
  state.log = []
  state.updatedAt = Date.now()
  log(state, { type: 'system', text: 'أُعيد ضبط الغرفة — اختاروا مقاعدكم.' })
  return { ok: true }
}

// ---------------------------------------------------------------------------
// Turn flow
// ---------------------------------------------------------------------------

/**
 * Hands the turn to the other team and ages the trap pool.
 *
 * Trap lifecycle lives entirely here:
 *   - a trap created on turn T has `liveOnTurn = T + 1`
 *   - on entering turn T+1 it flips to `live`
 *   - on entering turn T+2 it is dropped
 * so a Shift threatens exactly one turn, as specified.
 */
function handover(state: GameState, fx: Fx[]): void {
  state.turn = other(state.turn)
  state.turnSerial += 1
  state.phase = 'clue'
  state.clue = null
  state.guessesLeft = 0
  state.streak = 0

  state.traps = state.traps.filter((t) => t.liveOnTurn >= state.turnSerial)
  for (const trap of state.traps) trap.live = trap.liveOnTurn === state.turnSerial

  log(state, { type: 'turn', team: state.turn })
  fx.push({ type: 'turn', team: state.turn })
}

function endGame(state: GameState, winner: Team, reason: WinReason, fx: Fx[]): void {
  state.phase = 'ended'
  state.winner = winner
  state.winReason = reason
  state.clue = null
  state.guessesLeft = 0
  state.streak = 0
  for (const trap of state.traps) trap.live = false
  log(state, { type: 'end', team: winner, reason })
  fx.push({ type: 'win', team: winner, reason })
}

/**
 * Arms a Shifting Trap on a random unrevealed, un-trapped neutral card.
 * No-op when the board has no eligible neutral left.
 */
function triggerShift(state: GameState, by: Team, fx: Fx[], rng: () => number): void {
  const taken = new Set(state.traps.map((t) => t.cardId))
  const candidates = state.cards.filter(
    (c) => !c.revealed && c.kind === 'neutral' && !taken.has(c.id),
  )
  if (candidates.length === 0) return

  const card = candidates[Math.floor(rng() * candidates.length)]
  const trap: Trap = {
    id: uid('t'),
    cardId: card.id,
    createdBy: by,
    liveOnTurn: state.turnSerial + 1,
    live: false,
  }
  state.traps.push(trap)
  state.shiftCount += 1

  log(state, { type: 'shift', team: by, word: card.word })
  fx.push({ type: 'shift', team: by, trapCount: state.traps.length })
}

export function giveClue(
  state: GameState,
  playerId: string,
  rawWord: string,
  rawCount: number,
): ActionResult {
  const player = findPlayer(state, playerId)
  if (!player) return fail('أنت لست ضمن هذه الغرفة.')
  if (state.phase !== 'clue') return fail('لا يمكن إرسال دليل في هذه اللحظة.')
  if (!canClueFor(player, state.turn)) return fail('قائد التجسس صاحب الدور وحده يرسل الدليل.')

  const word = rawWord.trim()
  if (!word) return fail('لا يمكن إرسال دليل فارغ.')
  if (/\s/.test(word)) return fail('الدليل يجب أن يكون كلمة واحدة.')
  if (word.length > 24) return fail('الدليل طويل جدًا.')
  if (!/^[؀-ۿA-Za-z0-9'’-]+$/.test(word)) {
    return fail('الدليل يحتوي على رموز غير مسموح بها.')
  }

  // القاعدة الكلاسيكية: لا يجوز ذكر كلمة ظاهرة على اللوح.
  const normalized = normalizeWord(word)
  const onBoard = state.cards.some(
    (c) => !c.revealed && normalizeWord(c.word) === normalized,
  )
  if (onBoard) return fail('هذه الكلمة موجودة على اللوح.')

  const count = Math.floor(rawCount)
  if (!Number.isFinite(count) || count < 0 || count > 9) {
    return fail('العدد يجب أن يكون بين ٠ و ٩.')
  }

  state.clue = { word, count, team: state.turn, by: player.name, at: Date.now() }
  state.guessesLeft = count === 0 ? UNLIMITED_GUESSES : count + 1
  state.streak = 0
  state.phase = 'guess'
  state.updatedAt = Date.now()

  log(state, { type: 'clue', team: state.turn, by: player.name, word, count })
  return { ok: true }
}

export function makeGuess(
  state: GameState,
  playerId: string,
  cardId: number,
  rng: () => number = Math.random,
): ActionResult {
  const player = findPlayer(state, playerId)
  if (!player) return fail('أنت لست ضمن هذه الغرفة.')
  if (state.phase !== 'guess') return fail('انتظر وصول الدليل أولًا.')
  if (!canGuessFor(player, state.turn)) return fail('ليس دور فريقك في التخمين.')

  const card = state.cards.find((c) => c.id === cardId)
  if (!card) return fail('بطاقة غير معروفة.')
  if (card.revealed) return fail('هذه البطاقة مكشوفة مسبقًا.')

  const team = state.turn
  const fx: Fx[] = []
  const liveTrap = state.traps.find((t) => t.cardId === card.id && t.live)

  card.revealed = true
  card.revealedBy = team
  state.guessesLeft = Math.max(0, state.guessesLeft - 1)
  state.updatedAt = Date.now()

  // A trapped neutral detonates as an assassin. Checked before `kind` so the
  // trap always wins over the card's underlying identity.
  if (liveTrap) {
    state.traps = state.traps.filter((t) => t.id !== liveTrap.id)
    log(state, { type: 'guess', team, by: player.name, word: card.word, outcome: 'trap' })
    fx.push({ type: 'reveal', cardId: card.id, kind: 'assassin', correct: false })
    fx.push({ type: 'assassin', team, trap: true })
    endGame(state, other(team), 'trap', fx)
    return { ok: true, fx }
  }

  // The card is being consumed, so any trap merely *armed* on it is defused.
  state.traps = state.traps.filter((t) => t.cardId !== card.id)

  const kind = card.kind as CardKind
  fx.push({ type: 'reveal', cardId: card.id, kind, correct: kind === team })

  if (kind === 'assassin') {
    log(state, { type: 'guess', team, by: player.name, word: card.word, outcome: 'assassin' })
    fx.push({ type: 'assassin', team, trap: false })
    endGame(state, other(team), 'assassin', fx)
    return { ok: true, fx }
  }

  if (kind === 'red' || kind === 'blue') {
    state.remaining[kind] = Math.max(0, state.remaining[kind] - 1)
  }

  if (kind === team) {
    state.streak += 1
    log(state, { type: 'guess', team, by: player.name, word: card.word, outcome: 'correct' })

    if (state.remaining[team] === 0) {
      endGame(state, team, 'words', fx)
      return { ok: true, fx }
    }

    // THE TWIST: every 2nd correct guess in a single turn bends the board.
    if (state.streak % SHIFT_THRESHOLD === 0) {
      triggerShift(state, team, fx, rng)
    }

    if (state.guessesLeft <= 0) handover(state, fx)
    return { ok: true, fx }
  }

  // Wrong card: either the opponent's agent or a bystander. Turn is over.
  const opponent = other(team)
  if (kind === opponent) {
    log(state, { type: 'guess', team, by: player.name, word: card.word, outcome: 'opponent' })
    if (state.remaining[opponent] === 0) {
      endGame(state, opponent, 'words', fx)
      return { ok: true, fx }
    }
  } else {
    log(state, { type: 'guess', team, by: player.name, word: card.word, outcome: 'neutral' })
  }

  handover(state, fx)
  return { ok: true, fx }
}

export function passTurn(state: GameState, playerId: string): ActionResult {
  const player = findPlayer(state, playerId)
  if (!player) return fail('أنت لست ضمن هذه الغرفة.')
  if (state.phase !== 'guess') return fail('لا يوجد دور لإنهائه.')
  if (!canGuessFor(player, state.turn)) return fail('ليس دور فريقك الآن.')

  const fx: Fx[] = []
  log(state, { type: 'pass', team: state.turn, by: player.name })
  handover(state, fx)
  state.updatedAt = Date.now()
  return { ok: true, fx }
}

// ---------------------------------------------------------------------------
// Per-viewer capabilities
// ---------------------------------------------------------------------------

export function abilitiesFor(state: GameState, playerId: string): Abilities {
  const player = findPlayer(state, playerId)
  if (!player) {
    return {
      seesKey: false,
      canGiveClue: false,
      canGuess: false,
      canPass: false,
      canStart: false,
      canReset: false,
    }
  }
  const live = state.phase === 'clue' || state.phase === 'guess'
  const seesKey = player.role === 'spymaster' || player.role === 'both'
  return {
    seesKey,
    canGiveClue: live && state.phase === 'clue' && canClueFor(player, state.turn),
    canGuess: live && state.phase === 'guess' && canGuessFor(player, state.turn),
    canPass: live && state.phase === 'guess' && canGuessFor(player, state.turn),
    canStart: player.host && !live && startBlocker(state) === null,
    canReset: player.host && state.phase !== 'lobby',
  }
}
