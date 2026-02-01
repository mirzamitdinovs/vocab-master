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
import { useTranslations } from "next-intl";

export const LANGUAGE_STORAGE_KEY = "vocab-master-language";
export const LEVEL_STORAGE_KEY = "vocab-master-level";
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

type Language = { id: string; key: string; value: string };

export function LearningLanguage({
  mode = "dialog",
}: {
  mode?: "dialog" | "inline";
}) {
  const t = useTranslations();
  const [languages, setLanguages] = useState<Language[]>([]);
  const [languageId, setLanguageId] = useState("");
  const [pendingLanguageId, setPendingLanguageId] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadLanguages() {
      try {
        setLoading(true);
        setError(null);
        const data = await graphqlRequest<{ languages: Language[] }>(
          `query { languages { id key value } }`,
        );
        setLanguages(data.languages);
        const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
        const fallback = data.languages[0]?.id ?? "";
        const next =
          stored && data.languages.some((language) => language.id === stored)
            ? stored
            : fallback;
        setLanguageId(next);
        setPendingLanguageId(next);
        if (next) {
          localStorage.setItem(LANGUAGE_STORAGE_KEY, next);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : t("learning.noLanguages"));
      } finally {
        setLoading(false);
      }
    }
    loadLanguages();
  }, [t]);

  useEffect(() => {
    if (!drawerOpen) return;
    setPendingLanguageId(languageId);
  }, [drawerOpen, languageId]);

  const selected = languages.find((language) => language.id === languageId);

  function applyUpdate() {
    if (!pendingLanguageId || pendingLanguageId === languageId) {
      setDrawerOpen(false);
      return;
    }
    setLanguageId(pendingLanguageId);
    localStorage.setItem(LANGUAGE_STORAGE_KEY, pendingLanguageId);
    localStorage.removeItem(LEVEL_STORAGE_KEY);
    clearCachedWords();
    window.dispatchEvent(new Event("learning-language-updated"));
    setDrawerOpen(false);
  }

  return (
    <div className="space-y-2">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {t("learning.learningLanguage")}
      </div>
      {error ? (
        <div className="rounded-xl border border-dashed p-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {mode === "inline" ? (
        <div className="space-y-2">
          {languages.length === 0 && !loading ? (
            <div className="rounded-xl border border-dashed p-3 text-sm text-muted-foreground">
              {t("learning.noLanguages")}
            </div>
          ) : (
            languages.map((language) => (
              <Button
                key={language.id}
                variant={language.id === languageId ? "secondary" : "ghost"}
                className="w-full justify-start text-base"
                onClick={() => {
                  setLanguageId(language.id);
                  setPendingLanguageId(language.id);
                  localStorage.setItem(LANGUAGE_STORAGE_KEY, language.id);
                  localStorage.removeItem(LEVEL_STORAGE_KEY);
                  clearCachedWords();
                  window.dispatchEvent(new Event("learning-language-updated"));
                }}
              >
                {language.value}
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
              disabled={loading || languages.length === 0}
            >
            {loading ? t("session.loading") : selected?.value ?? t("learning.selectLanguage")}
          </Button>
        </DialogTrigger>
          <DialogContent className="left-1/2 top-auto bottom-0 w-full max-w-none translate-x-[-50%] translate-y-0 rounded-t-2xl sm:max-w-lg sm:rounded-lg">
            <DialogHeader>
            <DialogTitle>{t("learning.selectLanguage")}</DialogTitle>
          </DialogHeader>
          <div className="max-h-[70vh] space-y-2 overflow-y-auto">
            {languages.length === 0 && !loading ? (
              <div className="rounded-xl border border-dashed p-3 text-sm text-muted-foreground">
                {t("learning.noLanguages")}
              </div>
            ) : (
                languages.map((language) => (
                  <Button
                    key={language.id}
                    variant={
                      language.id === pendingLanguageId ? "secondary" : "ghost"
                    }
                    className="w-full justify-start text-base"
                    onClick={() => setPendingLanguageId(language.id)}
                  >
                    {language.value}
                  </Button>
                ))
              )}
            </div>
            <div className="pt-2">
              <Button
                className="w-full h-12 text-base"
              onClick={applyUpdate}
              disabled={!pendingLanguageId || pendingLanguageId === languageId}
            >
              {t("learning.updateLanguage")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      )}
    </div>
  );
}
