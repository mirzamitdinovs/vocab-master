'use client';

import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { BottomNav } from '@/components/bottom-nav';
import { SideNav } from '@/components/side-nav';

export function LayoutShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith('/admin');

  useEffect(() => {
    let startY = 0;
    let pulling = false;
    const threshold = 80;

    function onTouchStart(event: TouchEvent) {
      if (window.scrollY !== 0) return;
      startY = event.touches[0].clientY;
      pulling = true;
    }

    function onTouchMove(event: TouchEvent) {
      if (!pulling) return;
      const currentY = event.touches[0].clientY;
      const distance = currentY - startY;
      if (distance > 0) {
        event.preventDefault();
      }
    }

    function onTouchEnd(event: TouchEvent) {
      if (!pulling) return;
      pulling = false;
      const endY = event.changedTouches[0].clientY;
      if (endY - startY >= threshold) {
        window.location.reload();
      }
    }

    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd);
    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, []);

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
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 md:grid md:grid-cols-[220px,1fr] md:gap-6">
          <SideNav />
          <div className="w-full md:rounded-3xl md:border md:bg-white/60 md:p-6 md:backdrop-blur">
            {children}
          </div>
        </div>
      </div>
      <BottomNav />
    </>
  );
}
