'use client'

import { useEffect, useState } from 'react'

import { Board } from './Board'
import { ClueBar } from './ClueBar'
import { GameLog } from './GameLog'
import { GameOver } from './GameOver'
import { Lobby } from './Lobby'
import { ShiftAlert } from './ShiftAlert'
import { Squads } from './Squads'
import { Toasts } from './Toasts'
import { TopBar } from './TopBar'
import { useGame } from '@/lib/useGame'

function Connecting({ roomId }: { roomId: string }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6">
      <div className="relative flex h-14 w-14 items-center justify-center">
        <span className="absolute h-14 w-14 animate-ping rounded-full bg-magic/25" />
        <span className="h-3 w-3 rounded-full bg-magic" />
      </div>
      <p className="font-display text-[15px] font-bold text-ink-soft">جارٍ فتح القناة…</p>
      <p dir="ltr" className="font-mono text-xs tracking-[0.2em] text-muted">
        {roomId}
      </p>
    </main>
  )
}

export function RoomClient({ roomId }: { roomId: string }) {
  const game = useGame(roomId)
  const { state, fx, fxSeq } = game
  const [tab, setTab] = useState<'squads' | 'log'>('squads')
  const [jolt, setJolt] = useState(false)

  // An assassin (real or trapped) shakes the whole room.
  useEffect(() => {
    if (!fx.some((f) => f.type === 'assassin')) return
    setJolt(true)
    const timer = window.setTimeout(() => setJolt(false), 700)
    return () => window.clearTimeout(timer)
  }, [fx, fxSeq])

  if (!state) return <Connecting roomId={roomId} />

  const showBoard = state.phase !== 'lobby'

  return (
    <>
      <main
        className={`mx-auto flex min-h-dvh w-full max-w-7xl flex-col gap-2.5 p-2 sm:gap-3 sm:p-4 ${
          jolt ? 'fx-shake' : ''
        }`}
      >
        <TopBar state={state} status={game.status} onReset={game.reset} />

        <div className="grid min-h-0 flex-1 gap-2.5 sm:gap-3 lg:grid-cols-[minmax(0,1fr)_336px]">
          {/* ---- Main column: board + action bar ---- */}
          <section className="flex min-h-0 flex-col gap-2.5 sm:gap-3">
            {showBoard ? (
              <Board state={state} onGuess={game.guess} />
            ) : (
              <Lobby state={state} onRename={game.rename} onStart={game.start} />
            )}
            <ClueBar state={state} onClue={game.clue} onPass={game.pass} />
          </section>

          {/* ---- Desktop sidebar ---- */}
          <aside className="hidden min-h-0 flex-col gap-2.5 lg:flex">
            <Squads state={state} onSeat={game.takeSeat} />
            <GameLog state={state} />
          </aside>

          {/* ---- Mobile / tablet: same panels behind a segmented control ---- */}
          <section className="flex min-h-0 flex-col gap-2.5 lg:hidden">
            <div className="glass flex gap-1 rounded-xl p-1">
              {(['squads', 'log'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={[
                    'flex-1 rounded-lg px-3 py-2 text-[13px] font-bold transition',
                    tab === t
                      ? 'bg-white text-ink shadow-[0_6px_16px_-12px_rgba(41,32,96,0.8)]'
                      : 'text-muted hover:text-ink',
                  ].join(' ')}
                >
                  {t === 'squads' ? 'الفرق' : 'سجل الميدان'}
                </button>
              ))}
            </div>
            {tab === 'squads' ? (
              <Squads state={state} onSeat={game.takeSeat} />
            ) : (
              <div className="flex h-[min(46vh,22rem)] flex-col">
                <GameLog state={state} />
              </div>
            )}
          </section>
        </div>
      </main>

      <ShiftAlert fx={fx} fxSeq={fxSeq} />
      <GameOver state={state} onPlayAgain={game.start} onBackToLobby={game.reset} />
      <Toasts toasts={game.toasts} onDismiss={game.dismissToast} />
    </>
  )
}
