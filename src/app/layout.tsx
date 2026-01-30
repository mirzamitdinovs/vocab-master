import './globals.css';
import type { ReactNode } from 'react';
import { LayoutShell } from '@/components/layout-shell';

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

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <LayoutShell>{children}</LayoutShell>
      </body>
    </html>
  );
}
