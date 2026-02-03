'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { graphqlRequest } from '@/lib/graphql/client';
import { Button } from '@/components/ui/button';
import { Volume2 } from 'lucide-react';
import { useAudioGate } from '@/lib/audio-gate';
import { useLocale, useTranslations } from 'next-intl';
import {
  LANGUAGE_STORAGE_KEY,
  LEVEL_STORAGE_KEY,
} from '@/components/learning-language';

type LocalizedText =
  | string
  | { en?: string | null; ru?: string | null; uz?: string | null }
  | null
  | undefined;

type Language = {
  id: string;
  key: string;
  value: LocalizedText;
  order: number;
};

type Level = { id: string; languageId: string; title: LocalizedText; order: number };

type Chapter = { id: string; levelId: string; title: LocalizedText; order: number };

type Word = {
  id: string;
  chapterId: string;
  korean: string;
  translation: LocalizedText;
  translations?: { en?: string | null; ru?: string | null; uz?: string | null };
  order: number;
  audio?: string | null;
};

type CatalogChapter = Chapter & { words: Word[] };
type CatalogLevel = Level & { chapters: CatalogChapter[] };
type CatalogLanguage = Language & { levels: CatalogLevel[] };

export default function WordsView() {
  const locale = useLocale();
  const t = useTranslations();
  const { audioReady, unlockAudio } = useAudioGate();
  const [languages, setLanguages] = useState<CatalogLanguage[]>([]);
  const [openChapterByLevel, setOpenChapterByLevel] = useState<
    Record<string, string | undefined>
  >({});
  const [error, setError] = useState<string | null>(null);
  const [selectedLanguageId, setSelectedLanguageId] = useState('');
  const [selectedLevelId, setSelectedLevelId] = useState('');

  const fetchCatalog = useCallback(async () => {
    try {
      setError(null);
      const data = await graphqlRequest<{ wordsCatalog: CatalogLanguage[] }>(
        `query {
          wordsCatalog {
            id
            key
            value
            order
            levels {
              id
              languageId
              title
              order
              chapters {
                id
                levelId
                title
                order
                words {
                  id
                  chapterId
                  korean
                  translations {
                    en
                    ru
                    uz
                  }
                  order
                  audio
                }
              }
            }
          }
        }`,
      );
      setLanguages(data.wordsCatalog ?? []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load languages.',
      );
    }
  }, []);

  useEffect(() => {
    fetchCatalog();
  }, [fetchCatalog]);

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

  const resolveLocalized = useCallback(
    (value: LocalizedText) => {
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
              ''
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

  const resolveTranslation = useCallback(
    (word: Word) => {
      const translations = word.translations ?? {};
      const localized =
        translations[locale as 'en' | 'ru' | 'uz'] ||
        translations.en ||
        translations.ru ||
        translations.uz;
      if (localized) return localized;
      return resolveLocalized(word.translation);
    },
    [locale, resolveLocalized],
  );

  const resolveAudioSrc = useCallback((audio?: string | null) => {
    if (!audio) return null;
    if (audio.startsWith('https://storage.googleapis.com/snu-1b-5b-audio/')) {
      const suffix = audio.replace('https://storage.googleapis.com/snu-1b-5b-audio/', '');
      return `/api/audio/korean/snu/${suffix}`;
    }
    if (audio.startsWith('http')) return audio;
    if (audio.startsWith('/api/audio/')) return audio;
    if (audio.startsWith('audio/')) {
      return `/api/${audio}`;
    }
    return `/api/audio/${audio}`;
  }, []);

  const playAudio = useCallback(
    async (audio?: string | null) => {
      const src = resolveAudioSrc(audio);
      if (!src) return;
      if (!audioReady) {
        const unlocked = await unlockAudio();
        if (!unlocked) return;
      }
      const player = new Audio(src);
      player.play().catch(() => null);
    },
    [resolveAudioSrc, audioReady, unlockAudio],
  );

  return (
    <div className="space-y-6 px-6">
      {languages.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">
          {error ?? t('words.empty')}
        </div>
      ) : (
        languages
          .filter((language) =>
            selectedLanguageId ? language.id === selectedLanguageId : true,
          )
          .map((block) => (
          <div key={block.id} className="space-y-6">
            <div className="p-0">
              {block.levels
                .filter((level) =>
                  selectedLevelId ? level.id === selectedLevelId : true,
                )
                .map((level) => (
                <div key={level.id} className="space-y-3">
                  <Accordion
                    type="single"
                    collapsible
                    value={openChapterByLevel[level.id]}
                    onValueChange={(value) =>
                      setOpenChapterByLevel((prev) => ({
                        ...prev,
                        [level.id]: value || undefined,
                      }))
                    }
                    className="space-y-3"
                  >
                    {level.chapters.map((chapter) => (
                      <AccordionItem
                        key={chapter.id}
                        value={chapter.id}
                        className="border-none"
                      >
                        <AccordionTrigger className="rounded-2xl border bg-white/90 px-4 py-3 text-left no-underline hover:no-underline data-[state=open]:bg-muted/40">
                          <div className="flex w-full items-center justify-between gap-4">
                            <div className="text-base font-semibold text-foreground">
                              {resolveLocalized(chapter.title)}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {t('words.wordsCount', { count: chapter.words.length })}
                            </div>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="pt-3">
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead className="text-left text-muted-foreground">
                                <tr>
                                  <th className="py-2 pr-3 text-xs">#</th>
                                  <th className="py-2 pr-6 w-1/2">
                                    {t('words.korean')}
                                  </th>
                                  <th className="py-2 text-xs">
                                    {t('words.translation')}
                                  </th>
                                  <th className="py-2 text-xs">
                                    {t('words.audio')}
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {chapter.words.map((word, index) => (
                                  <tr key={word.id} className="border-t">
                                    <td className="py-3 pr-3 text-xs text-muted-foreground">
                                      {word.order || index + 1}
                                    </td>
                                    <td className="py-3 pr-6 text-lg font-semibold w-1/2">
                                      {word.korean}
                                    </td>
                                    <td className="py-3 text-sm text-muted-foreground">
                                      {resolveTranslation(word)}
                                    </td>
                                    <td className="py-3">
                                      {word.audio ? (
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="icon"
                                          onClick={() => playAudio(word.audio)}
                                        >
                                          <Volume2 className="h-4 w-4" />
                                        </Button>
                                      ) : (
                                        <span className="text-xs text-muted-foreground">
                                          {t('words.noAudio')}
                                        </span>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
