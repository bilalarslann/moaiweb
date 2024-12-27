import React from 'react'
import './globals.css'
import { Roboto } from 'next/font/google'

const roboto = Roboto({
  weight: ['100', '300', '400', '500', '700'],
  subsets: ['latin'],
  display: 'swap',
})

export const metadata = {
  title: 'MOAI - Yapay Zeka Yatırım Analisti',
  description: 'MOAI, yapay zeka destekli kripto para analisti ve yatırım danışmanınız. Kripto piyasalarında akıllı yatırım kararları almanıza yardımcı olur.',
  keywords: ['MOAI', 'kripto', 'yapay zeka', 'yatırım', 'analiz', 'cryptocurrency', 'AI', 'trading'],
  authors: [{ name: 'MOAI Team' }],
  openGraph: {
    title: 'MOAI - Yapay Zeka Yatırım Analisti',
    description: 'MOAI, yapay zeka destekli kripto para analisti ve yatırım danışmanınız.',
    url: 'https://moai.finance',
    siteName: 'MOAI',
    images: [
      {
        url: '/moai.webp',
        width: 1200,
        height: 630,
      },
    ],
    locale: 'tr_TR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MOAI - Yapay Zeka Yatırım Analisti',
    description: 'MOAI, yapay zeka destekli kripto para analisti ve yatırım danışmanınız.',
    images: ['/moai.webp'],
    creator: '@moAI_Agent',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="tr">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body className={roboto.className}>{children}</body>
    </html>
  )
}
