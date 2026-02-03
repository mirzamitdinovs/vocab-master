'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ChevronLeft, Volume2, XCircle } from 'lucide-react';
import { UserGate, type User } from '@/components/user-gate';
import { Button } from '@/components/ui/button';
import { graphqlRequest } from '@/lib/graphql/client';
import { useAudioGate } from '@/lib/audio-gate';
import { useLocale, useTranslations } from 'next-intl';

type Vocabulary = {
  id: string;
  order?: number | null;
  korean: string;
  translation?: string | null;
  translations?: { en?: string | null; ru?: string | null; uz?: string | null };
  audio?: string | null;
};

export default function FlashcardLessonPage() {
  return <UserGate>{(user) => <FlashcardLessonView user={user} />}</UserGate>;
}

function FlashcardLessonView({ user }: { user: User }) {
  const params = useParams();
  const router = useRouter();
  const lessonId = Array.isArray(params.lessonId)
    ? params.lessonId[0]
    : params.lessonId;
  const [lessonTitle, setLessonTitle] = useState<string | null>(null);
  const [frontLanguage, setFrontLanguage] = useState<'korean' | 'translation'>(
    'korean',
  );
  const [sessionWords, setSessionWords] = useState<Vocabulary[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showBack, setShowBack] = useState(false);
  const [direction, setDirection] = useState<'next' | 'prev'>('next');
  const [loading, setLoading] = useState(true);
  const [audioPlayer, setAudioPlayer] = useState<HTMLAudioElement | null>(null);
  const { audioReady, unlockAudio } = useAudioGate();
  const [activeTap, setActiveTap] = useState<'prev' | 'next' | null>(null);
  const locale = useLocale();
  const t = useTranslations();
  const wordsCachePrefix = 'vocab-master-words:chapter:';

  const currentWord = sessionWords[currentIndex];

  const localizedTranslation = useMemo(() => {
    if (!currentWord) return '';
    const translations = currentWord.translations ?? {};
    return (
      translations[locale as 'en' | 'ru' | 'uz'] ||
      currentWord.translation ||
      ''
    );
  }, [currentWord, locale]);

  const frontText = useMemo(() => {
    if (!currentWord) return '';
    return frontLanguage === 'korean'
      ? currentWord.korean
      : localizedTranslation;
  }, [currentWord, frontLanguage, localizedTranslation]);

  const backText = useMemo(() => {
    if (!currentWord) return '';
    return frontLanguage === 'korean'
      ? localizedTranslation
      : currentWord.korean;
  }, [currentWord, frontLanguage, localizedTranslation]);

  const isKoreanVisible = useMemo(() => {
    if (!currentWord) return false;
    return frontLanguage === 'korean' ? !showBack : showBack;
  }, [currentWord, frontLanguage, showBack]);

  const isTranslationVisible = useMemo(() => {
    if (!currentWord) return false;
    return frontLanguage === 'korean' ? showBack : !showBack;
  }, [currentWord, frontLanguage, showBack]);

  useEffect(() => {
    if (!lessonId) return;
    const storedTitle = sessionStorage.getItem(
      `flashcards-lesson-title-${lessonId}`,
    );
    if (storedTitle) {
      try {
        const parsed = JSON.parse(storedTitle) as Record<string, string>;
        setLessonTitle(parsed[locale as 'en' | 'ru' | 'uz' | 'ko'] ?? parsed.en ?? parsed.ko ?? storedTitle);
      } catch {
        setLessonTitle(storedTitle);
      }
    }
    const storedFront =
      sessionStorage.getItem('flashcards-front-language') ?? 'korean';
    setFrontLanguage(storedFront === 'translation' ? 'translation' : 'korean');
  }, [lessonId, locale]);

  useEffect(() => {
    async function loadSession() {
      if (!lessonId) return;
      setLoading(true);
      const cacheKey = `${wordsCachePrefix}${lessonId}`;
      let words: Vocabulary[] | null = null;
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        try {
          words = JSON.parse(cached) as Vocabulary[];
        } catch {
          localStorage.removeItem(cacheKey);
        }
      }
      if (!words) {
        const data = await graphqlRequest<{ sessionWords: Vocabulary[] }>(
          `query SessionWords($userId: ID!, $chapterIds: [ID!]!, $limit: Int) {
          sessionWords(userId: $userId, chapterIds: $chapterIds, limit: $limit) {
              id
              order
              korean
              translations {
                en
                ru
                uz
              }
              audio
          }
        }`,
          { userId: user.id, chapterIds: [lessonId], limit: null },
        );
        words = data.sessionWords ?? [];
        localStorage.setItem(cacheKey, JSON.stringify(words));
      }
      const shuffled = [...words].sort(() => Math.random() - 0.5);
      setSessionWords(shuffled);
      setCurrentIndex(0);
      setShowBack(false);
      setLoading(false);
    }
    loadSession();
  }, [lessonId, user.id]);

  function nextWord() {
    setShowBack(false);
    setDirection('next');
    setActiveTap('next');
    window.setTimeout(() => setActiveTap(null), 220);
    setCurrentIndex((prev) => Math.min(prev + 1, sessionWords.length - 1));
  }

  function prevWord() {
    setShowBack(false);
    setDirection('prev');
    setActiveTap('prev');
    window.setTimeout(() => setActiveTap(null), 220);
    setCurrentIndex((prev) => Math.max(prev - 1, 0));
  }

  function resolveAudioSrc(audio?: string | null) {
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
  }

  async function playAudio() {
    if (!audioReady) {
      const unlocked = await unlockAudio();
      if (!unlocked) return;
    }
    const src = resolveAudioSrc(currentWord?.audio);
    if (!src) return;
    if (audioPlayer) {
      audioPlayer.pause();
    }
    const player = new Audio(src);
    setAudioPlayer(player);
    player.play().catch(() => null);
  }

  async function handleCompleteSession() {
    await graphqlRequest<{ completeSession: { wordsLearned: number } }>(
      `mutation Complete($userId: ID!) {
        completeSession(userId: $userId) { wordsLearned }
      }`,
      { userId: user.id },
    );
    router.push(`/${locale}/flashcards`);
  }

  return (
    <div className="p-2 h-full flex flex-col gap-4">
      <header className=" border-b rounded-lg bg-white px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <Button
            asChild
            variant="ghost"
            size="icon"
            aria-label={t('flashcards.back')}
          >
            <Link href={`/${locale}/flashcards`}>
              <ChevronLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div className="flex-1 text-center">
            <div className="text-sm font-semibold text-foreground">
              {lessonTitle ?? t('flashcards.lesson')}
            </div>
            <div className="text-xs text-muted-foreground">
              {sessionWords.length > 0
                ? t('flashcards.wordCount', {
                    current: currentIndex + 1,
                    total: sessionWords.length,
                  })
                : t('flashcards.loading')}
            </div>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={handleCompleteSession}
            aria-label={t('flashcards.endSession')}
            className="bg-red-50 border-red-200 text-red-600"
          >
            <XCircle className="h-5 w-5 text-red-500" />
          </Button>
        </div>
      </header>

      <div className="mx-auto flex w-full h-full flex-1 flex-col ">
        {loading ? (
          <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
            {t('flashcards.loadingSession')}
          </div>
        ) : sessionWords.length === 0 ? (
          <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
            {t('flashcards.noWords')}
          </div>
        ) : (
          <div
            className="relative flex flex-1 flex-col items-center justify-center rounded-3xl border bg-white px-6 py-10 text-center shadow-lg"
            onTouchStart={(event) => {
              (event.currentTarget as HTMLElement).dataset.startX = String(
                event.touches[0].clientX,
              );
            }}
            onTouchEnd={(event) => {
              const startX = Number(
                (event.currentTarget as HTMLElement).dataset.startX ?? 0,
              );
              const endX = event.changedTouches[0].clientX;
              if (startX && Math.abs(endX - startX) > 50) {
                if (endX < startX) {
                  nextWord();
                } else {
                  prevWord();
                }
              }
            }}
          >
            <button
              type="button"
              className="absolute inset-y-0 left-0 w-1/2 rounded-l-3xl"
              onClick={prevWord}
              aria-label={t('flashcards.prevCard')}
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 w-1/2 rounded-r-3xl"
              onClick={nextWord}
              aria-label={t('flashcards.nextCard')}
            />
            <button
              type="button"
              onClick={() => setShowBack((prev) => !prev)}
              className="relative z-10 flex flex-col items-center justify-center text-center rounded-2xl px-6 py-6"
            >
              <div
                key={currentWord?.id}
                className={`font-semibold transition-opacity duration-150 ${
                  direction === 'next'
                    ? 'animate-in slide-in-from-right-4 fade-in'
                    : 'animate-in slide-in-from-left-4 fade-in'
                } ${isKoreanVisible ? 'text-7xl sm:text-8xl' : 'text-6xl sm:text-7xl'}`}
              >
                {showBack ? backText : frontText}
              </div>
              <div className="mt-4 text-sm text-muted-foreground">
                {t('flashcards.tapToFlip')}
              </div>
            </button>
          </div>
        )}
      </div>
      {currentWord?.audio ? (
        <Button className="w-full h-12 text-base" onClick={playAudio}>
          <Volume2 className="mr-2 h-4 w-4" />
          {t('flashcards.playAudio')}
        </Button>
      ) : null}
    </div>
  );
}
