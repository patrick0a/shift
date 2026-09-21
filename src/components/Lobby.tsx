'use client'

import { useEffect, useState } from 'react'

import { startBlocker } from '@/game/engine'
import type { ClientState } from '@/game/redact'

export function Lobby({
  state,
  onRename,
  onStart,
}: {
  state: ClientState
  onRename: (name: string) => void
  onStart: () => void
}) {
  const you = state.players.find((p) => p.id === state.youId)
  const [name, setName] = useState('')

  useEffect(() => {
    if (you) setName(you.name)
  }, [you?.name]) // eslint-disable-line react-hooks/exhaustive-deps

  // نستخدم مدقّق المحرّك نفسه، فتطابق الرسالة ما سيقبله الخادم فعلًا.
  const blocker = startBlocker(state)
  const isHost = Boolean(you?.host)

  return (
    <div className="glass-deep animate-rise flex flex-col gap-5 rounded-3xl p-5 sm:p-7">
      <div>
        <h2 className="font-display text-xl font-extrabold text-ink">جهّزوا الطاولة</h2>
        <p className="mt-1.5 text-[14px] leading-relaxed text-ink-soft">
          اختر فريقًا ودورًا من اللوحة المجاورة. كل فريق يحتاج من يعطي الأدلة ومن
          يخمّن — واختر <strong className="font-bold text-ink">مزدوج</strong> لتقوم
          بالدورين في مواجهة ١ ضد ١.
        </p>
      </div>

      <div>
        <label className="mb-2 block text-[12px] font-bold text-muted">اسمك الحركي</label>
        <div className="flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => name.trim() && onRename(name)}
            onKeyDown={(e) => e.key === 'Enter' && name.trim() && onRename(name)}
            maxLength={18}
            className="min-w-0 flex-1 rounded-xl border border-white bg-white/85 px-3.5 py-2.5 text-[15px] font-medium text-ink shadow-inner outline-none transition focus:border-magic/50 focus:ring-4 focus:ring-magic/15"
          />
          <button
            onClick={() => name.trim() && onRename(name)}
            className="shrink-0 rounded-xl border border-white bg-white/80 px-4 text-[13.5px] font-bold text-ink transition hover:bg-white"
          >
            حفظ
          </button>
        </div>
      </div>

      <section className="rounded-2xl border border-magic/30 bg-magic-mist p-4">
        <h3 className="flex items-center gap-2 font-display text-[15px] font-extrabold text-magic">
          <span aria-hidden>☠</span> ما هو «التحوّل»؟
        </h3>
        <p className="mt-1.5 text-[14px] leading-relaxed text-ink-soft">
          إذا حقّق فريقك <strong className="font-bold text-ink">تخمينين صحيحين متتاليين</strong>،
          يردّ اللوح الضربة: يتحوّل أحد المحايدين عشوائيًا إلى قاتل حيّ طوال دور
          الفريق الخصم التالي. قادة التجسس في الفريقين يرون أيّ بطاقة هي — أما
          العملاء الميدانيون فلا.
        </p>
      </section>

      <div className="flex flex-col gap-2">
        {isHost ? (
          <button
            onClick={onStart}
            disabled={Boolean(blocker)}
            className="glow-magic w-full rounded-xl bg-gradient-to-l from-magic via-magic-soft to-aqua px-5 py-3.5 font-display text-[16px] font-extrabold text-white transition hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
          >
            {blocker ? blocker : 'ابدأ المهمة'}
          </button>
        ) : (
          <p className="rounded-xl border border-white bg-white/70 px-4 py-3 text-center text-[14px] font-medium text-ink-soft">
            {blocker ?? 'كل شيء جاهز — في انتظار المضيف ليبدأ.'}
          </p>
        )}
        <p className="text-center text-[12px] text-muted">
          ادعُ أصدقاءك برمز الغرفة في الأعلى · {state.players.length} في الغرفة
        </p>
      </div>
    </div>
  )
}
