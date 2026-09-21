'use client'

import { useEffect, useState } from 'react'

import type { Fx } from '@/game/types'

/**
 * تنبيه سينمائي يملأ الشاشة عند وقوع «التحوّل».
 *
 * يعتمد على تدفّق `fx` القادم من الخادم لا على مقارنة الحالة، فيظهر التنبيه
 * مرة واحدة بالضبط لكل تحوّل، ولدى كل لاعب في الغرفة.
 */
export function ShiftAlert({ fx, fxSeq }: { fx: Fx[]; fxSeq: number }) {
  const [active, setActive] = useState<{ key: number; team: 'red' | 'blue' } | null>(null)

  useEffect(() => {
    const shift = fx.find((f) => f.type === 'shift')
    if (!shift || shift.type !== 'shift') return

    setActive({ key: fxSeq, team: shift.team })
    const timer = window.setTimeout(() => setActive(null), 1500)
    return () => window.clearTimeout(timer)
  }, [fx, fxSeq])

  if (!active) return null

  // الفخ يصبح قاتلًا في الدور التالي، وهو دور الفريق المنافس.
  const victim = active.team === 'red' ? 'الأزرق' : 'الأحمر'

  return (
    <div
      key={active.key}
      aria-live="polite"
      className="animate-shift-flash pointer-events-none fixed inset-0 z-50 flex items-center justify-center"
    >
      <div
        aria-hidden
        className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(217,70,239,0.42),rgba(245,247,255,0.92)_72%)] backdrop-blur-[2px]"
      />
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-24 animate-scan bg-gradient-to-b from-transparent via-magic/35 to-transparent"
      />

      <div className="relative text-center">
        <p className="fx-glitch font-display text-[clamp(2.4rem,12vw,6.5rem)] font-extrabold leading-none text-magic [text-shadow:0_6px_40px_rgba(168,85,247,0.55)]">
          تحوّل
        </p>
        <p className="mt-3 text-[13px] font-extrabold text-ink sm:text-base">
          أحد المارّة انقلب عليكم
        </p>
        <p className="mt-1 text-[12px] font-bold text-ink-soft">
          قاتل في دور الفريق {victim} القادم
        </p>
      </div>
    </div>
  )
}
