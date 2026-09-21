import Link from 'next/link'

export const metadata = { title: 'انقطع الاتصال' }

export default function OfflinePage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="font-display text-3xl font-extrabold text-magic">انقطعت الإشارة</h1>
      <p className="max-w-sm text-[15px] leading-relaxed text-ink-soft">
        تحتاج «أسماء حركية: التحوّل» إلى اتصال حيّ كي يبقى لوح كل عميل متزامنًا.
        أعد الاتصال وسيبقى مقعدك في انتظارك.
      </p>
      <Link
        href="/"
        className="rounded-xl border border-white bg-white/80 px-5 py-2.5 text-sm font-bold text-ink shadow-[0_8px_20px_-14px_rgba(41,32,96,0.8)] transition hover:bg-white"
      >
        حاول مرة أخرى
      </Link>
    </main>
  )
}
