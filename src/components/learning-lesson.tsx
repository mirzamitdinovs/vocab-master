"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { graphqlRequest } from "@/lib/graphql/client";
import { LEVEL_STORAGE_KEY } from "@/components/learning-language";
import { useLocale, useTranslations } from "next-intl";

type LocalizedText =
  | string
  | { en?: string | null; ru?: string | null; uz?: string | null }
  | null
  | undefined;

type Chapter = { id: string; title: LocalizedText };

const RESUME_PREFIX = "flashcards-session:";

export function LearningLesson({
  onChange,
  mode = "dialog",
}: {
  onChange?: (chapter: Chapter | null) => void;
  mode?: "dialog" | "inline";
}) {
  const t = useTranslations();
  const locale = useLocale();
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [chapterId, setChapterId] = useState("");
  const [pendingChapterId, setPendingChapterId] = useState("");
  const [levelId, setLevelId] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    function syncLevel() {
      const stored = localStorage.getItem(LEVEL_STORAGE_KEY) ?? "";
      setLevelId(stored);
    }
    syncLevel();
    window.addEventListener("learning-topic-updated", syncLevel);
    return () => window.removeEventListener("learning-topic-updated", syncLevel);
  }, []);

  useEffect(() => {
    async function loadChapters() {
      if (!levelId) {
        setChapters([]);
        setChapterId("");
        setPendingChapterId("");
        if (onChangeRef.current) onChangeRef.current(null);
        return;
      }
      try {
        setLoading(true);
        setError(null);
        const data = await graphqlRequest<{ chapters: Chapter[] }>(
          `query Chapters($levelId: ID!) { chapters(levelId: $levelId) { id title } }`,
          { levelId },
        );
        setChapters(data.chapters);
        const resumed = data.chapters.find((chapter) =>
          localStorage.getItem(`${RESUME_PREFIX}${chapter.id}`),
        );
        const next = resumed?.id ?? data.chapters[0]?.id ?? "";
        setChapterId(next);
        setPendingChapterId(next);
      } catch (err) {
        setError(err instanceof Error ? err.message : t("learning.noTopics"));
      } finally {
        setLoading(false);
      }
    }
    loadChapters();
  }, [levelId, t]);

  useEffect(() => {
    const selected = chapters.find((chapter) => chapter.id === chapterId) ?? null;
    if (onChangeRef.current) onChangeRef.current(selected);
  }, [chapterId, chapters]);

  useEffect(() => {
    if (!drawerOpen) return;
    setPendingChapterId(chapterId);
  }, [drawerOpen, chapterId]);

  const selected = chapters.find((chapter) => chapter.id === chapterId);

  const resolveTitle = (value: LocalizedText) => {
    if (!value) return "";
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
        try {
          const parsed = JSON.parse(trimmed) as {
            en?: string | null;
            ru?: string | null;
            uz?: string | null;
          };
          return (
            parsed[locale as "en" | "ru" | "uz"] ||
            parsed.en ||
            parsed.ru ||
            parsed.uz ||
            value
          );
        } catch {
          return value;
        }
      }
      return value;
    }
    return (
      value[locale as "en" | "ru" | "uz"] ||
      value.en ||
      value.ru ||
      value.uz ||
      ""
    );
  };

  const isDisabled = !levelId;

  function applyUpdate() {
    if (!pendingChapterId || pendingChapterId === chapterId) {
      setDrawerOpen(false);
      return;
    }
    setChapterId(pendingChapterId);
    setDrawerOpen(false);
  }

  return (
    <div className="space-y-2">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {t("session.lesson")}
      </div>
      {error ? (
        <div className="rounded-xl border border-dashed p-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {mode === "inline" ? (
        <div className="space-y-2">
          {isDisabled ? (
            <div className="rounded-xl border border-dashed p-3 text-sm text-muted-foreground">
              {t("session.selectTopicFirst")}
            </div>
          ) : chapters.length === 0 && !loading ? (
            <div className="rounded-xl border border-dashed p-3 text-sm text-muted-foreground">
              {t("session.selectLesson")}
            </div>
          ) : (
            chapters.map((chapter) => (
              <Button
                key={chapter.id}
                variant={chapter.id === chapterId ? "secondary" : "ghost"}
                className="w-full justify-start text-base"
                onClick={() => {
                  setChapterId(chapter.id);
                  setPendingChapterId(chapter.id);
                }}
              >
                {resolveTitle(chapter.title)}
              </Button>
            ))
          )}
        </div>
      ) : (
        <Dialog open={drawerOpen} onOpenChange={setDrawerOpen}>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              className="w-full h-12 justify-between text-base"
              disabled={isDisabled}
            >
              {isDisabled
                ? t("session.selectTopicFirst")
                : loading
                  ? t("session.loading")
                  : resolveTitle(selected?.title) ?? t("session.selectLesson")}
            </Button>
          </DialogTrigger>
          <DialogContent className="left-1/2 top-auto bottom-0 w-full max-w-none translate-x-[-50%] translate-y-0 rounded-t-2xl sm:max-w-lg sm:rounded-lg">
            <DialogHeader>
              <DialogTitle>{t("session.selectLesson")}</DialogTitle>
            </DialogHeader>
            <div className="max-h-[70vh] space-y-2 overflow-y-auto">
              {chapters.length === 0 && !loading ? (
                <div className="rounded-xl border border-dashed p-3 text-sm text-muted-foreground">
                  {t("session.selectLesson")}
                </div>
              ) : (
                chapters.map((chapter) => (
                  <Button
                    key={chapter.id}
                    variant={
                      chapter.id === pendingChapterId ? "secondary" : "ghost"
                    }
                    className="w-full justify-start text-base"
                    onClick={() => setPendingChapterId(chapter.id)}
                  >
                    {resolveTitle(chapter.title)}
                  </Button>
                ))
              )}
            </div>
            <div className="pt-2">
              <Button
                className="w-full h-12 text-base"
                onClick={applyUpdate}
                disabled={!pendingChapterId || pendingChapterId === chapterId}
              >
                {t("session.updateLesson")}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
