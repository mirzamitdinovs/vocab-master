'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { UserGate, type User } from '@/components/user-gate';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { SessionStarter } from '@/components/session-starter';
import { graphqlRequest } from '@/lib/graphql/client';

type Vocabulary = {
  id: string;
  order?: number | null;
  korean: string;
  translation: string;
};

type UserStats = {
  wordsLearned: number;
  sessionsCompleted: number;
  totalWords: number;
  correctTotal: number;
  incorrectTotal: number;
};

type Step = 1 | 2 | 3;

type Mark = 'correct' | 'incorrect' | null;

export default function FlashcardsPage() {
  return <UserGate>{(user) => <FlashcardsView user={user} />}</UserGate>;
}

function FlashcardsView({ user }: { user: User }) {
  const storageKey = `flashcards-session-${user.id}`;
  const [lessonTitle, setLessonTitle] = useState<string | null>(null);
  const [frontLanguage, setFrontLanguage] = useState<'korean' | 'translation'>(
    'korean',
  );
  const [sessionWords, setSessionWords] = useState<Vocabulary[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showBack, setShowBack] = useState(false);
  const [step, setStep] = useState<Step>(1);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [mark, setMark] = useState<Mark>(null);
  const [answersMap, setAnswersMap] = useState<Record<string, boolean>>({});
  const [sessionOrder, setSessionOrder] = useState<string[]>([]);
  const [direction, setDirection] = useState<'next' | 'prev'>('next');

  const fetchStats = useCallback(async () => {
    const data = await graphqlRequest<{ stats: UserStats }>(
      `query Stats($userId: ID!) { stats(userId: $userId) { wordsLearned sessionsCompleted totalWords correctTotal incorrectTotal } }`,
      { userId: user.id },
    );
    setStats(data.stats);
  }, [user.id]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    const stored = localStorage.getItem(storageKey);
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored) as Record<string, boolean>;
      setAnswersMap(parsed);
    } catch {
      localStorage.removeItem(storageKey);
    }
  }, [storageKey]);

  const currentWord = sessionWords[currentIndex];

  const frontText = useMemo(() => {
    if (!currentWord) return '';
    return frontLanguage === 'korean'
      ? currentWord.korean
      : currentWord.translation;
  }, [currentWord, frontLanguage]);

  const backText = useMemo(() => {
    if (!currentWord) return '';
    return frontLanguage === 'korean'
      ? currentWord.translation
      : currentWord.korean;
  }, [currentWord, frontLanguage]);

  async function startSession(
    chapterIds: string[],
    limit?: number | null,
    chapterTitle?: string,
  ) {
    const data = await graphqlRequest<{ sessionWords: Vocabulary[] }>(
      `query SessionWords($userId: ID!, $chapterIds: [ID!]!, $limit: Int) {
        sessionWords(userId: $userId, chapterIds: $chapterIds, limit: $limit) {
          id order korean translation
        }
      }`,
      { userId: user.id, chapterIds, limit },
    );
    const words = [...data.sessionWords].sort(() => Math.random() - 0.5);
    setSessionWords(words);
    setSessionOrder(words.map((word) => word.id));
    setCurrentIndex(0);
    setShowBack(false);
    setMark(null);
    setLessonTitle(chapterTitle ?? null);
    setStep(2);
    setAnswersMap({});
    localStorage.removeItem(storageKey);
  }

  function handleRecordAnswer(correct: boolean) {
    if (!currentWord) return;
    setAnswersMap((prev) => {
      const existing = prev[currentWord.id];
      const shouldClear = existing === correct;
      const next = { ...prev };
      if (shouldClear) {
        delete next[currentWord.id];
        setMark(null);
      } else {
        next[currentWord.id] = correct;
        setMark(correct ? 'correct' : 'incorrect');
      }
      localStorage.setItem(storageKey, JSON.stringify(next));
      return next;
    });
  }

  async function handleCompleteSession() {
    const answers = Object.entries(answersMap).map(([wordId, correct]) => ({
      wordId,
      correct,
    }));
    if (answers.length > 0) {
      await graphqlRequest<{ recordAnswers: boolean }>(
        `mutation RecordAnswers($userId: ID!, $answers: [AnswerInput!]!) {
          recordAnswers(userId: $userId, answers: $answers)
        }`,
        { userId: user.id, answers },
      );
    }
    await graphqlRequest<{ completeSession: UserStats }>(
      `mutation Complete($userId: ID!) {
        completeSession(userId: $userId) { wordsLearned sessionsCompleted totalWords correctTotal incorrectTotal }
      }`,
      { userId: user.id },
    );
    fetchStats();
    localStorage.removeItem(storageKey);
    setStep(3);
  }

  function nextWord() {
    setShowBack(false);
    setMark(null);
    setDirection('next');
    setCurrentIndex((prev) => Math.min(prev + 1, sessionWords.length - 1));
  }

  function prevWord() {
    setShowBack(false);
    setMark(null);
    setDirection('prev');
    setCurrentIndex((prev) => Math.max(prev - 1, 0));
  }

  return (
    <div className="space-y-6">
      <header className={`space-y-2 ${step === 2 ? "hidden" : ""}`}>
        <h1 className="heading-serif text-3xl font-semibold">Flashcards</h1>
        <p className="text-muted-foreground">Study with a focused session.</p>
      </header>

      <Card
        className={`glass ${
          step === 2 || step === 3
            ? "fixed inset-x-0 top-2 z-40 mx-2 flex h-[calc(100%-9.5rem)] flex-col rounded-3xl border bg-white sm:static sm:m-0 sm:h-auto sm:rounded-3xl sm:border"
            : ""
        }`}
      >
        <CardHeader className={step !== 1 ? "hidden" : ""}>
          <CardTitle>Step {step} of 3</CardTitle>
          <CardDescription>
            {step === 1 && "Choose session size and chapters."}
            {step === 2 && "Review flashcards and mark answers."}
            {step === 3 && "Session summary."}
          </CardDescription>
        </CardHeader>
        <CardContent className={`space-y-6 ${step === 2 ? "flex-1" : ""}`}>
          {step === 1 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="text-sm font-medium">Front language</div>
                <div className="flex gap-2">
                  <Button
                    className={frontLanguage === "korean" ? "bg-sky-100 text-sky-700" : ""}
                    variant={frontLanguage === "korean" ? "secondary" : "outline"}
                    onClick={() => setFrontLanguage("korean")}
                  >
                    Korean first
                  </Button>
                  <Button
                    className={
                      frontLanguage === "translation" ? "bg-amber-100 text-amber-700" : ""
                    }
                    variant={frontLanguage === "translation" ? "secondary" : "outline"}
                    onClick={() => setFrontLanguage("translation")}
                  >
                    Translation first
                  </Button>
                </div>
              </div>
              <SessionStarter userId={user.id} onStart={startSession} />
            </div>
          )}

          {step === 2 && (
            <div className="flex h-full flex-col space-y-4 sm:space-y-6">
              {sessionWords.length === 0 ? (
                <p className="text-sm text-muted-foreground">No session words loaded.</p>
              ) : (
                <>
                  <div className="space-y-1 pt-10 sm:hidden">
                    {lessonTitle && (
                      <div className="text-base font-semibold text-foreground">{lessonTitle}</div>
                    )}
                    <div className="text-sm text-muted-foreground">
                      Word {currentIndex + 1} of {sessionWords.length}
                    </div>
                  </div>
                  <div className="hidden sm:flex items-center justify-between pt-10 text-base text-muted-foreground">
                    <div className="font-semibold text-foreground">{lessonTitle ?? "Lesson"}</div>
                    <div>
                      Word {currentIndex + 1} of {sessionWords.length}
                    </div>
                  </div>
                  <div
                    className="relative flex flex-1 flex-col items-center justify-center rounded-2xl border bg-white px-6 py-8 text-center shadow-lg sm:p-12"
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
                      className="absolute inset-y-0 left-0 w-1/2 rounded-l-2xl"
                      onClick={prevWord}
                      aria-label="Previous card"
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 w-1/2 rounded-r-2xl"
                      onClick={nextWord}
                      aria-label="Next card"
                    />
                    <button
                      type="button"
                      onClick={() => setShowBack((prev) => !prev)}
                      className="relative z-10 flex flex-col items-center justify-center text-center rounded-2xl px-6 py-6"
                    >
                      <div
                        key={currentWord?.id}
                        className={`text-7xl font-semibold transition-all duration-300 sm:text-8xl ${
                          direction === "next"
                            ? "animate-in slide-in-from-right-6 fade-in"
                            : "animate-in slide-in-from-left-6 fade-in"
                        }`}
                      >
                        {showBack ? backText : frontText}
                      </div>
                      <div className="mt-4 text-sm text-muted-foreground">Tap word to flip</div>
                    </button>
                  </div>
                  <div className="hidden gap-2 sm:flex">
                    <Button variant="outline" onClick={prevWord} disabled={currentIndex === 0}>
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      onClick={nextWord}
                      disabled={currentIndex === sessionWords.length - 1}
                    >
                      Next
                    </Button>
                  </div>
                  <div className="hidden sm:flex w-full justify-end gap-2 mt-auto">
                    <Button
                      variant="outline"
                      className={`border-emerald-400 text-emerald-700 bg-transparent hover:bg-transparent ${
                        mark === "correct"
                          ? "!bg-emerald-100 !text-emerald-800 !border-emerald-400"
                          : "bg-transparent"
                      }`}
                      onClick={() => handleRecordAnswer(true)}
                    >
                      Mark correct
                    </Button>
                    <Button
                      variant="outline"
                      className={`border-rose-400 text-rose-700 bg-transparent hover:bg-transparent ${
                        mark === "incorrect"
                          ? "!bg-rose-100 !text-rose-800 !border-rose-400"
                          : "bg-transparent"
                      }`}
                      onClick={() => handleRecordAnswer(false)}
                    >
                      Mark incorrect
                    </Button>
                    <Button variant="outline" onClick={handleCompleteSession}>
                      End session
                    </Button>
                  </div>
                  <div className="space-y-2 sm:hidden mt-auto">
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        className={`w-full border-emerald-400 text-emerald-700 bg-transparent hover:bg-transparent ${
                          mark === "correct"
                            ? "!bg-emerald-100 !text-emerald-800 !border-emerald-400"
                            : "bg-transparent"
                        }`}
                        onClick={() => handleRecordAnswer(true)}
                      >
                        Mark correct
                      </Button>
                      <Button
                        variant="outline"
                        className={`w-full border-rose-400 text-rose-700 bg-transparent hover:bg-transparent ${
                          mark === "incorrect"
                            ? "!bg-rose-100 !text-rose-800 !border-rose-400"
                            : "bg-transparent"
                        }`}
                        onClick={() => handleRecordAnswer(false)}
                      >
                        Mark incorrect
                      </Button>
                    </div>
                    <Button className="w-full" variant="outline" onClick={handleCompleteSession}>
                      End session
                    </Button>
                  </div>
                  {currentIndex === sessionWords.length - 1 && (
                    <Button className="hidden w-full sm:inline-flex" onClick={handleCompleteSession}>
                      Finish session
                    </Button>
                  )}
                </>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="text-base font-semibold text-foreground">Session Words</div>
              <div className="max-h-[calc(100vh-12rem)] space-y-2 overflow-y-auto pr-1">
                {sessionOrder.length > 0
                  ? sessionOrder.map((wordId, index) => {
                      const word = sessionWords.find((w) => w.id === wordId);
                      if (!word) return null;
                      const status = answersMap[word.id];
                      const rowClass =
                        status === true
                          ? "border-emerald-200 bg-emerald-50"
                          : status === false
                          ? "border-rose-200 bg-rose-50"
                          : "border-muted bg-white";
                      return (
                        <div
                          key={word.id}
                          className={`flex items-center justify-between rounded-xl border px-4 py-3 text-sm ${rowClass}`}
                        >
                          <div className="text-xs text-muted-foreground">{index + 1}</div>
                          <div className="flex-1 px-4 text-lg font-semibold text-foreground">
                            {word.korean}
                          </div>
                          <div className="text-sm text-muted-foreground">{word.translation}</div>
                        </div>
                      );
                    })
                  : sessionWords.map((word, index) => {
                      const status = answersMap[word.id];
                      const rowClass =
                        status === true
                          ? "border-emerald-200 bg-emerald-50"
                          : status === false
                          ? "border-rose-200 bg-rose-50"
                          : "border-muted bg-white";
                      return (
                        <div
                          key={word.id}
                          className={`flex items-center justify-between rounded-xl border px-4 py-3 text-sm ${rowClass}`}
                        >
                          <div className="text-xs text-muted-foreground">{index + 1}</div>
                          <div className="flex-1 px-4 text-lg font-semibold text-foreground">
                            {word.korean}
                          </div>
                          <div className="text-sm text-muted-foreground">{word.translation}</div>
                        </div>
                      );
                    })}
              </div>
              <Button variant="outline" onClick={() => setStep(1)}>
                Start session
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
