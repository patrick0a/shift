'use client'

import type { Toast } from '@/lib/useGame'

export function Toasts({
  toasts,
  onDismiss,
}: {
  toasts: Toast[]
  onDismiss: (id: number) => void
}) {
  if (toasts.length === 0) return null

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4"
    >
      {toasts.map((t) => (
        <button
          key={t.id}
          onClick={() => onDismiss(t.id)}
          className="glass-deep animate-rise pointer-events-auto max-w-sm rounded-xl border-magic/25 px-4 py-2.5 text-[13.5px] font-bold text-ink"
        >
          {t.message}
        </button>
      ))}
    </div>
  )
}
