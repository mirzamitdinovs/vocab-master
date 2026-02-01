'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { graphqlRequest } from '@/lib/graphql/client';
import {
  LANGUAGE_STORAGE_KEY,
  LEVEL_STORAGE_KEY,
} from '@/components/learning-language';
import { LearningLanguage } from '@/components/learning-language';
import { LearningTopic } from '@/components/learning-topic';
import { useLocale, useTranslations } from 'next-intl';

export function SessionStarter({
  onStart,
  label,
}: {
  onStart: (
    chapterIds: string[],
    limit: number | null,
    chapterTitle?: string,
  ) => void;
  label?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [chapters, setChapters] = useState<{ id: string; title: string }[]>([]);
  const [chapterId, setChapterId] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedLevelId, setSelectedLevelId] = useState('');
  const [selectedLanguageId, setSelectedLanguageId] = useState('');
  const [missingSelectionsOpen, setMissingSelectionsOpen] = useState(false);
  const [debugStatus, setDebugStatus] = useState('');
  const t = useTranslations();
  const locale = useLocale();
  const startLabel = label ?? t('session.startSession');
  const wordsCachePrefix = 'vocab-master-words:chapter:';

  useEffect(() => {
    const storedLevel = localStorage.getItem(LEVEL_STORAGE_KEY) ?? '';
    const storedLanguage = localStorage.getItem(LANGUAGE_STORAGE_KEY) ?? '';
    setSelectedLevelId(storedLevel);
    setSelectedLanguageId(storedLanguage);
    const handleLanguageUpdate = () => {
      const nextLanguage = localStorage.getItem(LANGUAGE_STORAGE_KEY) ?? '';
      const nextLevel = localStorage.getItem(LEVEL_STORAGE_KEY) ?? '';
      setSelectedLanguageId(nextLanguage);
      setSelectedLevelId(nextLevel);
    };
    window.addEventListener('learning-language-updated', handleLanguageUpdate);
    window.addEventListener('learning-topic-updated', handleLanguageUpdate);
    return () => {
      window.removeEventListener(
        'learning-language-updated',
        handleLanguageUpdate,
      );
      window.removeEventListener(
        'learning-topic-updated',
        handleLanguageUpdate,
      );
    };
  }, []);

  useEffect(() => {
    const missing = !selectedLanguageId || !selectedLevelId;
    setMissingSelectionsOpen(missing);
  }, [selectedLanguageId, selectedLevelId]);

  useEffect(() => {
    if (!missingSelectionsOpen) return;
    let active = true;

    async function checkApi() {
      try {
        setDebugStatus(t('session.apiCheckStart'));
        const langs = await graphqlRequest<{ languages: { id: string }[] }>(
          `query { languages { id } }`,
        );
        if (!active) return;
        if (langs.languages.length === 0) {
          setDebugStatus(t('session.apiNoLanguages'));
          return;
        }

        const languageId = langs.languages[0].id;
        const levels = await graphqlRequest<{ levels: { id: string }[] }>(
          `query Levels($languageId: ID!) { levels(languageId: $languageId) { id } }`,
          { languageId },
        );
        if (!active) return;
        if (levels.levels.length === 0) {
          setDebugStatus(t('session.apiNoTopics'));
          return;
        }

        const levelId = levels.levels[0].id;
        const chapters = await graphqlRequest<{ chapters: { id: string }[] }>(
          `query Chapters($levelId: ID!) { chapters(levelId: $levelId) { id } }`,
          { levelId },
        );
        if (!active) return;
        if (chapters.chapters.length === 0) {
          setDebugStatus(t('session.apiNoLessons'));
          return;
        }

        const chapterId = chapters.chapters[0].id;
        const words = await graphqlRequest<{ words: { id: string }[] }>(
          `query Words($chapterId: ID!) { words(chapterId: $chapterId) { id } }`,
          { chapterId },
        );
        if (!active) return;
        setDebugStatus(
          t('session.apiWordsFound', { count: words.words.length }),
        );
      } catch (err) {
        if (!active) return;
        setDebugStatus(
          err instanceof Error
            ? t('session.apiFailed', { message: err.message })
            : t('session.apiFailed', { message: '' }),
        );
      }
    }

    checkApi();
    return () => {
      active = false;
    };
  }, [missingSelectionsOpen, t]);

  useEffect(() => {
    async function loadChapters() {
      if (!selectedLevelId) {
        setChapters([]);
        setChapterId('');
        return;
      }
      const data = await graphqlRequest<{
        chapters: { id: string; title: string }[];
      }>(
        `query Chapters($levelId: ID!) { chapters(levelId: $levelId) { id title } }`,
        { levelId: selectedLevelId },
      );
      setChapters(data.chapters);
      if (data.chapters[0]) {
        setChapterId(data.chapters[0].id);
      }
    }
    loadChapters();
  }, [selectedLevelId]);

  async function start() {
    if (!chapterId) return;
    setLoading(true);
    const selectedChapter = chapters.find(
      (chapter) => chapter.id === chapterId,
    );
    const cacheKey = `${wordsCachePrefix}${chapterId}`;
    if (!localStorage.getItem(cacheKey)) {
      try {
        const data = await graphqlRequest<{
          words: {
            id: string;
            chapterId: string;
            korean: string;
            translations?: { en?: string | null; ru?: string | null; uz?: string | null };
            order?: number | null;
            audio?: string | null;
          }[];
        }>(
          `query Words($chapterId: ID!) {
            words(chapterId: $chapterId) {
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
          }`,
          { chapterId },
        );
        localStorage.setItem(cacheKey, JSON.stringify(data.words));
      } catch (err) {
        // If caching fails, we still allow session to start.
      }
    }
    onStart([chapterId], null, selectedChapter?.title);
    setLoading(false);
  }

  const selectedChapter = chapters.find((chapter) => chapter.id === chapterId);

  const resolveTitle = (value?: string | null) => {
    if (!value) return '';
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
  };

  return (
    <div className="space-y-4 p-10">
      <Dialog
        open={missingSelectionsOpen}
        onOpenChange={setMissingSelectionsOpen}
      >
        <DialogContent className="w-[calc(100%-2rem)] max-w-lg sm:w-full">
          <DialogHeader>
            <DialogTitle>{t('session.finishSetup')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {t('session.finishDesc')}
            </p>
            {debugStatus ? (
              <div className="rounded-lg border border-dashed px-3 py-2 text-xs text-muted-foreground">
                {debugStatus}
              </div>
            ) : null}
            <div className="grid gap-4 sm:grid-cols-2">
              <LearningLanguage mode="inline" />
              <LearningTopic mode="inline" />
            </div>
            <Button
              className="w-full h-12 text-base"
              onClick={() => setMissingSelectionsOpen(false)}
              disabled={!selectedLanguageId || !selectedLevelId}
            >
              {t('session.start')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="space-y-2">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t('session.lesson')}
        </div>
        <div className="hidden sm:block">
          <select
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={chapterId}
            onChange={(event) => setChapterId(event.target.value)}
          >
            {chapters.map((chapter) => (
              <option key={chapter.id} value={chapter.id}>
                {resolveTitle(chapter.title)}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:hidden">
          <Dialog open={drawerOpen} onOpenChange={setDrawerOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full justify-between">
              {resolveTitle(selectedChapter?.title) ?? t('session.selectLesson')}
              </Button>
            </DialogTrigger>
            <DialogContent className="left-1/2 top-auto bottom-0 w-full max-w-none translate-x-[-50%] translate-y-0 rounded-t-2xl sm:max-w-lg sm:rounded-lg">
              <DialogHeader>
                <DialogTitle>{t('session.selectLesson')}</DialogTitle>
              </DialogHeader>
              <div className="max-h-[60vh] space-y-2 overflow-y-auto">
                {chapters.map((chapter) => (
                  <Button
                    key={chapter.id}
                    variant={chapter.id === chapterId ? 'secondary' : 'ghost'}
                    className="w-full justify-start"
                    onClick={() => {
                      setChapterId(chapter.id);
                      setDrawerOpen(false);
                    }}
                  >
                    {resolveTitle(chapter.title)}
                  </Button>
                ))}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      <Button
        className="w-full h-12 text-base bg-gradient-to-r from-blue-500 to-indigo-500 text-white hover:opacity-90"
        onClick={start}
        disabled={loading || !chapterId}
      >
        {loading ? t('session.loading') : startLabel}
      </Button>
    </div>
  );
}
