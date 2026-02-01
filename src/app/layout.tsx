import './globals.css';
import type { ReactNode } from 'react';
import { headers } from 'next/headers';
import { NextIntlClientProvider } from 'next-intl';
import { LayoutShell } from '@/components/layout-shell';
import { getMessages } from '@/i18n/messages';

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
  const locale = headers().get('x-locale') ?? 'en';
  const messages = await getMessages(locale);

  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <LayoutShell>{children}</LayoutShell>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
