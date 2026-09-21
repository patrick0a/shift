'use client'

import { memo } from 'react'
import type { Card, CardKind } from '@/game/types'

/** ألوان البطاقة بعد كشفها (الوجه المقلوب). */
const REVEALED: Record<CardKind, string> = {
  red: 'bg-gradient-to-br from-flame to-flame-soft border-white/60 text-white shadow-[0_10px_28px_-10px_rgba(244,63,94,0.75)]',
  blue: 'bg-gradient-to-br from-aqua to-aqua-soft border-white/60 text-white shadow-[0_10px_28px_-10px_rgba(14,165,233,0.75)]',
  neutral:
    'bg-gradient-to-br from-gold-soft to-gold border-white/60 text-ink shadow-[0_10px_26px_-12px_rgba(245,158,11,0.7)]',
  assassin:
    'bg-gradient-to-br from-noir to-[#0d0b20] border-magic/50 text-white shadow-[0_12px_34px_-10px_rgba(34,31,69,0.9)]',
}

/** تلوين البطاقة غير المكشوفة كما يراها قائد التجسس عبر مفتاح الشبكة. */
const KEY_TINT: Record<CardKind, string> = {
  red: 'bg-flame-mist border-flame/40',
  blue: 'bg-aqua-mist border-aqua/40',
  neutral: 'bg-gold-mist border-gold/40',
  assassin: 'bg-noir border-noir text-white',
}

const KEY_DOT: Record<CardKind, string> = {
  red: 'bg-flame',
  blue: 'bg-aqua',
  neutral: 'bg-gold',
  assassin: 'bg-magic-soft',
}

const GLYPH: Record<CardKind, string> = {
  red: '◆',
  blue: '◆',
  neutral: '○',
  assassin: '☠',
}

export interface WordCardProps {
  card: Card
  /** عرض قائد التجسس (أو ما بعد انتهاء الجولة): المفتاح مكشوف. */
  seesKey: boolean
  /** يوجد فخ متحوّل على هذه البطاقة، وموقعه معلوم لنا. */
  trap: { live: boolean } | null
  /** يحق للاعب النقر على هذه البطاقة الآن. */
  interactive: boolean
  onGuess: (cardId: number) => void
  index: number
}

function WordCardInner({ card, seesKey, trap, interactive, onGuess, index }: WordCardProps) {
  const kind = card.kind
  const revealed = card.revealed

  const frontClasses = [
    'flip-face flex items-center justify-center border px-1.5 text-center transition-colors duration-200',
    seesKey && kind ? KEY_TINT[kind] : 'bg-white/85 border-white text-ink',
    interactive ? 'group-hover:border-magic/45 group-hover:bg-white' : '',
    trap?.live ? '!border-magic animate-pulse-ring' : '',
    trap && !trap.live ? '!border-magic/45' : '',
  ].join(' ')

  return (
    <button
      type="button"
      disabled={!interactive}
      onClick={() => interactive && onGuess(card.id)}
      aria-label={
        revealed
          ? `${card.word}، مكشوفة`
          : interactive
            ? `خمّن ${card.word}`
            : card.word
      }
      style={{ animationDelay: `${Math.min(index, 24) * 18}ms` }}
      className={[
        'group flip-scene animate-rise relative aspect-[5/3.35] w-full select-none rounded-2xl outline-none',
        'shadow-[0_8px_20px_-14px_rgba(41,32,96,0.55)]',
        'focus-visible:ring-2 focus-visible:ring-magic/70 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas',
        interactive
          ? 'cursor-pointer transition-transform duration-200 hover:-translate-y-[3px] active:translate-y-0 active:scale-[0.975]'
          : 'cursor-default',
      ].join(' ')}
    >
      <div
        className="flip-inner"
        style={{ transform: revealed ? 'rotateY(180deg)' : 'none' }}
      >
        {/* ---- الوجه الظاهر: الكلمة وحدها ---- */}
        <div className={frontClasses}>
          {seesKey && kind && (
            <span
              aria-hidden
              className={`absolute end-2 top-2 h-1.5 w-1.5 rounded-full ${KEY_DOT[kind]}`}
            />
          )}

          {trap && (
            <span
              aria-hidden
              title="فخ متحوّل"
              className={`absolute start-2 top-1.5 text-[12px] leading-none ${
                trap.live ? 'text-magic' : 'text-magic/55'
              }`}
            >
              ☠
            </span>
          )}

          <span className="font-display text-[clamp(0.72rem,2.9vw,1.05rem)] font-bold leading-tight">
            {card.word}
          </span>
        </div>

        {/* ---- الوجه المقلوب: الهوية المكشوفة ---- */}
        <div
          className={`flip-face flex items-center justify-center border px-1.5 text-center ${
            revealed && kind ? REVEALED[kind] : 'bg-white border-white'
          }`}
          style={{ transform: 'rotateY(180deg)' }}
        >
          <span
            aria-hidden
            className="absolute inset-0 flex items-center justify-center text-[2.6rem] opacity-20"
          >
            {kind ? GLYPH[kind] : ''}
          </span>
          <span className="relative font-display text-[clamp(0.68rem,2.6vw,0.95rem)] font-bold leading-tight opacity-90">
            {card.word}
          </span>
        </div>
      </div>
    </button>
  )
}

export const WordCard = memo(WordCardInner)
