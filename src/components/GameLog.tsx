'use client'

import { useEffect, useRef } from 'react'

import type { ClientState } from '@/game/redact'
import type { LogEntry, Team } from '@/game/types'

const OUTCOME_TEXT: Record<string, string> = {
  correct: 'اتصل بـ',
  neutral: 'أصاب محايدًا',
  opponent: 'كشف عميلًا معاديًا',
  assassin: 'لمس القاتل',
  trap: 'فجّر فخًا متحوّلًا',
}

const TEAM_LABEL: Record<Team, string> = { red: 'الأحمر', blue: 'الأزرق' }

const REASON_TEXT: Record<string, string> = {
  words: 'اكتملت كل الاتصالات',
  trap: 'انفجر فخ متحوّل',
  assassin: 'عُثر على القاتل',
  forfeit: 'انسحاب',
}

function teamColor(team?: Team) {
  if (team === 'red') return 'text-flame'
  if (team === 'blue') return 'text-aqua'
  return 'text-muted'
}

function Row({ entry }: { entry: LogEntry }) {
  const time = new Date(entry.at).toLocaleTimeString('ar', {
    hour: '2-digit',
    minute: '2-digit',
  })

  const body = (() => {
    switch (entry.type) {
      case 'system':
        return <span className="text-muted">{entry.text}</span>

      case 'turn':
        return (
          <span className="text-ink-soft">
            الدور الآن للفريق{' '}
            <span className={`font-bold ${teamColor(entry.team)}`}>
              {TEAM_LABEL[entry.team]}
            </span>
          </span>
        )

      case 'clue':
        return (
          <span>
            <span className={`font-bold ${teamColor(entry.team)}`}>{entry.by}</span>
            <span className="text-ink-soft"> لمّح بـ </span>
            <span className="font-display font-extrabold text-ink">
              {entry.word} · {entry.count === 0 ? '∞' : entry.count}
            </span>
          </span>
        )

      case 'guess': {
        const bad = entry.outcome === 'assassin' || entry.outcome === 'trap'
        return (
          <span>
            <span className={`font-bold ${teamColor(entry.team)}`}>{entry.by}</span>
            <span className="text-ink-soft"> {OUTCOME_TEXT[entry.outcome]} </span>
            <span className={`font-display font-bold ${bad ? 'text-magic' : 'text-ink'}`}>
              {entry.word}
            </span>
          </span>
        )
      }

      case 'pass':
        return (
          <span className="text-ink-soft">
            <span className={`font-bold ${teamColor(entry.team)}`}>{entry.by}</span> أنهى
            الدور
          </span>
        )

      case 'shift':
        return (
          <span className="font-medium text-magic">
            ☠ تحوّل — أحد المحايدين صار قاتلًا
            {entry.word && (
              <>
                {' '}
                <span className="font-display font-extrabold">({entry.word})</span>
              </>
            )}
          </span>
        )

      case 'end':
        return (
          <span>
            <span className={`font-display font-extrabold ${teamColor(entry.team)}`}>
              فاز الفريق {TEAM_LABEL[entry.team]}
            </span>
            <span className="text-ink-soft"> · {REASON_TEXT[entry.reason]}</span>
          </span>
        )
    }
  })()

  const accent =
    entry.type === 'shift'
      ? 'border-magic/35 bg-magic-mist'
      : entry.type === 'end'
        ? 'border-ink/10 bg-white/70'
        : 'border-transparent'

  return (
    <li className={`animate-rise rounded-lg border px-2 py-1.5 text-[13px] leading-relaxed ${accent}`}>
      <span dir="ltr" className="me-1.5 font-mono text-[10px] text-muted/60">
        {time}
      </span>
      {body}
    </li>
  )
}

export function GameLog({ state }: { state: ClientState }) {
  const scroller = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = scroller.current
    if (el) el.scrollTop = el.scrollHeight
  }, [state.log.length])

  return (
    <section className="glass flex min-h-0 flex-1 flex-col rounded-2xl">
      <h3 className="shrink-0 border-b border-ink/8 px-3.5 py-2.5 text-[12px] font-bold text-muted">
        سجل الميدان
      </h3>
      <div
        ref={scroller}
        className="scroll-thin min-h-0 flex-1 overflow-y-auto px-1.5 py-1.5"
        style={{ scrollBehavior: 'smooth' }}
      >
        {state.log.length === 0 ? (
          <p className="px-2 py-3 text-[13px] text-muted/70">
            ستظهر هنا كل الإرساليات والتخمينات.
          </p>
        ) : (
          <ul className="flex flex-col gap-0.5">
            {state.log.map((e) => (
              <Row key={e.id} entry={e} />
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
