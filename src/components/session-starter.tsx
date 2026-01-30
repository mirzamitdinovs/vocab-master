"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { graphqlRequest } from "@/lib/graphql/client";

export function SessionStarter({
  userId,
  onStart,
  label = "Start session",
}: {
  userId: string;
  onStart: (chapterIds: string[], limit?: number | null) => void;
  label?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [languages, setLanguages] = useState<{ id: string; title: string }[]>([]);
  const [levels, setLevels] = useState<{ id: string; title: string }[]>([]);
  const [chapters, setChapters] = useState<{ id: string; title: string }[]>([]);
  const [languageId, setLanguageId] = useState("");
  const [levelId, setLevelId] = useState("");
  const [chapterId, setChapterId] = useState("");

  useEffect(() => {
    async function loadLanguages() {
      const data = await graphqlRequest<{ languages: { id: string; title: string }[] }>(
        `query { languages { id title } }`
      );
      setLanguages(data.languages);
      if (data.languages[0]) {
        setLanguageId(data.languages[0].id);
      }
    }
    loadLanguages();
  }, []);

  useEffect(() => {
    async function loadLevels() {
      if (!languageId) return;
      const data = await graphqlRequest<{ levels: { id: string; title: string }[] }>(
        `query Levels($languageId: ID!) { levels(languageId: $languageId) { id title } }`,
        { languageId }
      );
      setLevels(data.levels);
      if (data.levels[0]) {
        setLevelId(data.levels[0].id);
      }
    }
    loadLevels();
  }, [languageId]);

  useEffect(() => {
    async function loadChapters() {
      if (!levelId) return;
      const data = await graphqlRequest<{ chapters: { id: string; title: string }[] }>(
        `query Chapters($levelId: ID!) { chapters(levelId: $levelId) { id title } }`,
        { levelId }
      );
      setChapters(data.chapters);
      if (data.chapters[0]) {
        setChapterId(data.chapters[0].id);
      }
    }
    loadChapters();
  }, [levelId]);

  async function start() {
    if (!chapterId) return;
    setLoading(true);
    onStart([chapterId], null);
    setLoading(false);
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-2">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Language
          </div>
          <select
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={languageId}
            onChange={(event) => setLanguageId(event.target.value)}
          >
            {languages.map((language) => (
              <option key={language.id} value={language.id}>
                {language.title}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Level
          </div>
          <select
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={levelId}
            onChange={(event) => setLevelId(event.target.value)}
          >
            {levels.map((level) => (
              <option key={level.id} value={level.id}>
                {level.title}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Lesson
          </div>
          <select
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={chapterId}
            onChange={(event) => setChapterId(event.target.value)}
          >
            {chapters.map((chapter) => (
              <option key={chapter.id} value={chapter.id}>
                {chapter.title}
              </option>
            ))}
          </select>
        </div>
      </div>
      <Button
        className="w-full h-12 text-base bg-gradient-to-r from-blue-500 to-indigo-500 text-white hover:opacity-90"
        onClick={start}
        disabled={loading || !chapterId}
      >
        {loading ? "Loading..." : label}
      </Button>
    </div>
  );
}
