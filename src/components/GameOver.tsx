'use client'

import { useEffect, useState } from 'react'

import type { ClientState } from '@/game/redact'
import type { Team, WinReason } from '@/game/types'

const REASON: Record<WinReason, string> = {
  words: 'اكتملت كل الاتصالات.',
  assassin: 'الخصم لمس القاتل.',
  trap: 'انفجر فخ متحوّل.',
  forfeit: 'انسحب الخصم.',
}

const TEAM_LABEL: Record<Team, string> = { red: 'الأحمر', blue: 'الأزرق' }

export function GameOver({
  state,
  onPlayAgain,
  onBackToLobby,
}: {
  state: ClientState
  /** جولة جديدة فورًا مع الإبقاء على المقاعد الحالية. */
  onPlayAgain: () => void
  onBackToLobby: () => void
}) {
  const [dismissed, setDismissed] = useState(false)

  // نعيد تفعيل النافذة استعدادًا للجولة القادمة.
  useEffect(() => {
    if (state.phase !== 'ended') setDismissed(false)
  }, [state.phase])

  if (state.phase !== 'ended' || !state.winner || dismissed) return null

  const red = state.winner === 'red'
  const reason = state.winReason ? REASON[state.winReason] : ''
  const trap = state.winReason === 'trap'

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-5">
      <div
        aria-hidden
        onClick={() => setDismissed(true)}
        className="absolute inset-0 bg-canvas/70 backdrop-blur-md"
      />

      <div
        role="dialog"
        aria-modal="true"
        className={`glass-deep animate-rise relative w-full max-w-sm rounded-3xl p-7 text-center ${
          red ? 'glow-flame' : 'glow-aqua'
        }`}
      >
        <p className="text-[12px] font-bold text-muted">انتهت المهمة</p>

        <h2
          className={`mt-3 font-display text-4xl font-extrabold leading-tight ${
            red ? 'text-flame text-glow-flame' : 'text-aqua text-glow-aqua'
          }`}
        >
          فاز الفريق {TEAM_LABEL[state.winner]}
        </h2>

        <p className="mt-3 text-sm font-medium text-ink-soft">{reason}</p>

        {trap && (
          <p className="mt-3 rounded-xl border border-magic/35 bg-magic-mist px-3 py-2 text-[13px] font-bold text-magic">
            ☠ تحوّل اللوح… ومشى أحدهم إلى الفخ مباشرة.
          </p>
        )}

        <div className="mt-6 flex flex-col gap-2">
          {state.abilities.canStart && (
            <button
              onClick={onPlayAgain}
              className="glow-magic w-full rounded-xl bg-gradient-to-l from-magic via-magic-soft to-aqua px-5 py-3 font-display text-sm font-extrabold text-white transition hover:brightness-110 active:scale-[0.98]"
            >
              جولة جديدة — بالمقاعد نفسها
            </button>
          )}
          {state.abilities.canReset && (
            <button
              onClick={onBackToLobby}
              className="w-full rounded-xl border border-white bg-white/80 px-5 py-2.5 text-[13.5px] font-bold text-ink transition hover:bg-white"
            >
              العودة إلى الردهة
            </button>
          )}
          {!state.abilities.canStart && !state.abilities.canReset && (
            <p className="text-[13px] text-muted">في انتظار المضيف…</p>
          )}
          <button
            onClick={() => setDismissed(true)}
            className="w-full rounded-xl px-5 py-2 text-[13.5px] font-bold text-muted transition hover:text-ink"
          >
            استعراض اللوح
          </button>
        </div>
      </div>
    </div>
  )
}
