import type { Metadata } from 'next';
import { Roboto } from 'next/font/google';
import './globals.css';

const roboto = Roboto({
  subsets: ['latin'],
  weight: ['100', '300', '400', '500', '700', '900'],
  display: 'swap',
  variable: '--font-roboto'
});

export const metadata: Metadata = {
  title: 'MOAI',
  description: 'MOAI, kripto para analizi yapan ve haberleri takip eden bir yapay zeka botudur.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="tr" className={roboto.variable}>
      <body>{children}</body>
    </html>
  );
}
