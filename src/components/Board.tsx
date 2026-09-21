'use client'

import { useMemo } from 'react'

import { HIDDEN_CARD } from '@/game/redact'
import type { ClientState } from '@/game/redact'
import { WordCard } from './WordCard'

export function Board({
  state,
  onGuess,
}: {
  state: ClientState
  onGuess: (cardId: number) => void
}) {
  /** cardId → trap, for the traps whose location this viewer is allowed to see. */
  const trapsByCard = useMemo(() => {
    const map = new Map<number, { live: boolean }>()
    for (const t of state.traps) {
      if (t.cardId !== HIDDEN_CARD) map.set(t.cardId, { live: t.live })
    }
    return map
  }, [state.traps])

  const canGuess = state.abilities.canGuess

  return (
    <div
      className="grid grid-cols-5 gap-1.5 sm:gap-2.5"
      role="grid"
      aria-label="لوح الأسماء الحركية"
    >
      {state.cards.map((card, i) => (
        <WordCard
          key={card.id}
          card={card}
          index={i}
          seesKey={state.abilities.seesKey || state.phase === 'ended'}
          trap={trapsByCard.get(card.id) ?? null}
          interactive={canGuess && !card.revealed}
          onGuess={onGuess}
        />
      ))}
    </div>
  )
}
