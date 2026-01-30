import './globals.css';
import type { ReactNode } from 'react';
import { BottomNav } from '@/components/bottom-nav';

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
        <div className="min-h-screen hero-bg pb-24 sm:pb-10">
          <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">{children}</div>
        </div>
        <BottomNav />
      </body>
    </html>
  );
}
