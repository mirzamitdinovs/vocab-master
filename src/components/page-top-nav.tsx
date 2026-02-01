'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import {
  BookText,
  ChevronDown,
  HelpCircle,
  Layers,
  RotateCw,
  Settings,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { graphqlRequest } from '@/lib/graphql/client';
import {
  LANGUAGE_STORAGE_KEY,
  LEVEL_STORAGE_KEY,
} from '@/components/learning-language';

const navItems = [
  { href: '/words', labelKey: 'nav.words', icon: BookText },
  { href: '/flashcards', labelKey: 'nav.cards', icon: Layers },
  { href: '/quiz', labelKey: 'nav.quiz', icon: HelpCircle },
  { href: '/settings', labelKey: 'nav.settings', icon: Settings },
];

export function PageTopNav() {
  const pathname = usePathname();
  const t = useTranslations();
  const locale = useLocale();
  const segments = pathname.split('/');
  const localePrefix = ['en', 'ru', 'uz'].includes(segments[1]) ? segments[1] : null;
  const basePath = localePrefix ? `/${localePrefix}` : '';
  const pathWithoutLocale = localePrefix ? pathname.replace(`/${localePrefix}`, '') || '/' : pathname;
  const [selectedLanguageId, setSelectedLanguageId] = useState('');
  const [selectedLevelId, setSelectedLevelId] = useState('');
  const [bookDrawerOpen, setBookDrawerOpen] = useState(false);
  const [catalog, setCatalog] = useState<
    {
      id: string;
      value: string | { en?: string | null; ru?: string | null; uz?: string | null };
      levels: { id: string; title: string | { en?: string | null; ru?: string | null; uz?: string | null } }[];
    }[]
  >([]);

  useEffect(() => {
    const syncSelection = () => {
      const storedLanguage = localStorage.getItem(LANGUAGE_STORAGE_KEY) ?? '';
      const storedLevel = localStorage.getItem(LEVEL_STORAGE_KEY) ?? '';
      setSelectedLanguageId(storedLanguage);
      setSelectedLevelId(storedLevel);
    };
    syncSelection();
    window.addEventListener('learning-language-updated', syncSelection);
    window.addEventListener('learning-topic-updated', syncSelection);
    return () => {
      window.removeEventListener('learning-language-updated', syncSelection);
      window.removeEventListener('learning-topic-updated', syncSelection);
    };
  }, []);

  useEffect(() => {
    if (pathWithoutLocale !== '/words') return;
    let active = true;
    async function loadCatalog() {
      try {
        const data = await graphqlRequest<{
          wordsCatalog: {
            id: string;
            value: string | { en?: string | null; ru?: string | null; uz?: string | null };
            levels: { id: string; title: string | { en?: string | null; ru?: string | null; uz?: string | null } }[];
          }[];
        }>(`query {
          wordsCatalog {
            id
            value
            levels {
              id
              title
            }
          }
        }`);
        if (active) setCatalog(data.wordsCatalog ?? []);
      } catch {
        // ignore catalog errors for header
      }
    }
    loadCatalog();
    return () => {
      active = false;
    };
  }, [pathWithoutLocale]);

  const resolveLocalized = useMemo(
    () =>
      (value?: string | { en?: string | null; ru?: string | null; uz?: string | null } | null) => {
        if (!value) return '';
        if (typeof value === 'string') {
          const trimmed = value.trim();
          if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
            try {
              const parsed = JSON.parse(trimmed) as {
                en?: string | null;
                ru?: string | null;
                uz?: string | null;
              };
              return (
                parsed[locale as 'en' | 'ru' | 'uz'] ||
                parsed.en ||
                parsed.ru ||
                parsed.uz ||
                value
              );
            } catch {
              return value;
            }
          }
          return value;
        }
        return (
          value[locale as 'en' | 'ru' | 'uz'] ||
          value.en ||
          value.ru ||
          value.uz ||
          ''
        );
      },
    [locale],
  );

  const headerMap: Record<string, { title: string; description: string }> = {
    '/words': {
      title: t('pageTop.wordsTitle'),
      description: t('pageTop.wordsDesc'),
    },
    '/flashcards': {
      title: t('pageTop.flashcardsTitle'),
      description: t('pageTop.flashcardsDesc'),
    },
    '/quiz': {
      title: t('pageTop.quizTitle'),
      description: t('pageTop.quizDesc'),
    },
    '/settings': {
      title: t('pageTop.settingsTitle'),
      description: t('pageTop.settingsDesc'),
    },
  };

  const header = headerMap[pathWithoutLocale];
  const hideNav =
    pathWithoutLocale.startsWith('/admin') ||
    (pathWithoutLocale.startsWith('/flashcards/') &&
      pathWithoutLocale !== '/flashcards');
  if (!header || hideNav) return null;

  return (
    <div className="p-2">
      <div className="rounded-2xl border bg-white/90 px-4 py-3 shadow-sm backdrop-blur">
        <div className="flex items-center justify-between gap-4">
          {pathWithoutLocale === '/words' ? (
            <div>
              <Dialog open={bookDrawerOpen} onOpenChange={setBookDrawerOpen}>
                <DialogTrigger asChild>
                  <button
                    type="button"
                    className="flex items-center gap-2 text-lg font-semibold text-foreground"
                  >
                    {resolveLocalized(
                      catalog
                        .find((l) => l.id === selectedLanguageId)
                        ?.levels.find((lvl) => lvl.id === selectedLevelId)
                        ?.title,
                    ) || header.description}
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  </button>
                </DialogTrigger>
                <DialogContent className="left-1/2 top-auto bottom-0 w-full max-w-none translate-x-[-50%] translate-y-0 rounded-t-2xl sm:max-w-lg sm:rounded-lg">
                  <DialogHeader>
                    <DialogTitle>{t('learning.selectTopic')}</DialogTitle>
                  </DialogHeader>
                  <div className="max-h-[60vh] space-y-2 overflow-y-auto">
                    {catalog
                      .find((l) => l.id === selectedLanguageId)
                      ?.levels.map((level) => (
                        <Button
                          key={level.id}
                          variant={level.id === selectedLevelId ? 'secondary' : 'ghost'}
                          className="w-full justify-start"
                          onClick={() => {
                            localStorage.setItem(LEVEL_STORAGE_KEY, level.id);
                            setSelectedLevelId(level.id);
                            window.dispatchEvent(new Event('learning-topic-updated'));
                            setBookDrawerOpen(false);
                          }}
                        >
                          {resolveLocalized(level.title)}
                        </Button>
                      )) ?? (
                      <div className="rounded-xl border border-dashed p-3 text-sm text-muted-foreground">
                        {t('learning.noTopics')}
                      </div>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          ) : (
            <div>
              <div className="text-xs uppercase tracking-[0.35em] text-muted-foreground">
                {header.title}
              </div>
              <div className="text-lg font-semibold text-foreground">
                {header.description}
              </div>
            </div>
          )}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border bg-white/80 text-muted-foreground transition hover:bg-muted lg:hidden"
              aria-label={t('pageTop.refresh')}
            >
              <RotateCw className="h-4 w-4" />
            </button>
            <nav className="hidden items-center gap-2 lg:flex">
              {navItems.map((item) => {
                const active = pathWithoutLocale === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={`${basePath}${item.href}`}
                    className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition ${
                      active
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {t(item.labelKey)}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      </div>
    </div>
  );
}
