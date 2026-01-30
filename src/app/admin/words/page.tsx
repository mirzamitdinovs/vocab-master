"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminGate } from "@/components/admin-gate";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { graphqlRequest } from "@/lib/graphql/client";
import { Pencil, Trash2 } from "lucide-react";

type Language = { id: string; title: string };

type Level = { id: string; languageId: string; title: string };

type Chapter = { id: string; levelId: string; title: string; order: number };

type Word = {
  id: string;
  chapterId: string;
  korean: string;
  translation: string;
  order: number;
};

type ImportResult = { inserted: number; skipped: number; errors: string[] };

export default function AdminWordsPage() {
  return (
    <AdminGate>
      {(user) => <WordsView userId={user.id} />}
    </AdminGate>
  );
}

function WordsView({ userId }: { userId: string }) {
  const [languages, setLanguages] = useState<Language[]>([]);
  const [levels, setLevels] = useState<Level[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [words, setWords] = useState<Word[]>([]);
  const [languageId, setLanguageId] = useState("");
  const [levelId, setLevelId] = useState("");
  const [chapterId, setChapterId] = useState("");
  const [korean, setKorean] = useState("");
  const [translation, setTranslation] = useState("");
  const [order, setOrder] = useState(0);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingWord, setEditingWord] = useState<Word | null>(null);
  const [editKorean, setEditKorean] = useState("");
  const [editTranslation, setEditTranslation] = useState("");
  const [editChapterOpen, setEditChapterOpen] = useState(false);
  const [editingChapter, setEditingChapter] = useState<Chapter | null>(null);
  const [editChapterTitle, setEditChapterTitle] = useState("");
  const [editChapterOrder, setEditChapterOrder] = useState(0);

  const fetchLanguages = useCallback(async () => {
    try {
      setError(null);
      const data = await graphqlRequest<{ languages: Language[] }>(
        `query { languages { id title } }`
      );
      setLanguages(data.languages);
      if (!languageId && data.languages.length > 0) {
        setLanguageId(data.languages[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load languages.");
    }
  }, [languageId]);

  const fetchLevels = useCallback(async () => {
    if (!languageId) return;
    try {
      setError(null);
      const data = await graphqlRequest<{ levels: Level[] }>(
        `query Levels($languageId: ID!) { levels(languageId: $languageId) { id languageId title } }`,
        { languageId }
      );
      setLevels(data.levels);
      if (!levelId && data.levels.length > 0) {
        setLevelId(data.levels[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load levels.");
    }
  }, [languageId, levelId]);

  const fetchChapters = useCallback(async () => {
    if (!levelId) return;
    try {
      setError(null);
      const data = await graphqlRequest<{ chapters: Chapter[] }>(
        `query Chapters($levelId: ID!) { chapters(levelId: $levelId) { id levelId title order } }`,
        { levelId }
      );
      setChapters(data.chapters);
      if (!chapterId && data.chapters.length > 0) {
        setChapterId(data.chapters[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load chapters.");
    }
  }, [levelId, chapterId]);

  const fetchWords = useCallback(async () => {
    if (!chapterId) return;
    try {
      setError(null);
      const data = await graphqlRequest<{ words: Word[] }>(
        `query Words($chapterId: ID!) { words(chapterId: $chapterId) { id chapterId korean translation order } }`,
        { chapterId }
      );
      setWords(data.words);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load words.");
    }
  }, [chapterId]);

  useEffect(() => {
    fetchLanguages();
  }, [fetchLanguages]);

  useEffect(() => {
    fetchLevels();
  }, [fetchLevels]);

  useEffect(() => {
    fetchChapters();
  }, [fetchChapters]);

  useEffect(() => {
    fetchWords();
  }, [fetchWords]);

  async function handleCreate() {
    if (!chapterId || !korean.trim() || !translation.trim()) return;
    await graphqlRequest<{ createWord: Word }>(
      `mutation Create($userId: ID!, $chapterId: ID!, $korean: String!, $translation: String!, $order: Int) {
        createWord(userId: $userId, chapterId: $chapterId, korean: $korean, translation: $translation, order: $order) { id }
      }`,
      { userId, chapterId, korean: korean.trim(), translation: translation.trim(), order }
    );
    setKorean("");
    setTranslation("");
    setOrder(0);
    setOpen(false);
    fetchWords();
  }

  async function handleDelete(wordId: string) {
    await graphqlRequest<{ deleteWord: boolean }>(
      `mutation Delete($userId: ID!, $wordId: ID!) { deleteWord(userId: $userId, wordId: $wordId) }`,
      { userId, wordId }
    );
    fetchWords();
  }

  async function handleDeleteChapter(targetId: string) {
    await graphqlRequest<{ deleteChapter: boolean }>(
      `mutation Delete($userId: ID!, $chapterId: ID!) { deleteChapter(userId: $userId, chapterId: $chapterId) }`,
      { userId, chapterId: targetId }
    );
    if (chapterId === targetId) {
      setChapterId("");
    }
    fetchChapters();
  }

  async function handleEditSave() {
    if (!editingWord || !editKorean.trim() || !editTranslation.trim()) return;
    await graphqlRequest<{ updateWord: Word }>(
      `mutation Update($userId: ID!, $wordId: ID!, $korean: String!, $translation: String!, $order: Int) {
        updateWord(userId: $userId, wordId: $wordId, korean: $korean, translation: $translation, order: $order) { id }
      }`,
      {
        userId,
        wordId: editingWord.id,
        korean: editKorean.trim(),
        translation: editTranslation.trim(),
        order: editingWord.order,
      }
    );
    setEditOpen(false);
    setEditingWord(null);
    fetchWords();
  }

  async function handleEditChapterSave() {
    if (!editingChapter || !editChapterTitle.trim()) return;
    await graphqlRequest<{ updateChapter: Chapter }>(
      `mutation Update($userId: ID!, $chapterId: ID!, $title: String!, $order: Int) {
        updateChapter(userId: $userId, chapterId: $chapterId, title: $title, order: $order) { id }
      }`,
      {
        userId,
        chapterId: editingChapter.id,
        title: editChapterTitle.trim(),
        order: editChapterOrder,
      }
    );
    setEditChapterOpen(false);
    setEditingChapter(null);
    fetchChapters();
  }

  async function handleUpload(file: File | null) {
    setImportResult(null);
    if (!file || !chapterId) return;
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setImportResult({ inserted: 0, skipped: 0, errors: ["Only .csv files are allowed."] });
      return;
    }
    const csv = await file.text();
    const data = await graphqlRequest<{ importWords: ImportResult }>(
      `mutation Import($userId: ID!, $chapterId: ID!, $csv: String!) {
        importWords(userId: $userId, chapterId: $chapterId, csv: $csv) { inserted skipped errors }
      }`,
      { userId, chapterId, csv }
    );
    setImportResult(data.importWords);
    fetchWords();
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <h1 className="heading-serif text-3xl font-semibold">Words</h1>
            <p className="text-muted-foreground">Add words to a topic.</p>
          </div>
          <Button className="md:hidden" onClick={() => setOpen(true)}>
            Add word
          </Button>
        </div>
      </header>

      <Card className="glass hidden md:block">
        <CardHeader>
          <CardTitle>Add word</CardTitle>
          <CardDescription>Create or upload words for a topic.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && <div className="text-sm text-red-600">{error}</div>}
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Language</Label>
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
              <Label>Level</Label>
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
              <Label>Chapter</Label>
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
            <div className="space-y-2">
              <Label>Order</Label>
              <Input type="number" value={order} onChange={(event) => setOrder(Number(event.target.value))} />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Korean</Label>
              <Input value={korean} onChange={(event) => setKorean(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Translation</Label>
              <Input value={translation} onChange={(event) => setTranslation(event.target.value)} />
            </div>
          </div>
          <Button onClick={handleCreate}>Add word</Button>
          <div className="space-y-2">
            <Label>Upload CSV (order, korean, translation)</Label>
            <Input type="file" accept=".csv" onChange={(event) => handleUpload(event.target.files?.[0] ?? null)} />
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bottom-0 left-0 right-0 top-auto max-w-none translate-x-0 translate-y-0 rounded-t-3xl border-t">
          <DialogHeader className="text-left">
            <DialogTitle>Add word</DialogTitle>
            <DialogDescription>Create or upload words for a topic.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {error && <div className="text-sm text-red-600">{error}</div>}
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Language</Label>
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
                <Label>Level</Label>
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
                <Label>Chapter</Label>
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
              <div className="space-y-2">
                <Label>Order</Label>
                <Input type="number" value={order} onChange={(event) => setOrder(Number(event.target.value))} />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Korean</Label>
                <Input value={korean} onChange={(event) => setKorean(event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Translation</Label>
                <Input value={translation} onChange={(event) => setTranslation(event.target.value)} />
              </div>
            </div>
            <Button onClick={handleCreate}>Add word</Button>
            <div className="space-y-2">
              <Label>Upload CSV (order, korean, translation)</Label>
              <Input type="file" accept=".csv" onChange={(event) => handleUpload(event.target.files?.[0] ?? null)} />
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
          </div>
        </DialogContent>
      </Dialog>

      <Card className="glass">
        <CardHeader>
          <CardTitle>Word list</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {words.map((word) => (
            <div key={word.id} className="flex items-center justify-between rounded-xl border bg-white px-4 py-3">
              <div>
                <div className="font-semibold">{word.korean}</div>
                <div className="text-xs text-muted-foreground">{word.translation}</div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => {
                    setEditingWord(word);
                    setEditKorean(word.korean);
                    setEditTranslation(word.translation);
                    setEditOpen(true);
                  }}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="icon" variant="outline">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="bottom-0 left-0 right-0 top-auto max-w-none translate-x-0 translate-y-0 rounded-t-3xl border-t">
                    <AlertDialogHeader className="text-left">
                      <AlertDialogTitle>Delete word?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDelete(word.id)}>
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))}
          {words.length === 0 && (
            <div className="text-sm text-muted-foreground">No words yet.</div>
          )}
        </CardContent>
      </Card>

      <Card className="glass">
        <CardHeader>
          <CardTitle>Chapters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {chapters.map((chapter) => (
            <div key={chapter.id} className="flex items-center justify-between rounded-xl border bg-white px-4 py-3">
              <button
                className={`text-left font-semibold ${
                  chapter.id === chapterId ? "text-primary" : "text-foreground"
                }`}
                onClick={() => setChapterId(chapter.id)}
              >
                {chapter.title}
              </button>
              <div className="flex items-center gap-2">
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => {
                    setEditingChapter(chapter);
                    setEditChapterTitle(chapter.title);
                    setEditChapterOrder(chapter.order);
                    setEditChapterOpen(true);
                  }}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="icon" variant="outline">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="bottom-0 left-0 right-0 top-auto max-w-none translate-x-0 translate-y-0 rounded-t-3xl border-t">
                    <AlertDialogHeader className="text-left">
                      <AlertDialogTitle>Delete chapter?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will delete all words in this chapter.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDeleteChapter(chapter.id)}>
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))}
          {chapters.length === 0 && (
            <div className="text-sm text-muted-foreground">No chapters yet.</div>
          )}
        </CardContent>
      </Card>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="bottom-0 left-0 right-0 top-auto max-w-none translate-x-0 translate-y-0 rounded-t-3xl border-t">
          <DialogHeader className="text-left">
            <DialogTitle>Edit word</DialogTitle>
            <DialogDescription>Update the Korean and translation.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Korean</Label>
              <Input value={editKorean} onChange={(event) => setEditKorean(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Translation</Label>
              <Input value={editTranslation} onChange={(event) => setEditTranslation(event.target.value)} />
            </div>
            <Button onClick={handleEditSave}>Save changes</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={editChapterOpen} onOpenChange={setEditChapterOpen}>
        <DialogContent className="bottom-0 left-0 right-0 top-auto max-w-none translate-x-0 translate-y-0 rounded-t-3xl border-t">
          <DialogHeader className="text-left">
            <DialogTitle>Edit chapter</DialogTitle>
            <DialogDescription>Update the chapter title.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={editChapterTitle}
                onChange={(event) => setEditChapterTitle(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Order</Label>
              <Input
                type="number"
                value={editChapterOrder}
                onChange={(event) => setEditChapterOrder(Number(event.target.value))}
              />
            </div>
            <Button onClick={handleEditChapterSave}>Save changes</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
