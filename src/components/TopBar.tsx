'use client'

import Link from 'next/link'
import { useState } from 'react'

import type { ClientState } from '@/game/redact'
import type { ConnectionStatus } from '@/lib/useGame'

const STATUS_STYLE: Record<ConnectionStatus, { dot: string; label: string }> = {
  connecting: { dot: 'bg-gold animate-pulse', label: 'جارٍ الاتصال' },
  live: { dot: 'bg-emerald-500', label: 'متصل' },
  reconnecting: { dot: 'bg-gold animate-pulse', label: 'إعادة الاتصال' },
  offline: { dot: 'bg-flame', label: 'غير متصل' },
}

function ScoreChip({
  team,
  remaining,
  active,
}: {
  team: 'red' | 'blue'
  remaining: number
  active: boolean
}) {
  const red = team === 'red'
  return (
    <div
      className={[
        'flex items-center gap-2 rounded-xl border px-3 py-1.5 transition-all duration-300',
        red ? 'border-flame/30' : 'border-aqua/30',
        active
          ? red
            ? 'glow-flame bg-flame-mist'
            : 'glow-aqua bg-aqua-mist'
          : 'bg-white/70 opacity-70',
      ].join(' ')}
    >
      <span
        className={`h-2.5 w-2.5 rounded-full ${red ? 'bg-flame' : 'bg-aqua'}`}
        aria-hidden
      />
      <span
        className={`font-display text-lg font-extrabold tabular-nums leading-none ${
          red ? 'text-flame' : 'text-aqua'
        }`}
      >
        {remaining}
      </span>
      <span className="text-[11px] font-bold text-muted">
        {red ? 'الأحمر' : 'الأزرق'}
      </span>
    </div>
  )
}

export function TopBar({
  state,
  status,
  onReset,
}: {
  state: ClientState
  status: ConnectionStatus
  onReset: () => void
}) {
  const [copied, setCopied] = useState(false)
  const live = state.phase === 'clue' || state.phase === 'guess'

  async function share() {
    const url = typeof window !== 'undefined' ? window.location.href : ''
    const payload = {
      title: 'أسماء حركية: التحوّل',
      text: `انضمّ إلى غرفتي — ${state.roomId}`,
      url,
    }
    try {
      // لوحة المشاركة الأصلية على الجوال، والحافظة في غير ذلك.
      if (navigator.share && /Mobi|Android/i.test(navigator.userAgent)) {
        await navigator.share(payload)
        return
      }
      await navigator.clipboard.writeText(url)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      /* أغلق المستخدم لوحة المشاركة — لا شيء نفعله */
    }
  }

  const s = STATUS_STYLE[status]

  return (
    <header className="glass-deep sticky top-0 z-30 flex items-center gap-2.5 rounded-2xl px-3 py-2.5 sm:gap-4 sm:px-4">
      <Link
        href="/"
        className="hidden shrink-0 font-display text-sm font-extrabold sm:block"
        title="الصفحة الرئيسية"
      >
        <span className="text-fusion">أسماء حركية</span>
      </Link>

      <div className="flex items-center gap-2">
        <ScoreChip team="red" remaining={state.remaining.red} active={live && state.turn === 'red'} />
        <ScoreChip team="blue" remaining={state.remaining.blue} active={live && state.turn === 'blue'} />
      </div>

      {state.liveTrapCount > 0 && live && (
        <div className="glow-magic fx-shake hidden items-center gap-1.5 rounded-xl border border-magic/45 bg-magic-mist px-2.5 py-1.5 sm:flex">
          <span aria-hidden className="text-sm leading-none text-magic">
            ☠
          </span>
          <span className="text-[11px] font-bold text-magic">
            {state.liveTrapCount} فخ نشِط
          </span>
        </div>
      )}

      <div className="ms-auto flex items-center gap-2">
        <span className="hidden items-center gap-1.5 text-[11px] font-bold text-muted sm:flex">
          <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} aria-hidden />
          {s.label}
        </span>

        {state.abilities.canReset && (
          <button
            onClick={onReset}
            className="rounded-lg border border-white bg-white/75 px-2.5 py-1.5 text-[12px] font-bold text-muted transition hover:bg-white hover:text-ink"
          >
            إعادة الضبط
          </button>
        )}

        <button
          onClick={share}
          title="انسخ رابط الدعوة"
          className="flex items-center gap-2 rounded-lg border border-white bg-white/75 px-2.5 py-1.5 shadow-[0_6px_16px_-12px_rgba(41,32,96,0.7)] transition hover:bg-white active:scale-95"
        >
          <span dir="ltr" className="font-mono text-xs font-bold tracking-[0.18em] text-ink">
            {state.roomId}
          </span>
          <span className="text-[11px] font-bold text-muted">
            {copied ? 'نُسخ' : 'مشاركة'}
          </span>
        </button>
      </div>
    </header>
  )
}
