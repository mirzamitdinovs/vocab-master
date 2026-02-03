import './globals.css';
import type { ReactNode } from 'react';
import { headers } from 'next/headers';

export const metadata = {
  title: 'Vocab Master',
  description: 'Upload vocabulary CSVs and study with flashcards and quizzes.',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: '/icon-192.png',
    apple: '/apple-touch-icon.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Vocab Master',
  },
  other: {
    'apple-mobile-web-app-capable': 'yes',
  },
};

export default async function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  const headerLocale = headers().get('x-locale') ?? '';
  const nextUrl = headers().get('next-url') ?? '';
  const pathLocale = nextUrl.split('/')[1] ?? '';
  const locales = new Set(['en', 'ru', 'uz']);
  const locale =
    (locales.has(pathLocale) && pathLocale) ||
    (locales.has(headerLocale) && headerLocale) ||
    'en';

  return (
    <html lang={locale}>
      <body>
        {children}
      </body>
    </html>
  );
}
