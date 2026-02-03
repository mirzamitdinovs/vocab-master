'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ChevronLeft, XCircle } from 'lucide-react';
import { UserGate, type User } from '@/components/user-gate';
import { Button } from '@/components/ui/button';
import { graphqlRequest } from '@/lib/graphql/client';
import { cn } from '@/lib/utils';
import { useLocale, useTranslations } from 'next-intl';

type Vocabulary = {
  id: string;
  order?: number | null;
  korean: string;
  translation?: string | null;
  translations?: { en?: string | null; ru?: string | null; uz?: string | null };
};

type Answer = {
  wordId: string;
  korean: string;
  selected: string;
  correct: string;
  isCorrect: boolean;
};

const GROUP_SIZE = 20;

export default function QuizLessonGroupPage() {
  return <UserGate>{(user) => <QuizLessonGroupView user={user} />}</UserGate>;
}

function QuizLessonGroupView({ user }: { user: User }) {
  const params = useParams();
  const router = useRouter();
  const lessonId = Array.isArray(params.lessonId)
    ? params.lessonId[0]
    : params.lessonId;
  const groupIdParam = Array.isArray(params.groupId)
    ? params.groupId[0]
    : params.groupId;
  const parsedGroup = Number(groupIdParam ?? '1');
  const groupIndex = Number.isFinite(parsedGroup)
    ? Math.max(0, parsedGroup - 1)
    : 0;
  const locale = useLocale();
  const t = useTranslations();
  const [sessionWords, setSessionWords] = useState<Vocabulary[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [quizOptions, setQuizOptions] = useState<string[]>([]);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [showResults, setShowResults] = useState(false);
  const wordsCachePrefix = 'vocab-master-words:chapter:';
  const resumeKey =
    lessonId && groupIdParam
      ? `quiz-session:${lessonId}:group:${groupIdParam}`
      : '';

  const currentWord = sessionWords[currentIndex];

  const localizedTranslation = useCallback(
    (word?: Vocabulary | null) => {
      if (!word) return '';
      const translations = word.translations ?? {};
      return (
        translations[locale as 'en' | 'ru' | 'uz'] || word.translation || ''
      );
    },
    [locale],
  );

  const buildQuiz = useCallback(() => {
    if (!currentWord) return;
    const options = new Set<string>();
    options.add(localizedTranslation(currentWord));
    while (options.size < 4 && sessionWords.length > 1) {
      const randomWord =
        sessionWords[Math.floor(Math.random() * sessionWords.length)];
      options.add(localizedTranslation(randomWord));
    }
    setQuizOptions(Array.from(options).sort(() => Math.random() - 0.5));
  }, [currentWord, sessionWords, localizedTranslation]);

  useEffect(() => {
    if (currentWord) {
      buildQuiz();
      setSelectedOption(null);
    }
  }, [currentWord, buildQuiz]);

  useEffect(() => {
    async function loadSession() {
      if (!lessonId) return;
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
            }
          }`,
          { userId: user.id, chapterIds: [lessonId], limit: null },
        );
        words = data.sessionWords ?? [];
        localStorage.setItem(cacheKey, JSON.stringify(words));
      }
      if (words.length > 0 && words.some((word) => word.order != null)) {
        words = [...words].sort(
          (a, b) =>
            (a.order ?? Number.MAX_SAFE_INTEGER) -
            (b.order ?? Number.MAX_SAFE_INTEGER),
        );
      }
      const start = groupIndex * GROUP_SIZE;
      const groupWords = words.slice(start, start + GROUP_SIZE);
      let orderedWords = groupWords;
      let startIndex = 0;
      let restoredAnswers: Answer[] = [];
      let restoredShowResults = false;
      if (resumeKey) {
        const stored = localStorage.getItem(resumeKey);
        if (stored) {
          try {
            const parsed = JSON.parse(stored) as {
              index: number;
              orderIds: string[];
              answers: Answer[];
              showResults?: boolean;
            };
            const wordMap = new Map(groupWords.map((w) => [w.id, w]));
            const restored = parsed.orderIds
              .map((id) => wordMap.get(id))
              .filter(Boolean) as Vocabulary[];
            if (restored.length > 0) {
              orderedWords = restored;
              startIndex = Math.min(parsed.index ?? 0, restored.length - 1);
              restoredAnswers = parsed.answers ?? [];
              restoredShowResults = Boolean(parsed.showResults);
            }
          } catch {
            localStorage.removeItem(resumeKey);
          }
        }
      }
      setSessionWords(orderedWords);
      setCurrentIndex(startIndex);
      setAnswers(restoredAnswers);
      setShowResults(restoredShowResults);
    }
    loadSession();
  }, [lessonId, user.id, resumeKey, groupIndex]);

  useEffect(() => {
    if (!resumeKey || sessionWords.length === 0) return;
    const orderIds = sessionWords.map((word) => word.id);
    const payload = {
      index: currentIndex,
      orderIds,
      answers,
      showResults,
    };
    localStorage.setItem(resumeKey, JSON.stringify(payload));
  }, [resumeKey, sessionWords, currentIndex, answers, showResults]);

  useEffect(() => {
    if (!resumeKey || sessionWords.length === 0) return;
    const persist = () => {
      const orderIds = sessionWords.map((word) => word.id);
      const payload = {
        index: currentIndex,
        orderIds,
        answers,
        showResults,
      };
      localStorage.setItem(resumeKey, JSON.stringify(payload));
    };
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        persist();
      }
    };
    window.addEventListener('beforeunload', persist);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.removeEventListener('beforeunload', persist);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [resumeKey, sessionWords, currentIndex, answers, showResults]);

  async function handleAnswer(option: string) {
    if (!currentWord) return;
    if (selectedOption) return;
    setSelectedOption(option);
    const correct = option === localizedTranslation(currentWord);
    setAnswers((prev) => [
      ...prev,
      {
        wordId: currentWord.id,
        korean: currentWord.korean,
        selected: option,
        correct: localizedTranslation(currentWord),
        isCorrect: correct,
      },
    ]);
    setTimeout(() => {
      setCurrentIndex((prev) => Math.min(prev + 1, sessionWords.length - 1));
    }, 200);
  }

  function nextWord() {
    setCurrentIndex((prev) => Math.min(prev + 1, sessionWords.length - 1));
  }

  function prevWord() {
    setCurrentIndex((prev) => Math.max(prev - 1, 0));
  }

  async function finishQuiz() {
    if (!user) return;
    const payload = answers.map((answer) => ({
      wordId: answer.wordId,
      correct: answer.isCorrect,
    }));
    if (payload.length > 0) {
      await graphqlRequest<{ recordAnswers: boolean }>(
        `mutation RecordAnswers($userId: ID!, $answers: [AnswerInput!]!) {
          recordAnswers(userId: $userId, answers: $answers)
        }`,
        { userId: user.id, answers: payload },
      );
    }
    await graphqlRequest<{ completeSession: { wordsLearned: number } }>(
      `mutation Complete($userId: ID!) { completeSession(userId: $userId) { wordsLearned } }`,
      { userId: user.id },
    );
    setShowResults(true);
  }

  function resetQuiz() {
    if (resumeKey) {
      localStorage.removeItem(resumeKey);
    }
    router.push(`/${locale}/quiz/${lessonId}`);
  }

  return (
    <div className={cn(sessionWords.length > 0 ? 'space-y-0' : 'space-y-6')}>
      <header className="border-b rounded-lg bg-white px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <Button
            asChild
            variant="ghost"
            size="icon"
            aria-label={t('flashcards.back')}
          >
            <Link href={`/${locale}/quiz/${lessonId}`}>
              <ChevronLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div className="flex-1 text-center">
            <div className="text-sm font-semibold text-foreground">
              {t('quiz.title')}
            </div>
            <div className="text-xs text-muted-foreground">
              {sessionWords.length > 0
                ? t('quiz.questionCount', {
                    current: currentIndex + 1,
                    total: sessionWords.length,
                  })
                : t('quiz.startHint')}
            </div>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={resetQuiz}
            aria-label={t('quiz.reset')}
            className="bg-red-50 border-red-200 text-red-600"
          >
            <XCircle className="h-5 w-5 text-red-500" />
          </Button>
        </div>
      </header>

      <div className="p-4 space-y-4">
        {sessionWords.length === 0 ? (
          <div className="text-center text-sm text-muted-foreground">
            {t('flashcards.noWords')}
          </div>
        ) : showResults ? (
          <div className="space-y-3">
            <div className="text-sm text-muted-foreground">
              {t('quiz.results')}
            </div>
            <div className="rounded-lg border bg-white p-4">
              <div className="text-2xl font-semibold">
                {answers.filter((a) => a.isCorrect).length} / {answers.length}{' '}
                {t('quiz.correct')}
              </div>
            </div>
            <div className="space-y-2">
              {answers.map((a, index) => (
                <div
                  key={`${a.wordId}-${index}`}
                  className={`rounded-lg border p-3 text-sm ${
                    a.isCorrect ? 'bg-emerald-50' : 'bg-rose-50'
                  }`}
                >
                  <div
                    className={
                      a.isCorrect ? 'text-emerald-700' : 'text-rose-700'
                    }
                  >
                    {a.isCorrect ? t('quiz.correct') : t('quiz.incorrect')}
                  </div>
                  <div className="text-base font-semibold text-foreground">
                    {a.korean}
                  </div>
                  <div className="text-muted-foreground">
                    Your answer:{' '}
                    <span className="font-medium text-foreground">
                      {a.selected}
                    </span>
                  </div>
                  <div className="text-muted-foreground">
                    Correct:{' '}
                    <span className="font-semibold text-foreground">
                      {a.correct}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowResults(false)}>
                {t('quiz.backToQuiz')}
              </Button>
              <Button variant="secondary" onClick={resetQuiz}>
                {t('quiz.reset')}
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="rounded-xl border bg-white p-6 text-center text-2xl font-semibold shadow-md">
              {currentWord?.korean}
            </div>
            <div className="grid gap-2">
              {quizOptions.map((option) => {
                const isSelected = option === selectedOption;
                return (
                  <button
                    key={option}
                    className={`rounded-md border px-4 py-3 text-left text-sm ${
                      isSelected ? 'border-primary bg-primary/5' : 'bg-white'
                    }`}
                    onClick={() => handleAnswer(option)}
                    disabled={!!selectedOption}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={prevWord}
                disabled={currentIndex === 0}
              >
                {t('quiz.prev')}
              </Button>
              <Button
                variant="outline"
                onClick={nextWord}
                disabled={currentIndex === sessionWords.length - 1}
              >
                {t('quiz.next')}
              </Button>
              {currentIndex === sessionWords.length - 1 && selectedOption && (
                <Button onClick={finishQuiz}>{t('quiz.finish')}</Button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
