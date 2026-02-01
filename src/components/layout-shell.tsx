'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { BottomNav } from '@/components/bottom-nav';
import { PageTopNav } from '@/components/page-top-nav';
import { SessionSetupModal } from '@/components/session-setup-modal';

export function LayoutShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const segments = pathname.split('/');
  const locale = ['en', 'ru', 'uz'].includes(segments[1]) ? segments[1] : null;
  const pathWithoutLocale = locale ? pathname.replace(`/${locale}`, '') || '/' : pathname;
  const isAdmin = pathWithoutLocale.startsWith('/admin');

  if (isAdmin) {
    return (
      <>
        <div className="min-h-screen hero-bg pb-24 sm:pb-10">{children}</div>
        <BottomNav />
      </>
    );
  }

  return (
    <div className="h-screen grid grid-rows-[auto_1fr_auto]">
      <SessionSetupModal />
      <header className="shrink-0">
        <PageTopNav />
      </header>
      <main className="overflow-y-auto">{children}</main>
      <footer className="shrink-0">
        <BottomNav />
      </footer>
    </div>
  );
}
