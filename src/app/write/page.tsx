"use client";

import { useEffect, useRef, useState } from "react";
import { UserGate, type User } from "@/components/user-gate";
import { Button } from "@/components/ui/button";
import { SessionStarter } from "@/components/session-starter";
import { graphqlRequest } from "@/lib/graphql/client";

type Vocabulary = {
  id: string;
  order?: number | null;
  korean: string;
  translation: string;
  chapter: string;
};

export default function WritePage() {
  return (
    <UserGate>
      {(user) => <WriteView user={user} />}
    </UserGate>
  );
}

function WriteView({ user }: { user: User }) {
  const [sessionWords, setSessionWords] = useState<Vocabulary[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const currentWord = sessionWords[currentIndex];

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
    clearCanvas();
    setStep(2);
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

  function nextWord() {
    clearCanvas();
    setCurrentIndex((prev) => {
      const next = Math.min(prev + 1, sessionWords.length - 1);
      if (next === sessionWords.length - 1 && prev === sessionWords.length - 1) {
        setStep(3);
      }
      return next;
    });
  }

  function prevWord() {
    clearCanvas();
    setCurrentIndex((prev) => Math.max(prev - 1, 0));
  }

  return (
    <div className="fixed inset-0 flex flex-col bg-background">
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-4 px-4 pt-6 pb-24 sm:px-6">
        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <div className="text-sm text-muted-foreground">Step {step} of 3</div>
        </div>

        {step === 1 && (
          <div className="rounded-2xl border bg-white p-4 shadow-sm">
            <SessionStarter userId={user.id} onStart={startSession} />
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-1 flex-col gap-4">
            <div className="rounded-xl border bg-white p-4 text-center text-2xl font-semibold shadow-sm">
              {currentWord ? currentWord.korean : "Start a session"}
            </div>
            <canvas
              ref={canvasRef}
              width={340}
              height={360}
              className="h-full w-full flex-1 rounded-2xl border bg-white shadow-inner touch-none"
              onPointerDown={startDraw}
              onPointerMove={draw}
              onPointerUp={endDraw}
              onPointerLeave={endDraw}
            />
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
              <Button variant="outline" onClick={clearCanvas}>
                Clear
              </Button>
              {currentIndex === sessionWords.length - 1 && (
                <Button onClick={() => setStep(3)}>Finish</Button>
              )}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="rounded-2xl border bg-white p-6 shadow-sm space-y-4">
            <div className="text-lg font-semibold">Session complete</div>
            <p className="text-sm text-muted-foreground">
              Great work! You can start another handwriting session anytime.
            </p>
            <Button variant="outline" onClick={() => setStep(1)}>
              Start another session
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
