"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { graphqlRequest } from "@/lib/graphql/client";

export function SessionStarter({
  userId,
  onStart,
  label = "Start session",
}: {
  userId: string;
  onStart: (chapters: string[], limit: number) => void;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [chapters, setChapters] = useState<string[]>([]);
  const [selectedChapters, setSelectedChapters] = useState<string[]>([]);
  const [limit, setLimit] = useState<number | null>(null);

  const fetchChapters = useCallback(async () => {
    const data = await graphqlRequest<{ chapters: string[] }>(
      `query Chapters($userId: ID!) { chapters(userId: $userId) }`,
      { userId }
    );
    setChapters(data.chapters);
    if (data.chapters.length && selectedChapters.length === 0) {
      setSelectedChapters([data.chapters[0]]);
    }
  }, [userId, selectedChapters.length]);

  useEffect(() => {
    if (open) fetchChapters();
  }, [open, fetchChapters]);

  function toggleChapter(chapter: string) {
    setSelectedChapters((prev) =>
      prev.includes(chapter) ? prev.filter((c) => c !== chapter) : [...prev, chapter]
    );
  }

  function start() {
    if (!limit || selectedChapters.length === 0) return;
    onStart(selectedChapters, limit);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full h-12 text-base bg-gradient-to-r from-blue-500 to-indigo-500 text-white hover:opacity-90">
          {label}
        </Button>
      </DialogTrigger>
      <DialogContent className="left-1/2 top-auto bottom-0 w-full max-w-none translate-x-[-50%] translate-y-0 rounded-t-2xl sm:max-w-lg sm:rounded-lg">
        <DialogHeader>
          <DialogTitle>Start a session</DialogTitle>
          <DialogDescription>Select topics then choose word count.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <div className="text-sm font-medium mb-2">Topics</div>
            <div className="flex flex-wrap gap-2">
              {chapters.map((chapter) => (
                <button
                  key={chapter}
                  className={`rounded-full border px-3 py-1 text-sm transition ${
                    selectedChapters.includes(chapter)
                      ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                      : "bg-white"
                  }`}
                  onClick={() => toggleChapter(chapter)}
                >
                  {chapter}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="text-sm font-medium mb-2">Word count</div>
            <div className="flex gap-2">
              {[5, 10, 20].map((count) => (
                <button
                  key={count}
                  className={`rounded-full border px-4 py-2 text-sm transition ${
                    limit === count
                      ? "bg-purple-100 text-purple-700 border-purple-200"
                      : "bg-white"
                  }`}
                  onClick={() => setLimit(count)}
                >
                  {count}
                </button>
              ))}
            </div>
          </div>
          <Button
            className="w-full h-12 text-base bg-gradient-to-r from-fuchsia-500 to-pink-500 text-white hover:opacity-90"
            onClick={start}
            disabled={!limit || selectedChapters.length === 0}
          >
            Start
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
