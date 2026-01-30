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

type UserStats = {
  wordsLearned: number;
  sessionsCompleted: number;
  totalWords: number;
  correctTotal: number;
  incorrectTotal: number;
};

type Step = 1 | 2 | 3;

type Mark = "correct" | "incorrect" | null;

export default function FlashcardsPage() {
  return (
    <UserGate>
      {(user) => <FlashcardsView user={user} />}
    </UserGate>
  );
}

function FlashcardsView({ user }: { user: User }) {
  const [frontLanguage, setFrontLanguage] = useState<"korean" | "translation">("korean");
  const [sessionWords, setSessionWords] = useState<Vocabulary[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showBack, setShowBack] = useState(false);
  const [step, setStep] = useState<Step>(1);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [mark, setMark] = useState<Mark>(null);

  const fetchStats = useCallback(async () => {
    const data = await graphqlRequest<{ stats: UserStats }>(
      `query Stats($userId: ID!) { stats(userId: $userId) { wordsLearned sessionsCompleted totalWords correctTotal incorrectTotal } }`,
      { userId: user.id }
    );
    setStats(data.stats);
  }, [user.id]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const currentWord = sessionWords[currentIndex];

  const frontText = useMemo(() => {
    if (!currentWord) return "";
    return frontLanguage === "korean" ? currentWord.korean : currentWord.translation;
  }, [currentWord, frontLanguage]);

  const backText = useMemo(() => {
    if (!currentWord) return "";
    return frontLanguage === "korean" ? currentWord.translation : currentWord.korean;
  }, [currentWord, frontLanguage]);

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
    setShowBack(false);
    setMark(null);
    setStep(2);
  }

  async function handleRecordAnswer(correct: boolean) {
    if (!currentWord) return;
    setMark(correct ? "correct" : "incorrect");
    await graphqlRequest<{ recordAnswer: { id: string } }>(
      `mutation Record($userId: ID!, $wordId: ID!, $correct: Boolean!) {
        recordAnswer(userId: $userId, wordId: $wordId, correct: $correct) { id }
      }`,
      { userId: user.id, wordId: currentWord.id, correct }
    );
    fetchStats();
  }

  async function handleCompleteSession() {
    await graphqlRequest<{ completeSession: UserStats }>(
      `mutation Complete($userId: ID!) {
        completeSession(userId: $userId) { wordsLearned sessionsCompleted totalWords correctTotal incorrectTotal }
      }`,
      { userId: user.id }
    );
    fetchStats();
    setStep(3);
  }

  function nextWord() {
    setShowBack(false);
    setMark(null);
    setCurrentIndex((prev) => Math.min(prev + 1, sessionWords.length - 1));
  }

  function prevWord() {
    setShowBack(false);
    setMark(null);
    setCurrentIndex((prev) => Math.max(prev - 1, 0));
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="heading-serif text-3xl font-semibold">Flashcards</h1>
        <p className="text-muted-foreground">Study with a focused session.</p>
      </header>

      <Card className="glass">
        <CardHeader>
          <CardTitle>Step {step} of 3</CardTitle>
          <CardDescription>
            {step === 1 && "Choose session size and chapters."}
            {step === 2 && "Review flashcards and mark answers."}
            {step === 3 && "Session summary."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
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
                    className={frontLanguage === "translation" ? "bg-amber-100 text-amber-700" : ""}
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
            <div className="space-y-6">
              {sessionWords.length === 0 ? (
                <p className="text-sm text-muted-foreground">No session words loaded.</p>
              ) : (
                <>
                  <div className="text-sm text-muted-foreground">
                    Word {currentIndex + 1} of {sessionWords.length}
                  </div>
                  <div
                    className="cursor-pointer rounded-2xl border bg-white p-12 text-center text-3xl font-semibold shadow-lg"
                    onClick={() => setShowBack((prev) => !prev)}
                  >
                    {showBack ? backText : frontText}
                    <div className="mt-4 text-sm text-muted-foreground">Tap to flip</div>
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
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant={mark === "correct" ? "default" : "secondary"}
                      className="bg-emerald-100 text-emerald-700"
                      onClick={() => handleRecordAnswer(true)}
                    >
                      Mark correct
                    </Button>
                    <Button
                      variant={mark === "incorrect" ? "secondary" : "outline"}
                      className="bg-rose-100 text-rose-700"
                      onClick={() => handleRecordAnswer(false)}
                    >
                      Mark incorrect
                    </Button>
                  </div>
                  {currentIndex === sessionWords.length - 1 && (
                    <Button className="w-full" onClick={handleCompleteSession}>
                      Finish session
                    </Button>
                  )}
                </>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <p className="text-muted-foreground">Session complete.</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg border bg-white p-4">
                  <div className="text-sm text-muted-foreground">Words learned</div>
                  <div className="text-2xl font-semibold">{stats?.wordsLearned ?? 0}</div>
                </div>
                <div className="rounded-lg border bg-white p-4">
                  <div className="text-sm text-muted-foreground">Sessions completed</div>
                  <div className="text-2xl font-semibold">{stats?.sessionsCompleted ?? 0}</div>
                </div>
              </div>
              <Button variant="outline" onClick={() => setStep(1)}>
                Start another session
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
