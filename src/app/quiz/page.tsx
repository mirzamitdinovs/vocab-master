"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { UserGate, type User } from "@/components/user-gate";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SessionStarter } from "@/components/session-starter";
import { graphqlRequest } from "@/lib/graphql/client";

type Vocabulary = {
  id: string;
  order?: number | null;
  korean: string;
  translation: string;
  chapter: string;
};

type Mark = "correct" | "incorrect" | null;

export default function QuizPage() {
  return (
    <UserGate>
      {(user) => <QuizView user={user} />}
    </UserGate>
  );
}

function QuizView({ user }: { user: User }) {
  const [sessionWords, setSessionWords] = useState<Vocabulary[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [quizOptions, setQuizOptions] = useState<string[]>([]);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [mark, setMark] = useState<Mark>(null);
  const [answers, setAnswers] = useState<
    { wordId: string; korean: string; selected: string; correct: string; isCorrect: boolean }[]
  >([]);
  const [showResults, setShowResults] = useState(false);

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
      setMark(null);
    }
  }, [currentWord, buildQuiz]);

  async function startSession(chapters: string[], limit: number) {
    const data = await graphqlRequest<{ sessionWords: Vocabulary[] }>(
      `query SessionWords($userId: ID!, $chapters: [String!], $limit: Int) {
        sessionWords(userId: $userId, chapters: $chapters, limit: $limit) {
          id order korean translation chapter
        }
      }`,
      { userId: user.id, chapters, limit }
    );
    const words = [...data.sessionWords].sort(() => Math.random() - 0.5);
    setSessionWords(words);
    setCurrentIndex(0);
    setAnswers([]);
    setShowResults(false);
  }

  async function handleAnswer(option: string) {
    if (!currentWord) return;
    if (selectedOption) return;
    setSelectedOption(option);
    const correct = option === currentWord.translation;
    setMark(correct ? "correct" : "incorrect");
    setAnswers((prev) => [
      ...prev,
      {
        wordId: currentWord.id,
        korean: currentWord.korean,
        selected: option,
        correct: currentWord.translation,
        isCorrect: correct,
      },
    ]);
    await graphqlRequest<{ recordAnswer: { id: string } }>(
      `mutation Record($userId: ID!, $wordId: ID!, $correct: Boolean!) {
        recordAnswer(userId: $userId, wordId: $wordId, correct: $correct) { id }
      }`,
      { userId: user.id, wordId: currentWord.id, correct }
    );
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

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="heading-serif text-3xl font-semibold">Quiz</h1>
        <p className="text-muted-foreground">Multiple-choice questions.</p>
      </header>

      <Card className="glass">
        <CardHeader>
          <CardTitle>Session setup</CardTitle>
          <CardDescription>Select topics and size.</CardDescription>
        </CardHeader>
        <CardContent>
          <SessionStarter userId={user.id} onStart={startSession} />
        </CardContent>
      </Card>

      <Card className="glass">
        <CardHeader>
          <CardTitle>Quiz</CardTitle>
          <CardDescription>
            {sessionWords.length > 0
              ? `Question ${currentIndex + 1} of ${sessionWords.length}`
              : "Start a session to begin."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {sessionWords.length === 0 ? (
            <p className="text-sm text-muted-foreground">No session words loaded.</p>
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
                  <Button onClick={() => setShowResults(true)}>Finish quiz</Button>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
