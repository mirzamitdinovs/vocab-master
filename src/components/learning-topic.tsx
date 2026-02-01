"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { graphqlRequest } from "@/lib/graphql/client";
import { LANGUAGE_STORAGE_KEY, LEVEL_STORAGE_KEY } from "@/components/learning-language";
import { useLocale, useTranslations } from "next-intl";

type LocalizedText =
  | string
  | { en?: string | null; ru?: string | null; uz?: string | null }
  | null
  | undefined;

type Level = { id: string; title: LocalizedText };
const WORDS_CACHE_PREFIX = "vocab-master-words:chapter:";

function clearCachedWords() {
  if (typeof localStorage === "undefined") return;
  for (let i = localStorage.length - 1; i >= 0; i -= 1) {
    const key = localStorage.key(i);
    if (key && key.startsWith(WORDS_CACHE_PREFIX)) {
      localStorage.removeItem(key);
    }
  }
}

export function LearningTopic({
  mode = "dialog",
}: {
  mode?: "dialog" | "inline";
}) {
  const t = useTranslations();
  const [levels, setLevels] = useState<Level[]>([]);
  const [levelId, setLevelId] = useState("");
  const [pendingLevelId, setPendingLevelId] = useState("");
  const [languageId, setLanguageId] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const locale = useLocale();

  useEffect(() => {
    function syncLanguage() {
      const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY) ?? "";
      setLanguageId(stored);
    }
    syncLanguage();
    window.addEventListener("learning-language-updated", syncLanguage);
    return () =>
      window.removeEventListener("learning-language-updated", syncLanguage);
  }, []);

  useEffect(() => {
    async function loadLevels() {
      if (!languageId) {
        setLevels([]);
        setLevelId("");
        setPendingLevelId("");
        return;
      }
      try {
        setLoading(true);
        setError(null);
        const data = await graphqlRequest<{ levels: Level[] }>(
          `query Levels($languageId: ID!) { levels(languageId: $languageId) { id title } }`,
          { languageId },
        );
        setLevels(data.levels);
        const stored = localStorage.getItem(LEVEL_STORAGE_KEY);
        const fallback = data.levels[0]?.id ?? "";
        const next =
          stored && data.levels.some((level) => level.id === stored)
            ? stored
            : fallback;
        setLevelId(next);
        setPendingLevelId(next);
        if (next) {
          localStorage.setItem(LEVEL_STORAGE_KEY, next);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : t("learning.noTopics"));
      } finally {
        setLoading(false);
      }
    }
    loadLevels();
  }, [languageId, t]);

  useEffect(() => {
    if (!drawerOpen) return;
    setPendingLevelId(levelId);
  }, [drawerOpen, levelId]);

  const selected = levels.find((level) => level.id === levelId);

  const resolveTitle = (value: LocalizedText) => {
    if (!value) return '';
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
        try {
          const parsed = JSON.parse(trimmed) as {
            en?: string | null;
            ru?: string | null;
            uz?: string | null;
          };
          return (
            parsed[locale as 'en' | 'ru' | 'uz'] ||
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
      value[locale as 'en' | 'ru' | 'uz'] ||
      value.en ||
      value.ru ||
      value.uz ||
      ''
    );
  };
  const isDisabled = !languageId;

  function applyUpdate() {
    if (!pendingLevelId || pendingLevelId === levelId) {
      setDrawerOpen(false);
      return;
    }
    setLevelId(pendingLevelId);
    localStorage.setItem(LEVEL_STORAGE_KEY, pendingLevelId);
    clearCachedWords();
    window.dispatchEvent(new Event("learning-topic-updated"));
    setDrawerOpen(false);
  }

  return (
    <div className="space-y-2">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {t("learning.topic")}
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
              {t("learning.selectLanguageFirst")}
            </div>
          ) : levels.length === 0 && !loading ? (
            <div className="rounded-xl border border-dashed p-3 text-sm text-muted-foreground">
              {t("learning.noTopics")}
            </div>
          ) : (
            levels.map((level) => (
              <Button
                key={level.id}
                variant={level.id === levelId ? "secondary" : "ghost"}
                className="w-full justify-start text-base"
                onClick={() => {
                  setLevelId(level.id);
                  setPendingLevelId(level.id);
                  localStorage.setItem(LEVEL_STORAGE_KEY, level.id);
                  clearCachedWords();
                  window.dispatchEvent(new Event("learning-topic-updated"));
                }}
              >
                {resolveTitle(level.title)}
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
                ? t("learning.selectLanguageFirst")
                : loading
                  ? t("session.loading")
                  : resolveTitle(selected?.title) ?? t("learning.selectTopic")}
            </Button>
          </DialogTrigger>
          <DialogContent className="left-1/2 top-auto bottom-0 w-full max-w-none translate-x-[-50%] translate-y-0 rounded-t-2xl sm:max-w-lg sm:rounded-lg">
            <DialogHeader>
              <DialogTitle>{t("learning.selectTopic")}</DialogTitle>
            </DialogHeader>
            <div className="max-h-[70vh] space-y-2 overflow-y-auto">
              {levels.length === 0 && !loading ? (
                <div className="rounded-xl border border-dashed p-3 text-sm text-muted-foreground">
                  {t("learning.noTopics")}
                </div>
              ) : (
                levels.map((level) => (
                  <Button
                    key={level.id}
                    variant={level.id === pendingLevelId ? "secondary" : "ghost"}
                    className="w-full justify-start text-base"
                    onClick={() => setPendingLevelId(level.id)}
                  >
                    {resolveTitle(level.title)}
                  </Button>
                ))
              )}
            </div>
            <div className="pt-2">
              <Button
              className="w-full h-12 text-base"
              onClick={applyUpdate}
              disabled={!pendingLevelId || pendingLevelId === levelId}
            >
              {t("learning.updateTopic")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      )}
    </div>
  );
}
