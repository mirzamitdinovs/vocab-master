"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { UserGate } from "@/components/user-gate";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { graphqlRequest } from "@/lib/graphql/client";

type Language = { id: string; title: string; order: number };

type Level = { id: string; languageId: string; title: string; order: number };

type Chapter = { id: string; levelId: string; title: string; order: number };

type Word = { id: string; chapterId: string; korean: string; translation: string; order: number };

type ChapterWithWords = { chapter: Chapter; words: Word[] };

type LevelBlock = { level: Level; chapters: ChapterWithWords[] };

type LanguageBlock = { language: Language; levels: LevelBlock[] };

export default function WordsPage() {
  return (
    <UserGate>
      {() => <WordsView />}
    </UserGate>
  );
}

function WordsView() {
  const [languages, setLanguages] = useState<Language[]>([]);
  const [levelsByLanguage, setLevelsByLanguage] = useState<Record<string, Level[]>>({});
  const [chaptersByLevel, setChaptersByLevel] = useState<Record<string, Chapter[]>>({});
  const [wordsByChapter, setWordsByChapter] = useState<Record<string, Word[]>>({});
  const [openChapter, setOpenChapter] = useState<string | undefined>(undefined);

  const fetchLanguages = useCallback(async () => {
    const data = await graphqlRequest<{ languages: Language[] }>(`query { languages { id title order } }`);
    setLanguages(data.languages);
  }, []);

  const fetchLevels = useCallback(async (languageId: string) => {
    const data = await graphqlRequest<{ levels: Level[] }>(
      `query Levels($languageId: ID!) { levels(languageId: $languageId) { id languageId title order } }`,
      { languageId }
    );
    setLevelsByLanguage((prev) => ({ ...prev, [languageId]: data.levels }));
  }, []);

  const fetchChapters = useCallback(async (levelId: string) => {
    const data = await graphqlRequest<{ chapters: Chapter[] }>(
      `query Chapters($levelId: ID!) { chapters(levelId: $levelId) { id levelId title order } }`,
      { levelId }
    );
    setChaptersByLevel((prev) => ({ ...prev, [levelId]: data.chapters }));
  }, []);

  const fetchWords = useCallback(async (chapterId: string) => {
    const data = await graphqlRequest<{ words: Word[] }>(
      `query Words($chapterId: ID!) { words(chapterId: $chapterId) { id chapterId korean translation order } }`,
      { chapterId }
    );
    setWordsByChapter((prev) => ({ ...prev, [chapterId]: data.words }));
  }, []);

  useEffect(() => {
    fetchLanguages();
  }, [fetchLanguages]);

  useEffect(() => {
    languages.forEach((language) => {
      fetchLevels(language.id);
    });
  }, [languages, fetchLevels]);

  useEffect(() => {
    Object.values(levelsByLanguage).flat().forEach((level) => {
      fetchChapters(level.id);
    });
  }, [levelsByLanguage, fetchChapters]);

  useEffect(() => {
    Object.values(chaptersByLevel).flat().forEach((chapter) => {
      fetchWords(chapter.id);
    });
  }, [chaptersByLevel, fetchWords]);

  const blocks = useMemo<LanguageBlock[]>(() => {
    return languages
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((language) => {
        const levels = (levelsByLanguage[language.id] ?? [])
          .slice()
          .sort((a, b) => a.order - b.order);
        return {
          language,
          levels: levels.map((level) => ({
            level,
            chapters: (chaptersByLevel[level.id] ?? [])
              .slice()
              .sort((a, b) => a.order - b.order)
              .map((chapter) => ({
                chapter,
                words: (wordsByChapter[chapter.id] ?? []).slice().sort((a, b) => a.order - b.order),
              })),
          })),
        };
      });
  }, [languages, levelsByLanguage, chaptersByLevel, wordsByChapter]);

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="heading-serif text-3xl font-semibold">Words</h1>
        <p className="text-muted-foreground">Browse lessons and words added by admin.</p>
      </header>

      {blocks.length === 0 ? (
        <Card className="glass">
          <CardContent className="p-6 text-sm text-muted-foreground">
            No languages yet.
          </CardContent>
        </Card>
      ) : (
        blocks.map((block) => (
          <Card key={block.language.id} className="glass">
            <CardHeader>
              <CardTitle>{block.language.title}</CardTitle>
              <CardDescription>Levels and lessons.</CardDescription>
            </CardHeader>
            <CardContent>
              {block.levels.map((level) => (
                <div key={level.level.id} className="mb-6 space-y-3">
                  <div className="text-sm font-semibold text-foreground">{level.level.title}</div>
                  <Accordion
                    type="single"
                    collapsible
                    value={openChapter}
                    onValueChange={(value) => setOpenChapter(value || undefined)}
                    className="space-y-3"
                  >
                    {level.chapters.map(({ chapter, words }) => (
                      <AccordionItem key={chapter.id} value={chapter.id} className="border-none">
                        <AccordionTrigger className="rounded-2xl border bg-white px-4 py-3 text-left">
                          <div className="flex w-full items-center justify-between gap-4">
                            <div>
                              <div className="text-sm text-muted-foreground">Lesson {chapter.order}</div>
                              <div className="text-base font-semibold text-foreground">{chapter.title}</div>
                            </div>
                            <div className="text-sm text-muted-foreground">{words.length} words</div>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="pt-3">
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead className="text-left text-muted-foreground">
                                <tr>
                                  <th className="py-2 pr-3 text-xs">#</th>
                                  <th className="py-2 pr-6 w-1/2">Korean</th>
                                  <th className="py-2 text-xs">Translation</th>
                                </tr>
                              </thead>
                              <tbody>
                                {words.map((word, index) => (
                                  <tr key={word.id} className="border-t">
                                    <td className="py-3 pr-3 text-xs text-muted-foreground">
                                      {word.order || index + 1}
                                    </td>
                                    <td className="py-3 pr-6 text-lg font-semibold w-1/2">
                                      {word.korean}
                                    </td>
                                    <td className="py-3 text-sm text-muted-foreground">
                                      {word.translation}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </div>
              ))}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
