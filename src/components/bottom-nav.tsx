'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { BookText, HelpCircle, Layers, Settings } from 'lucide-react';
import { useTranslations } from 'next-intl';

const navItems = [
  { href: '/words', labelKey: 'nav.words', icon: BookText },
  { href: '/flashcards', labelKey: 'nav.cards', icon: Layers },
  { href: '/quiz', labelKey: 'nav.quiz', icon: HelpCircle },
  { href: '/settings', labelKey: 'nav.settings', icon: Settings },
];

export function BottomNav() {
  const pathname = usePathname();
  const t = useTranslations();
  const [hasUser, setHasUser] = useState(false);
  const segments = pathname.split('/');
  const locale = ['en', 'ru', 'uz'].includes(segments[1]) ? segments[1] : null;
  const basePath = locale ? `/${locale}` : '';
  const pathWithoutLocale = locale ? pathname.replace(`/${locale}`, '') || '/' : pathname;

  useEffect(() => {
    const stored = sessionStorage.getItem('vocab-master-user');
    setHasUser(!!stored);

    const handleUpdate = () => {
      const next = sessionStorage.getItem('vocab-master-user');
      setHasUser(!!next);
    };
    window.addEventListener('user-updated', handleUpdate);
    return () => window.removeEventListener('user-updated', handleUpdate);
  }, []);

  if (pathWithoutLocale.startsWith('/admin')) {
    return null;
  }
  if (pathWithoutLocale.startsWith('/flashcards/') && pathWithoutLocale !== '/flashcards') {
    return null;
  }

  // if (!hasUser) return null;

  return (
    <div className="p-2">
      <div className="rounded-3xl lg:hidden border bg-white/90 px-2 py-2 shadow-lg backdrop-blur">
        <div className="grid grid-cols-4 gap-1 text-[11px]">
          {navItems.map((item) => {
            const active = pathWithoutLocale === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={`${basePath}${item.href}`}
                className={`flex flex-col items-center gap-1 rounded-2xl px-2 py-2 transition ${
                  active
                    ? 'bg-gradient-to-r from-sky-500 to-indigo-500 text-white shadow'
                    : 'text-muted-foreground'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="leading-none">{t(item.labelKey)}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
