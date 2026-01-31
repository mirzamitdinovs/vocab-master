'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { BottomNav } from '@/components/bottom-nav';
import { SideNav } from '@/components/side-nav';

export function LayoutShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith('/admin');

  if (isAdmin) {
    return (
      <>
        <div className="min-h-screen hero-bg pb-24 sm:pb-10">{children}</div>
        <BottomNav />
      </>
    );
  }

  return (
    <>
      <div className="min-h-screen hero-bg pb-24 sm:pb-10">
        <div className="mx-auto w-full w-full px-4 py-6 sm:px-6 md:grid md:grid-cols-[220px,1fr] md:gap-6 lg:px-10">
          <SideNav />
          <div className="md:rounded-3xl  md:border md:bg-white/60 md:p-6 md:backdrop-blur">
            {children}
          </div>
        </div>
      </div>
      <BottomNav />
    </>
  );
}
