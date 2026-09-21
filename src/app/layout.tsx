import type { Metadata, Viewport } from 'next'
import './globals.css'
import { PWARegister } from '@/components/PWARegister'

export const metadata: Metadata = {
  title: {
    default: 'أسماء حركية: التحوّل',
    template: '%s · أسماء حركية: التحوّل',
  },
  description:
    'لعبة كلمات جماعية لحظية. قواعد Codenames الكلاسيكية، مع «الفخاخ المتحوّلة» — كل تخمينين صحيحين متتاليين يحوّلان أحد المارّة إلى قاتل.',
  applicationName: 'أسماء حركية: التحوّل',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'أسماء حركية',
    statusBarStyle: 'default',
  },
  formatDetection: { telephone: false },
  icons: {
    icon: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }],
  },
  openGraph: {
    title: 'أسماء حركية: التحوّل',
    description: 'لعبة الكلمات التي تعرفها… إلا أن اللوح نفسه ينقلب عليك.',
    type: 'website',
    locale: 'ar_AR',
  },
}

export const viewport: Viewport = {
  themeColor: '#f5f7ff',
  colorScheme: 'light',
  width: 'device-width',
  initialScale: 1,
  // اللوح شبكة ثابتة 5×5؛ التكبير باللمس يفسد التخطيط دائمًا.
  maximumScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* خطوط عربية محمّلة عبر link (لا next/font) كي تنجح البناءات دون شبكة. */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Cairo:wght@500;600;700;800&family=Tajawal:wght@400;500;700&family=JetBrains+Mono:wght@400;500&display=swap"
        />
      </head>
      <body className="antialiased">
        <div aria-hidden className="backdrop-aurora animate-drift" />
        <div aria-hidden className="grid-veil" />
        {children}
        <PWARegister />
      </body>
    </html>
  )
}
