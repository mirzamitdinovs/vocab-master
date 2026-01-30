"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { graphqlRequest } from "@/lib/graphql/client";

type User = {
  id: string;
  name: string;
  phone: string;
};

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

type ImportResult = {
  inserted: number;
  skipped: number;
  errors: string[];
};

type Mode = "flashcards" | "quiz" | "handwriting";

const STORAGE_KEY = "vocab-master-user";

export default function HomePage() {
  const [user, setUser] = useState<User | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [chapters, setChapters] = useState<string[]>([]);
  const [selectedChapters, setSelectedChapters] = useState<string[]>([]);
  const [limit, setLimit] = useState(20);
  const [frontLanguage, setFrontLanguage] = useState<"korean" | "translation">("korean");
  const [sessionWords, setSessionWords] = useState<Vocabulary[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showBack, setShowBack] = useState(false);

  const [mode, setMode] = useState<Mode>("flashcards");
  const [quizOptions, setQuizOptions] = useState<string[]>([]);
  const [quizAnswer, setQuizAnswer] = useState<string | null>(null);

  const [stats, setStats] = useState<UserStats | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      setLoadingUser(false);
      return;
    }

    const parsed = JSON.parse(stored) as User;
    graphqlRequest<{ user: User | null }>(
      `query User($id: ID) { user(id: $id) { id name phone } }`,
      { id: parsed.id }
    )
      .then((data) => {
        if (data.user) {
          setUser(data.user);
        } else {
          localStorage.removeItem(STORAGE_KEY);
        }
      })
      .catch(() => {
        localStorage.removeItem(STORAGE_KEY);
      })
      .finally(() => setLoadingUser(false));
  }, []);

  const fetchChapters = useCallback(
    async (userId: string) => {
      const data = await graphqlRequest<{ chapters: string[] }>(
        `query Chapters($userId: ID!) { chapters(userId: $userId) }`,
        { userId }
      );
      setChapters(data.chapters);
      if (data.chapters.length && selectedChapters.length === 0) {
        setSelectedChapters(data.chapters);
      }
    },
    [selectedChapters.length]
  );

  const fetchStats = useCallback(async (userId: string) => {
    const data = await graphqlRequest<{ stats: UserStats }>(
      `query Stats($userId: ID!) { stats(userId: $userId) { wordsLearned sessionsCompleted totalWords correctTotal incorrectTotal } }`,
      { userId }
    );
    setStats(data.stats);
  }, []);

  useEffect(() => {
    if (!user) return;
    fetchChapters(user.id);
    fetchStats(user.id);
  }, [user, fetchChapters, fetchStats]);

  useEffect(() => {
    if (mode !== "handwriting") return;
    clearCanvas();
  }, [mode, currentIndex]);

  const currentWord = sessionWords[currentIndex];

  const frontText = useMemo(() => {
    if (!currentWord) return "";
    return frontLanguage === "korean" ? currentWord.korean : currentWord.translation;
  }, [currentWord, frontLanguage]);

  const backText = useMemo(() => {
    if (!currentWord) return "";
    return frontLanguage === "korean" ? currentWord.translation : currentWord.korean;
  }, [currentWord, frontLanguage]);

  async function handleUserSubmit() {
    setError(null);
    if (!name.trim() || !phone.trim()) {
      setError("Name and phone are required.");
      return;
    }

    try {
      const data = await graphqlRequest<{ upsertUser: User }>(
        `mutation Upsert($name: String!, $phone: String!) {
          upsertUser(name: $name, phone: $phone) { id name phone }
        }`,
        { name: name.trim(), phone: phone.trim() }
      );
      setUser(data.upsertUser);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data.upsertUser));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create user.");
    }
  }

  function handleChapterToggle(chapter: string) {
    setSelectedChapters((prev) =>
      prev.includes(chapter) ? prev.filter((c) => c !== chapter) : [...prev, chapter]
    );
  }

  async function startSession() {
    if (!user) return;
    const data = await graphqlRequest<{ sessionWords: Vocabulary[] }>(
      `query SessionWords($userId: ID!, $chapters: [String!], $limit: Int) {
        sessionWords(userId: $userId, chapters: $chapters, limit: $limit) {
          id order korean translation chapter
        }
      }`,
      { userId: user.id, chapters: selectedChapters, limit }
    );
    const words = [...data.sessionWords].sort(() => Math.random() - 0.5);
    setSessionWords(words);
    setCurrentIndex(0);
    setShowBack(false);
    setQuizAnswer(null);
  }

  function nextWord() {
    setShowBack(false);
    setQuizAnswer(null);
    setCurrentIndex((prev) => Math.min(prev + 1, sessionWords.length - 1));
  }

  function prevWord() {
    setShowBack(false);
    setQuizAnswer(null);
    setCurrentIndex((prev) => Math.max(prev - 1, 0));
  }

  async function handleCompleteSession() {
    if (!user) return;
    await graphqlRequest<{ completeSession: UserStats }>(
      `mutation Complete($userId: ID!) {
        completeSession(userId: $userId) { wordsLearned sessionsCompleted totalWords correctTotal incorrectTotal }
      }`,
      { userId: user.id }
    );
    fetchStats(user.id);
  }

  async function handleRecordAnswer(correct: boolean) {
    if (!user || !currentWord) return;
    await graphqlRequest<{ recordAnswer: { id: string } }>(
      `mutation Record($userId: ID!, $wordId: ID!, $correct: Boolean!) {
        recordAnswer(userId: $userId, wordId: $wordId, correct: $correct) { id }
      }`,
      { userId: user.id, wordId: currentWord.id, correct }
    );
    fetchStats(user.id);
  }

  async function handleFileUpload(file: File | null) {
    setImportResult(null);
    if (!user || !file) return;
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setImportResult({
        inserted: 0,
        skipped: 0,
        errors: ["Only .csv files are allowed."],
      });
      return;
    }

    const csv = await file.text();

    const data = await graphqlRequest<{ importVocabulary: ImportResult }>(
      `mutation Import($userId: ID!, $csv: String!) {
        importVocabulary(userId: $userId, csv: $csv) {
          inserted skipped errors
        }
      }`,
      { userId: user.id, csv }
    );

    setImportResult(data.importVocabulary);
    await fetchChapters(user.id);
    await fetchStats(user.id);
  }

  function handleDragOver(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave() {
    setIsDragging(false);
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files?.[0] ?? null;
    handleFileUpload(file);
  }

  const buildQuiz = useCallback(() => {
    if (!currentWord) return;
    const options = new Set<string>();
    options.add(currentWord.translation);
    while (options.size < 4 && sessionWords.length > 1) {
      const randomWord = sessionWords[Math.floor(Math.random() * sessionWords.length)];
      options.add(randomWord.translation);
    }
    const shuffled = Array.from(options).sort(() => Math.random() - 0.5);
    setQuizOptions(shuffled);
  }, [currentWord, sessionWords]);

  function handleQuizAnswer(option: string) {
    if (!currentWord) return;
    const correct = option === currentWord.translation;
    setQuizAnswer(option);
    handleRecordAnswer(correct);
  }

  function clearCanvas() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  function startDraw(event: React.PointerEvent<HTMLCanvasElement>) {
    drawingRef.current = true;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#111827";
    ctx.beginPath();
    ctx.moveTo(event.nativeEvent.offsetX, event.nativeEvent.offsetY);
  }

  function draw(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.lineTo(event.nativeEvent.offsetX, event.nativeEvent.offsetY);
    ctx.stroke();
  }

  function endDraw() {
    drawingRef.current = false;
  }

  useEffect(() => {
    if (mode === "quiz" && sessionWords.length > 0) {
      buildQuiz();
    }
  }, [mode, currentIndex, sessionWords, buildQuiz]);

  if (loadingUser) {
    return <div className="text-sm text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
              Vocab Studio
            </p>
            <h1 className="heading-serif text-4xl font-semibold sm:text-5xl">
              Build memory with focus.
            </h1>
          </div>
          {user && (
            <div className="hidden sm:block text-right text-xs text-muted-foreground">
              <div className="font-semibold text-foreground">{user.name}</div>
              <div>{user.phone}</div>
            </div>
          )}
        </div>
        <p className="max-w-2xl text-muted-foreground">
          Upload a CSV, study flashcards, quiz yourself, and practice handwriting on mobile.
        </p>
      </header>

      {!user ? (
        <Card className="max-w-xl glass">
          <CardHeader>
            <CardTitle className="heading-serif text-2xl">Welcome in</CardTitle>
            <CardDescription>Enter your name and phone to continue.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && <div className="text-sm text-red-600">{error}</div>}
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Your name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="Phone number"
              />
            </div>
            <Button className="w-full" onClick={handleUserSubmit}>
              Continue
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          <Card className="card-sheen border-0 shadow-xl">
            <CardHeader>
              <CardTitle className="heading-serif text-2xl">
                Hello, {user.name}
              </CardTitle>
              <CardDescription>Phone: {user.phone}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="csv">Upload CSV</Label>
                <Input
                  id="csv"
                  type="file"
                  accept=".csv"
                  onChange={(event) => handleFileUpload(event.target.files?.[0] ?? null)}
                />
                <div
                  className={`flex flex-col items-center justify-center rounded-xl border border-dashed p-6 text-center transition ${
                    isDragging ? "border-primary bg-primary/5" : "border-border bg-white"
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <p className="text-sm text-muted-foreground">
                    Drag & drop a CSV here.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Required headers: order, korean, translation, chapter.
                  </p>
                </div>
              </div>
              {importResult && (
                <div className="rounded-md border border-muted bg-white p-3 text-sm">
                  {importResult.errors.length > 0 ? (
                    <div className="text-red-600">
                      {importResult.errors.map((err) => (
                        <div key={err}>{err}</div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-emerald-700">
                      Imported {importResult.inserted} rows, skipped {importResult.skipped}.
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="glass">
            <CardHeader>
              <CardTitle>Study setup</CardTitle>
              <CardDescription>Select chapters and mode.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 max-w-xs">
                <Label>Session size</Label>
                <Input
                  type="number"
                  min={1}
                  max={200}
                  value={limit}
                  onChange={(event) => setLimit(Number(event.target.value))}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {chapters.map((chapter) => (
                  <button
                    key={chapter}
                    className={`rounded-full border px-3 py-1 text-sm ${
                      selectedChapters.includes(chapter)
                        ? "bg-primary text-primary-foreground"
                        : "bg-white"
                    }`}
                    onClick={() => handleChapterToggle(chapter)}
                  >
                    {chapter}
                  </button>
                ))}
              </div>
              {chapters.length === 0 && (
                <p className="text-sm text-muted-foreground">No chapters yet. Upload a CSV.</p>
              )}
              <div className="flex flex-wrap gap-2">
                <Button variant={frontLanguage === "korean" ? "default" : "outline"} onClick={() => setFrontLanguage("korean")}>
                  Korean first
                </Button>
                <Button variant={frontLanguage === "translation" ? "default" : "outline"} onClick={() => setFrontLanguage("translation")}>
                  Translation first
                </Button>
                <Button variant="secondary" onClick={startSession}>
                  Start session
                </Button>
              </div>
              <div className="hidden flex-wrap gap-2 sm:flex">
                <Button variant={mode === "flashcards" ? "default" : "outline"} onClick={() => setMode("flashcards")}>
                  Flashcards
                </Button>
                <Button variant={mode === "quiz" ? "default" : "outline"} onClick={() => setMode("quiz")}>
                  Quiz
                </Button>
                <Button variant={mode === "handwriting" ? "default" : "outline"} onClick={() => setMode("handwriting")}>
                  Handwriting
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="glass">
            <CardHeader>
              <CardTitle>Study</CardTitle>
              <CardDescription>
                {sessionWords.length > 0
                  ? `Word ${currentIndex + 1} of ${sessionWords.length}`
                  : "Start a session to begin."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {sessionWords.length === 0 ? (
                <p className="text-sm text-muted-foreground">No session words loaded.</p>
              ) : (
                <div className="space-y-4">
                  {mode === "flashcards" && (
                    <div
                      className="cursor-pointer rounded-2xl border bg-white p-12 text-center text-3xl font-semibold shadow-lg"
                      onClick={() => setShowBack((prev) => !prev)}
                    >
                      {showBack ? backText : frontText}
                      <div className="mt-4 text-sm text-muted-foreground">Tap to flip</div>
                    </div>
                  )}

                  {mode === "quiz" && currentWord && (
                    <div className="space-y-4">
                      <div className="rounded-xl border bg-white p-6 text-center text-2xl font-semibold shadow-md">
                        {currentWord.korean}
                      </div>
                      <div className="grid gap-2">
                        {quizOptions.map((option) => {
                          const isCorrect = option === currentWord.translation;
                          const isSelected = option === quizAnswer;
                          return (
                            <button
                              key={option}
                              className={`rounded-md border px-4 py-3 text-left text-sm ${
                                isSelected
                                  ? isCorrect
                                    ? "border-emerald-500 bg-emerald-50"
                                    : "border-red-500 bg-red-50"
                                  : "bg-white"
                              }`}
                              onClick={() => handleQuizAnswer(option)}
                            >
                              {option}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {mode === "handwriting" && currentWord && (
                    <div className="space-y-4">
                      <div className="rounded-xl border bg-white p-6 text-center text-2xl font-semibold shadow-md">
                        {currentWord.korean}
                      </div>
                      <canvas
                        ref={canvasRef}
                        width={320}
                        height={240}
                        className="w-full rounded-xl border bg-white shadow-inner"
                        onPointerDown={startDraw}
                        onPointerMove={draw}
                        onPointerUp={endDraw}
                        onPointerLeave={endDraw}
                      />
                      <Button variant="outline" onClick={clearCanvas}>
                        Clear
                      </Button>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" onClick={prevWord} disabled={currentIndex === 0}>
                      Previous
                    </Button>
                    <Button variant="outline" onClick={nextWord} disabled={currentIndex === sessionWords.length - 1}>
                      Next
                    </Button>
                    <Button variant="secondary" onClick={() => handleRecordAnswer(true)}>
                      Mark correct
                    </Button>
                    <Button variant="destructive" onClick={() => handleRecordAnswer(false)}>
                      Mark incorrect
                    </Button>
                    {currentIndex === sessionWords.length - 1 && (
                      <Button onClick={handleCompleteSession}>Complete session</Button>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="glass">
            <CardHeader>
              <CardTitle>Stats</CardTitle>
              <CardDescription>Your progress so far.</CardDescription>
            </CardHeader>
            <CardContent>
              {stats ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-lg border bg-white p-4">
                    <div className="text-sm text-muted-foreground">Total words</div>
                    <div className="text-2xl font-semibold">{stats.totalWords}</div>
                  </div>
                  <div className="rounded-lg border bg-white p-4">
                    <div className="text-sm text-muted-foreground">Words learned</div>
                    <div className="text-2xl font-semibold">{stats.wordsLearned}</div>
                  </div>
                  <div className="rounded-lg border bg-white p-4">
                    <div className="text-sm text-muted-foreground">Sessions completed</div>
                    <div className="text-2xl font-semibold">{stats.sessionsCompleted}</div>
                  </div>
                  <div className="rounded-lg border bg-white p-4">
                    <div className="text-sm text-muted-foreground">Correct / Incorrect</div>
                    <div className="text-2xl font-semibold">
                      {stats.correctTotal} / {stats.incorrectTotal}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">No stats yet.</div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {user && (
        <nav className="fixed inset-x-0 bottom-0 z-50 border-t bg-white/90 backdrop-blur sm:hidden">
          <div className="mx-auto flex max-w-5xl items-center justify-around px-4 py-3 text-xs">
            <button
              className={`flex flex-col items-center gap-1 ${
                mode === "flashcards" ? "text-primary" : "text-muted-foreground"
              }`}
              onClick={() => setMode("flashcards")}
            >
              <span className="text-lg">🃏</span>
              Flashcards
            </button>
            <button
              className={`flex flex-col items-center gap-1 ${
                mode === "quiz" ? "text-primary" : "text-muted-foreground"
              }`}
              onClick={() => setMode("quiz")}
            >
              <span className="text-lg">✅</span>
              Quiz
            </button>
            <button
              className={`flex flex-col items-center gap-1 ${
                mode === "handwriting" ? "text-primary" : "text-muted-foreground"
              }`}
              onClick={() => setMode("handwriting")}
            >
              <span className="text-lg">✍️</span>
              Write
            </button>
          </div>
        </nav>
      )}
    </div>
  );
}
