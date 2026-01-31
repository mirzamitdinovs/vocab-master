"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { User } from "@/components/user-gate";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { graphqlRequest } from "@/lib/graphql/client";

type Vocabulary = {
  id: string;
  order?: number | null;
  korean: string;
  translation: string;
};


export default function QuizPage() {
  return <QuizView />;
}

function QuizView() {
  const [user, setUser] = useState<User | null>(null);
  const storageKey = `quiz-session-${user?.id ?? "guest"}`;
  const [autoStarted, setAutoStarted] = useState(false);
  const [sessionWords, setSessionWords] = useState<Vocabulary[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [quizOptions, setQuizOptions] = useState<string[]>([]);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [answers, setAnswers] = useState<
    { wordId: string; korean: string; selected: string; correct: string; isCorrect: boolean }[]
  >([]);
  const [showResults, setShowResults] = useState(false);
  const [loadingLesson, setLoadingLesson] = useState(false);

  const currentWord = sessionWords[currentIndex];

  const buildQuiz = useCallback(() => {
    if (!currentWord) return;
    const options = new Set<string>();
    options.add(currentWord.translation);
    while (options.size < 4 && sessionWords.length > 1) {
      const randomWord = sessionWords[Math.floor(Math.random() * sessionWords.length)];
      options.add(randomWord.translation);
    }
    setQuizOptions(Array.from(options).sort(() => Math.random() - 0.5));
  }, [currentWord, sessionWords]);

  useEffect(() => {
    if (currentWord) {
      buildQuiz();
      setSelectedOption(null);
    }
  }, [currentWord, buildQuiz]);

  useEffect(() => {
    const stored = localStorage.getItem(storageKey);
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored) as {
        wordId: string;
        korean: string;
        selected: string;
        correct: string;
        isCorrect: boolean;
      }[];
      setAnswers(parsed);
    } catch {
      localStorage.removeItem(storageKey);
    }
  }, [storageKey]);

  useEffect(() => {
    const stored = sessionStorage.getItem("vocab-master-user");
    if (stored) {
      try {
        setUser(JSON.parse(stored) as User);
        return;
      } catch {
        sessionStorage.removeItem("vocab-master-user");
      }
    }
    async function createGuest() {
      const data = await graphqlRequest<{ upsertUser: User }>(
        `mutation Upsert($name: String!, $phone: String!) {
          upsertUser(name: $name, phone: $phone) { id name phone isAdmin }
        }`,
        { name: "Guest", phone: "guest-quiz" }
      );
      sessionStorage.setItem("vocab-master-user", JSON.stringify(data.upsertUser));
      window.dispatchEvent(new Event("user-updated"));
      setUser(data.upsertUser);
    }
    createGuest();
  }, []);

  async function startSession(chapterIds: string[], limit?: number | null) {
    if (!user) return;
    const data = await graphqlRequest<{ sessionWords: Vocabulary[] }>(
      `query SessionWords($userId: ID!, $chapterIds: [ID!]!, $limit: Int) {
        sessionWords(userId: $userId, chapterIds: $chapterIds, limit: $limit) {
          id order korean translation
        }
      }`,
      { userId: user.id, chapterIds, limit }
    );
    const words = [...data.sessionWords].sort(() => Math.random() - 0.5);
    setSessionWords(words);
    setCurrentIndex(0);
    setAnswers([]);
    setShowResults(false);
    localStorage.removeItem(storageKey);
  }

  async function handleAnswer(option: string) {
    if (!currentWord) return;
    if (selectedOption) return;
    setSelectedOption(option);
    const correct = option === currentWord.translation;
    setAnswers((prev) => {
      const next = [
        ...prev,
        {
          wordId: currentWord.id,
          korean: currentWord.korean,
          selected: option,
          correct: currentWord.translation,
          isCorrect: correct,
        },
      ];
      localStorage.setItem(storageKey, JSON.stringify(next));
      return next;
    });
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
        { userId: user.id, answers: payload }
      );
    }
    await graphqlRequest<{ completeSession: { wordsLearned: number } }>(
      `mutation Complete($userId: ID!) { completeSession(userId: $userId) { wordsLearned } }`,
      { userId: user.id }
    );
    localStorage.removeItem(storageKey);
    setShowResults(true);
  }

  useEffect(() => {
    if (!user || autoStarted) return;
    async function autoStart() {
      setLoadingLesson(true);
      const languagesData = await graphqlRequest<{ languages: { id: string }[] }>(
        `query { languages { id } }`
      );
      const languageId = languagesData.languages[0]?.id;
      if (!languageId) {
        setLoadingLesson(false);
        return;
      }
      const levelsData = await graphqlRequest<{ levels: { id: string }[] }>(
        `query Levels($languageId: ID!) { levels(languageId: $languageId) { id } }`,
        { languageId }
      );
      const levelId = levelsData.levels[0]?.id;
      if (!levelId) {
        setLoadingLesson(false);
        return;
      }
      const chaptersData = await graphqlRequest<{ chapters: { id: string }[] }>(
        `query Chapters($levelId: ID!) { chapters(levelId: $levelId) { id } }`,
        { levelId }
      );
      const chapterId = chaptersData.chapters[0]?.id;
      if (!chapterId) {
        setLoadingLesson(false);
        return;
      }
      await startSession([chapterId], null);
      setAutoStarted(true);
      setLoadingLesson(false);
    }
    autoStart();
  }, [user, autoStarted]);

  return (
    <div className={sessionWords.length > 0 ? "space-y-0" : "space-y-6"}>
      {sessionWords.length === 0 && (
        <header className="space-y-2">
          <h1 className="heading-serif text-3xl font-semibold">Quiz</h1>
          <p className="text-muted-foreground">Multiple-choice questions.</p>
        </header>
      )}

      <Card
        className={`glass ${
          sessionWords.length > 0
            ? "fixed inset-0 z-50 m-3 flex h-[calc(100%-1.5rem)] flex-col rounded-3xl border bg-white sm:static sm:m-0 sm:h-auto sm:rounded-3xl sm:border"
            : ""
        }`}
      >
        <CardHeader>
          <CardTitle>Quiz</CardTitle>
          <CardDescription>
            {sessionWords.length > 0
              ? `Question ${currentIndex + 1} of ${sessionWords.length}`
              : "Start a session to begin."}
          </CardDescription>
        </CardHeader>
        <CardContent className={`space-y-4 ${sessionWords.length > 0 ? "flex-1" : ""}`}>
          {sessionWords.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {loadingLesson ? "Loading quiz..." : "No session words loaded."}
            </p>
          ) : showResults ? (
            <div className="space-y-3">
              <div className="text-sm text-muted-foreground">Results</div>
              <div className="rounded-lg border bg-white p-4">
                <div className="text-2xl font-semibold">
                  {answers.filter((a) => a.isCorrect).length} / {answers.length} correct
                </div>
              </div>
              <div className="space-y-2">
                {answers.map((a, index) => (
                  <div
                    key={`${a.wordId}-${index}`}
                    className={`rounded-lg border p-3 text-sm ${
                      a.isCorrect ? "bg-emerald-50" : "bg-rose-50"
                    }`}
                  >
                    <div className={a.isCorrect ? "text-emerald-700" : "text-rose-700"}>
                      {a.isCorrect ? "Correct" : "Incorrect"}
                    </div>
                    <div className="text-base font-semibold text-foreground">{a.korean}</div>
                    <div className="text-muted-foreground">
                      Your answer: <span className="font-medium text-foreground">{a.selected}</span>
                    </div>
                    <div className="text-muted-foreground">
                      Correct: <span className="font-semibold text-foreground">{a.correct}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowResults(false)}>
                  Back to quiz
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setShowResults(false);
                    setCurrentIndex(0);
                    setAnswers([]);
                    localStorage.removeItem(storageKey);
                  }}
                >
                  Start over
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
                        isSelected ? "border-primary bg-primary/5" : "bg-white"
                      }`}
                      onClick={() => handleAnswer(option)}
                      disabled={!!selectedOption}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>
              <div className="flex gap-2">
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
                {currentIndex === sessionWords.length - 1 && selectedOption && (
                  <Button onClick={finishQuiz}>Finish quiz</Button>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
