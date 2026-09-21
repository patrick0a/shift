/**
 * End-to-end realtime check against a running server.
 *
 *   npm start            (in one terminal)
 *   npm run test:rt      (in another)
 *
 * Drives two real Socket.IO clients through a full turn and asserts that the
 * bytes an operative receives genuinely do not contain the key grid.
 */

import assert from 'node:assert/strict'
import { io, type Socket } from 'socket.io-client'

import type { ClientState } from '../src/game/redact'
import type { Role, Team } from '../src/game/types'

const URL = process.env.TEST_URL ?? 'http://localhost:3000'
const ROOM = `E2E${Math.floor(Math.random() * 900 + 100)}`

type C = Socket & { latest?: ClientState }

function connect(): Promise<C> {
  return new Promise((resolve, reject) => {
    const socket = io(URL, {
      path: '/api/realtime',
      transports: ['websocket'],
      timeout: 8000,
    }) as C
    socket.on('state', (s: ClientState) => {
      socket.latest = s
    })
    socket.on('connect', () => resolve(socket))
    socket.on('connect_error', reject)
  })
}

function send(socket: C, event: string, payload: unknown): Promise<{ ok: boolean; error?: string }> {
  return new Promise((resolve) => socket.emit(event, payload, resolve))
}

/** Waits for the next state push that satisfies `pred`. */
function until(socket: C, pred: (s: ClientState) => boolean, label: string): Promise<ClientState> {
  if (socket.latest && pred(socket.latest)) return Promise.resolve(socket.latest)
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timed out waiting for ${label}`)), 6000)
    const onState = (s: ClientState) => {
      if (!pred(s)) return
      clearTimeout(timer)
      socket.off('state', onState)
      resolve(s)
    }
    socket.on('state', onState)
  })
}

async function main() {
  console.log(`\nRealtime E2E → ${URL}  (room ${ROOM})\n`)

  const spymaster = await connect()
  const operative = await connect()
  const foe = await connect()

  const join = (s: C, id: string, name: string) =>
    send(s, 'room:join', { roomId: ROOM, playerId: id, name })

  assert.deepEqual(await join(spymaster, 'e2e-sm', 'Spy'), { ok: true })
  assert.deepEqual(await join(operative, 'e2e-op', 'Op'), { ok: true })
  assert.deepEqual(await join(foe, 'e2e-foe', 'Foe'), { ok: true })
  console.log('  ok  three clients joined the same room')

  const seat = (s: C, team: Team, role: Role) => send(s, 'player:seat', { team, role })
  await seat(spymaster, 'red', 'spymaster')
  await seat(operative, 'red', 'operative')
  await seat(foe, 'blue', 'both')

  // Everyone should converge on the same roster.
  await until(operative, (s) => s.players.length === 3, 'roster sync')
  console.log('  ok  seat changes propagate to every client')

  const started = await send(spymaster, 'game:start', {})
  assert.equal(started.ok, true, started.error)

  const smState = await until(spymaster, (s) => s.phase === 'clue', 'spymaster board')
  const opState = await until(operative, (s) => s.phase === 'clue', 'operative board')

  assert.equal(smState.cards.length, 25)
  assert.ok(smState.cards.every((c) => c.kind !== null), 'spymaster must receive the key')
  assert.ok(
    opState.cards.every((c) => c.kind === null),
    'operative payload must not contain any card kind',
  )
  console.log('  ok  the key grid is withheld from the operative over the wire')

  // Whoever moves first, drive their side.
  const first = smState.turn
  if (first === 'blue') {
    const r = await send(foe, 'game:clue', { word: 'VECTOR', count: 2 })
    assert.equal(r.ok, true, r.error)
    const foeState = await until(foe, (s) => s.phase === 'guess', 'blue guessing')
    const own = foeState.cards.filter((c) => !c.revealed && c.kind === 'blue')
    await send(foe, 'game:guess', { cardId: own[0].id })
    await send(foe, 'game:guess', { cardId: own[1].id })
    const after = await until(foe, (s) => s.shiftCount > 0, 'shift fired')
    assert.equal(after.traps.length, 1)
    console.log('  ok  two correct guesses fired a Shift, synced to all clients')

    const opAfter = await until(operative, (s) => s.shiftCount > 0, 'operative sees shift')
    assert.equal(opAfter.traps[0].cardId, -1, 'trap location hidden from operative')
    assert.equal(opAfter.armedTrapCount + opAfter.liveTrapCount, 1)
    console.log('  ok  the Shift is announced to operatives without its location')
  } else {
    const r = await send(spymaster, 'game:clue', { word: 'VECTOR', count: 2 })
    assert.equal(r.ok, true, r.error)

    const smGuessing = await until(spymaster, (s) => s.phase === 'guess', 'red guessing')
    const own = smGuessing.cards.filter((c) => !c.revealed && c.kind === 'red')

    // The spymaster knows the answers but is not allowed to click them.
    const cheat = await send(spymaster, 'game:guess', { cardId: own[0].id })
    assert.equal(cheat.ok, false, 'spymaster must not be able to guess')
    console.log('  ok  server rejected a guess from the spymaster')

    await send(operative, 'game:guess', { cardId: own[0].id })
    await send(operative, 'game:guess', { cardId: own[1].id })

    const after = await until(spymaster, (s) => s.shiftCount > 0, 'shift fired')
    assert.equal(after.traps.length, 1)
    assert.notEqual(after.traps[0].cardId, -1, 'spymaster sees the trap location')
    console.log('  ok  two correct guesses fired a Shift, synced to all clients')

    const opAfter = await until(operative, (s) => s.shiftCount > 0, 'operative sees shift')
    assert.equal(opAfter.traps[0].cardId, -1, 'trap location hidden from operative')
    assert.equal(opAfter.armedTrapCount + opAfter.liveTrapCount, 1)
    console.log('  ok  the Shift is announced to operatives without its location')
  }

  // Reconnect: dropping and rejoining must restore the same seat.
  operative.disconnect()
  const rejoined = await connect()
  await join(rejoined, 'e2e-op', 'Op')
  const restored = await until(rejoined, (s) => s.youId === 'e2e-op', 'reconnect')
  const me = restored.players.find((p) => p.id === 'e2e-op')
  assert.equal(me?.team, 'red')
  assert.equal(me?.role, 'operative')
  console.log('  ok  reconnecting restores the player’s seat')

  for (const s of [spymaster, foe, rejoined]) s.disconnect()
  console.log('\nRealtime E2E passed\n')
}

main().catch((err) => {
  console.error('\nRealtime E2E FAILED\n', err)
  process.exit(1)
})
