'use client'

import { useEffect, useState } from 'react'

import { UNLIMITED_GUESSES } from '@/game/engine'
import type { ClientState } from '@/game/redact'

const COUNTS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]

export function ClueBar({
  state,
  onClue,
  onPass,
}: {
  state: ClientState
  onClue: (word: string, count: number) => void
  onPass: () => void
}) {
  const [word, setWord] = useState('')
  const [count, setCount] = useState(2)
  const { abilities, turn, phase, clue } = state

  // نفرّغ الحقل بعد إرسال الدليل ليكون جاهزًا في الدور التالي.
  useEffect(() => {
    if (phase !== 'clue') setWord('')
  }, [phase])

  const red = turn === 'red'
  const teamName = red ? 'الأحمر' : 'الأزرق'
  const ring = red
    ? 'focus:border-flame/50 focus:ring-flame/15'
    : 'focus:border-aqua/50 focus:ring-aqua/15'

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const clean = word.trim()
    if (!clean) return
    onClue(clean, count)
  }

  // ---- قائد التجسس يكتب الدليل -------------------------------------------
  if (phase === 'clue' && abilities.canGiveClue) {
    return (
      <form
        onSubmit={submit}
        className="glass-deep animate-rise flex flex-col gap-2.5 rounded-2xl p-3 sm:flex-row sm:items-center sm:gap-3"
      >
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <span
            className={`hidden shrink-0 text-[12px] font-bold sm:block ${
              red ? 'text-flame' : 'text-aqua'
            }`}
          >
            أرسل الدليل
          </span>
          <input
            value={word}
            onChange={(e) => setWord(e.target.value.replace(/\s+/g, ''))}
            maxLength={24}
            autoFocus
            placeholder="كلمة واحدة فقط"
            autoComplete="off"
            spellCheck={false}
            className={`min-w-0 flex-1 rounded-xl border border-white bg-white/85 px-3.5 py-2.5 font-display text-base font-bold text-ink shadow-inner outline-none transition placeholder:font-medium placeholder:text-muted/60 focus:ring-4 ${ring}`}
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="scroll-thin flex flex-1 gap-1 overflow-x-auto rounded-xl border border-white bg-white/70 p-1">
            {COUNTS.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setCount(n)}
                title={n === 0 ? 'تخمينات غير محدودة' : `${n} كلمات`}
                className={[
                  'h-8 w-8 shrink-0 rounded-lg font-mono text-sm font-bold transition',
                  count === n
                    ? red
                      ? 'glow-flame bg-flame text-white'
                      : 'glow-aqua bg-aqua text-white'
                    : 'text-muted hover:bg-ink/5 hover:text-ink',
                ].join(' ')}
              >
                {n === 0 ? '∞' : n}
              </button>
            ))}
          </div>

          <button
            type="submit"
            disabled={!word.trim()}
            className={[
              'shrink-0 rounded-xl px-5 py-2.5 font-display text-sm font-extrabold text-white transition active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-35',
              red
                ? 'glow-flame bg-gradient-to-l from-flame to-flame-soft'
                : 'glow-aqua bg-gradient-to-l from-aqua to-aqua-soft',
            ].join(' ')}
          >
            إرسال
          </button>
        </div>
      </form>
    )
  }

  // ---- في انتظار الطرف الآخر ----------------------------------------------
  if (phase === 'clue') {
    return (
      <div className="glass-deep flex items-center justify-center gap-2.5 rounded-2xl px-4 py-4 text-sm font-medium text-ink-soft">
        <span className="relative flex h-2 w-2">
          <span
            className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-70 ${
              red ? 'bg-flame' : 'bg-aqua'
            }`}
          />
          <span
            className={`relative inline-flex h-2 w-2 rounded-full ${
              red ? 'bg-flame' : 'bg-aqua'
            }`}
          />
        </span>
        قائد تجسس الفريق{' '}
        <span className={`font-bold ${red ? 'text-flame' : 'text-aqua'}`}>{teamName}</span>{' '}
        يجهّز الدليل…
      </div>
    )
  }

  // ---- مرحلة التخمين -------------------------------------------------------
  if (phase === 'guess' && clue) {
    const unlimited = state.guessesLeft >= UNLIMITED_GUESSES
    return (
      <div
        className={[
          'glass-deep animate-rise flex flex-wrap items-center gap-x-4 gap-y-2.5 rounded-2xl px-4 py-3',
          red ? 'border-flame/25' : 'border-aqua/25',
        ].join(' ')}
      >
        <div className="min-w-0">
          <p className="text-[12px] font-bold text-muted">دليل من {clue.by}</p>
          <p
            className={`truncate font-display text-2xl font-extrabold ${
              red ? 'text-flame text-glow-flame' : 'text-aqua text-glow-aqua'
            }`}
          >
            {clue.word}{' '}
            <span className="text-ink">· {clue.count === 0 ? '∞' : clue.count}</span>
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          {unlimited ? (
            <span className="text-sm font-bold text-muted">تخمينات غير محدودة</span>
          ) : (
            <>
              {Array.from({ length: Math.max(state.guessesLeft, 0) }).map((_, i) => (
                <span
                  key={i}
                  aria-hidden
                  className={`h-2.5 w-2.5 rounded-full ${red ? 'bg-flame' : 'bg-aqua'}`}
                />
              ))}
              <span className="ms-1.5 text-[12px] font-bold text-muted">
                بقي {state.guessesLeft}
              </span>
            </>
          )}
        </div>

        {state.liveTrapCount > 0 && (
          <span className="flex items-center gap-1.5 rounded-lg border border-magic/40 bg-magic-mist px-2.5 py-1 text-[12px] font-bold text-magic">
            ☠ {state.liveTrapCount} من المحايدين قاتل الآن
          </span>
        )}

        {abilities.canPass && (
          <button
            onClick={onPass}
            className="ms-auto rounded-xl border border-white bg-white/80 px-4 py-2 font-display text-sm font-bold text-ink shadow-[0_6px_18px_-12px_rgba(41,32,96,0.7)] transition hover:bg-white active:scale-[0.97]"
          >
            إنهاء الدور
          </button>
        )}
      </div>
    )
  }

  return null
}
