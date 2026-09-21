'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

import { isValidRoomId, makeRoomId, normalizeRoomId } from '@/game/protocol'
import { getPlayerName, setPlayerName } from '@/lib/identity'

export function Landing() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => setName(getPlayerName()), [])

  function commitName() {
    const clean = name.trim().slice(0, 18)
    if (clean) setPlayerName(clean)
  }

  function create() {
    commitName()
    router.push(`/room/${makeRoomId()}`)
  }

  function join(e: React.FormEvent) {
    e.preventDefault()
    const id = normalizeRoomId(code)
    if (!isValidRoomId(id)) {
      setError('رمز الغرفة يتكوّن من ٤ إلى ١٢ حرفًا أو رقمًا لاتينيًا.')
      return
    }
    commitName()
    router.push(`/room/${id}`)
  }

  return (
    <main className="relative mx-auto flex min-h-dvh w-full max-w-5xl flex-col items-center justify-center gap-10 px-5 py-14">
      <header className="animate-rise text-center">
        <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-white bg-white/70 px-4 py-1.5 text-[12px] font-bold text-muted shadow-[0_6px_18px_-12px_rgba(41,32,96,0.6)]">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-magic opacity-70" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-magic" />
          </span>
          لعب لحظي · من لاعبَين إلى ١٦ لاعبًا
        </p>

        <h1 className="font-display text-5xl font-extrabold leading-[1.15] sm:text-7xl">
          <span className="text-fusion">أسماء حركية</span>
          <span className="mt-1 block text-3xl font-bold text-magic sm:text-5xl">
            التحوّل
          </span>
        </h1>

        <p className="mx-auto mt-5 max-w-xl text-balance text-[16px] leading-relaxed text-ink-soft">
          لعبة الكلمات التي تعرفها — حتى يسخن فريقك. فكل{' '}
          <span className="font-bold text-magic">تخمينين صحيحين متتاليين</span>{' '}
          يحوّلان أحد المارّة الأبرياء إلى قاتل حيّ في الدور التالي.
        </p>
      </header>

      <section className="glass-deep animate-rise w-full max-w-md rounded-3xl p-6 sm:p-7">
        <label className="mb-2 block text-[12px] font-bold text-muted">
          اسمك الحركي
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={commitName}
          maxLength={18}
          placeholder="اكتب اسمك"
          className="w-full rounded-xl border border-white bg-white/80 px-4 py-3 text-[15px] font-medium text-ink shadow-inner outline-none transition placeholder:text-muted/60 focus:border-magic/50 focus:ring-4 focus:ring-magic/15"
        />

        <button
          onClick={create}
          className="glow-magic mt-5 w-full rounded-xl bg-gradient-to-l from-magic via-magic-soft to-aqua px-5 py-3.5 font-display text-[16px] font-extrabold text-white transition hover:brightness-110 active:scale-[0.985]"
        >
          أنشئ غرفة جديدة
        </button>

        <div className="my-5 flex items-center gap-3 text-[12px] font-bold text-muted/70">
          <span className="h-px flex-1 bg-ink/10" />
          أو انضمّ
          <span className="h-px flex-1 bg-ink/10" />
        </div>

        <form onSubmit={join} className="flex gap-2.5">
          <input
            value={code}
            onChange={(e) => {
              setCode(e.target.value.toUpperCase())
              setError(null)
            }}
            maxLength={12}
            dir="ltr"
            placeholder="ROOM CODE"
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            className="min-w-0 flex-1 rounded-xl border border-white bg-white/80 px-4 py-3 text-center font-mono text-[15px] font-semibold tracking-[0.2em] text-ink shadow-inner outline-none transition focus:border-aqua/50 focus:ring-4 focus:ring-aqua/15"
          />
          <button
            type="submit"
            className="shrink-0 rounded-xl border border-white bg-white/80 px-5 font-display text-sm font-bold text-ink shadow-[0_6px_18px_-12px_rgba(41,32,96,0.6)] transition hover:bg-white active:scale-[0.985]"
          >
            دخول
          </button>
        </form>

        {error && <p className="mt-3 text-sm font-medium text-flame">{error}</p>}
      </section>

      <section className="grid w-full max-w-3xl gap-3 sm:grid-cols-3">
        {[
          {
            title: 'القواعد الكلاسيكية',
            body: '٢٥ كلمة بتوزيع ٩ / ٨ / ٧ / ١. القادة يلمّحون، والعملاء يخمّنون، والقاتل ينهي كل شيء.',
            tint: 'from-flame-mist',
          },
          {
            title: 'الفخاخ المتحوّلة',
            body: 'تخمينان صحيحان متتاليان، فيردّ اللوح الضربة: أحد المحايدين يصبح قاتلًا لدور واحد.',
            tint: 'from-magic-mist',
          },
          {
            title: 'أي عدد من اللاعبين',
            body: 'من ١ ضد ١ حتى ٨ ضد ٨. العب المقعدين وحدك، أو املأ فريقك بالعملاء.',
            tint: 'from-aqua-mist',
          },
        ].map((f) => (
          <article
            key={f.title}
            className={`glass animate-rise rounded-2xl bg-gradient-to-b ${f.tint} to-white/40 p-4`}
          >
            <h2 className="font-display text-[15px] font-extrabold text-ink">{f.title}</h2>
            <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-soft">{f.body}</p>
          </article>
        ))}
      </section>

      <footer className="text-center text-[12px] leading-relaxed text-muted">
        شارك رابط الغرفة لدعوة اللاعبين · يمكنك تثبيت اللعبة كتطبيق من قائمة
        المتصفح
      </footer>
    </main>
  )
}
