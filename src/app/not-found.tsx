import Link from 'next/link'

export const metadata = { title: 'غير موجود' }

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <p dir="ltr" className="font-mono text-xs tracking-[0.3em] text-muted">
        404
      </p>
      <h1 className="font-display text-3xl font-extrabold text-ink">لا توجد غرفة بهذا الرمز</h1>
      <p className="max-w-sm text-[15px] leading-relaxed text-ink-soft">
        رمز الغرفة يتكوّن من ٤ إلى ١٢ حرفًا أو رقمًا لاتينيًا. تحقّق من الرابط، أو
        ابدأ طاولة جديدة.
      </p>
      <Link
        href="/"
        className="glow-magic rounded-xl bg-gradient-to-l from-magic via-magic-soft to-aqua px-5 py-2.5 text-sm font-extrabold text-white transition hover:brightness-110"
      >
        أنشئ غرفة
      </Link>
    </main>
  )
}
