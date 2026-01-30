"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { UserGate, type User } from "@/components/user-gate";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { graphqlRequest } from "@/lib/graphql/client";
import { Pencil, Trash2, Upload } from "lucide-react";

type Vocabulary = {
  id: string;
  order?: number | null;
  korean: string;
  translation: string;
  chapter: string;
};

type ImportResult = {
  inserted: number;
  skipped: number;
  errors: string[];
};

export default function WordsPage() {
  return (
    <UserGate>
      {(user) => <WordsView user={user} />}
    </UserGate>
  );
}

function WordsView({ user }: { user: User }) {
  const [words, setWords] = useState<Vocabulary[]>([]);
  const [chapterOrder, setChapterOrder] = useState<string[]>([]);
  const [openChapter, setOpenChapter] = useState<string | undefined>(undefined);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editWord, setEditWord] = useState<Vocabulary | null>(null);
  const [deleteWord, setDeleteWord] = useState<Vocabulary | null>(null);
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [bulkTranslation, setBulkTranslation] = useState("");
  const [bulkChapter, setBulkChapter] = useState("");
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const fetchWords = useCallback(async () => {
    const data = await graphqlRequest<{ vocabulary: Vocabulary[] }>(
      `query Words($userId: ID!) {
        vocabulary(userId: $userId) { id order korean translation chapter }
      }`,
      { userId: user.id }
    );
    setWords(data.vocabulary);
  }, [user.id]);

  useEffect(() => {
    fetchWords();
  }, [fetchWords]);

  const grouped = useMemo(() => {
    const map = new Map<string, Vocabulary[]>();
    words.forEach((word) => {
      const list = map.get(word.chapter) ?? [];
      list.push(word);
      map.set(word.chapter, list);
    });
    return map;
  }, [words]);

  useEffect(() => {
    const chapters = Array.from(grouped.keys());
    const sorted = [...chapters].sort((a, b) => {
      const getNum = (value: string) => {
        const match = value.match(/\\d+/);
        return match ? Number(match[0]) : Number.MAX_SAFE_INTEGER;
      };
      const aNum = getNum(a);
      const bNum = getNum(b);
      if (aNum !== bNum) return aNum - bNum;
      return a.localeCompare(b);
    });

    if (chapterOrder.length === 0 && chapters.length > 0) {
      setChapterOrder(sorted);
    } else if (chapterOrder.length > 0) {
      setChapterOrder((prev) =>
        prev
          .filter((c) => grouped.has(c))
          .concat(sorted.filter((c) => !prev.includes(c)))
      );
    }
  }, [grouped, chapterOrder.length]);

  const chapterEntries = chapterOrder.filter((chapter) => grouped.has(chapter));

  function parseChapterTitle(chapter: string) {
    const parts = chapter.split(":");
    if (parts.length >= 2) {
      return { lesson: parts[0].trim(), title: parts.slice(1).join(":").trim() };
    }
    return { lesson: chapter, title: "" };
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll(chapter: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      const list = grouped.get(chapter) ?? [];
      const allSelected = list.every((word) => next.has(word.id));
      list.forEach((word) => {
        if (allSelected) next.delete(word.id);
        else next.add(word.id);
      });
      return next;
    });
  }

  async function handleUpdateWord() {
    if (!editWord) return;
    await graphqlRequest<{ updateVocabulary: Vocabulary }>(
      `mutation Update($wordId: ID!, $korean: String!, $translation: String!, $chapter: String!, $order: Int) {
        updateVocabulary(wordId: $wordId, korean: $korean, translation: $translation, chapter: $chapter, order: $order) {
          id order korean translation chapter
        }
      }`,
      {
        wordId: editWord.id,
        korean: editWord.korean,
        translation: editWord.translation,
        chapter: editWord.chapter,
        order: editWord.order ?? null,
      }
    );
    setEditWord(null);
    fetchWords();
  }

  async function handleDeleteWord() {
    if (!deleteWord) return;
    await graphqlRequest<{ deleteVocabulary: boolean }>(
      `mutation Delete($wordId: ID!) { deleteVocabulary(wordId: $wordId) }`,
      { wordId: deleteWord.id }
    );
    setDeleteWord(null);
    fetchWords();
  }

  async function handleBulkDelete() {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    await graphqlRequest<{ deleteVocabularyMany: boolean }>(
      `mutation DeleteMany($wordIds: [ID!]!) { deleteVocabularyMany(wordIds: $wordIds) }`,
      { wordIds: ids }
    );
    setSelectedIds(new Set());
    fetchWords();
  }

  async function handleBulkUpdate() {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    await graphqlRequest<{ updateVocabularyMany: boolean }>(
      `mutation UpdateMany($wordIds: [ID!]!, $translation: String, $chapter: String) {
        updateVocabularyMany(wordIds: $wordIds, translation: $translation, chapter: $chapter)
      }`,
      { wordIds: ids, translation: bulkTranslation || null, chapter: bulkChapter || null }
    );
    setBulkTranslation("");
    setBulkChapter("");
    setBulkEditOpen(false);
    fetchWords();
  }

  async function handleUpload(file: File | null) {
    setImportResult(null);
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setImportResult({ inserted: 0, skipped: 0, errors: ["Only .csv files are allowed."] });
      return;
    }
    const csv = await file.text();
    const data = await graphqlRequest<{ importVocabulary: ImportResult }>(
      `mutation Import($userId: ID!, $csv: String!) {
        importVocabulary(userId: $userId, csv: $csv) { inserted skipped errors }
      }`,
      { userId: user.id, csv }
    );
    setImportResult(data.importVocabulary);
    fetchWords();
  }

  function handleDragStart(chapter: string, event: React.DragEvent<HTMLButtonElement>) {
    event.dataTransfer.setData("text/plain", chapter);
  }

  function handleDrop(target: string, event: React.DragEvent<HTMLButtonElement>) {
    event.preventDefault();
    const source = event.dataTransfer.getData("text/plain");
    if (!source || source === target) return;
    setChapterOrder((prev) => {
      const next = [...prev];
      const sourceIndex = next.indexOf(source);
      const targetIndex = next.indexOf(target);
      if (sourceIndex === -1 || targetIndex === -1) return prev;
      next.splice(sourceIndex, 1);
      next.splice(targetIndex, 0, source);
      return next;
    });
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="heading-serif text-3xl font-semibold">Words</h1>
          <p className="text-muted-foreground">All uploaded vocabulary grouped by chapter.</p>
        </div>
        <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Upload className="h-4 w-4" />
              Upload CSV
            </Button>
          </DialogTrigger>
          <DialogContent className="left-1/2 top-auto bottom-0 w-full max-w-none translate-x-[-50%] translate-y-0 rounded-t-2xl sm:max-w-lg sm:rounded-lg">
            <DialogHeader>
              <DialogTitle>Upload CSV</DialogTitle>
              <DialogDescription>Headers: order, korean, translation, chapter.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <Input type="file" accept=".csv" onChange={(event) => handleUpload(event.target.files?.[0] ?? null)} />
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
      </header>

      {selectedIds.size > 0 && (
        <Card className="glass">
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-muted-foreground">
              Selected {selectedIds.size} words
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" className="bg-sky-100 text-sky-700" onClick={() => setBulkEditOpen(true)}>
                Edit selected
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="bg-rose-100 text-rose-700">
                    Delete selected
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="left-1/2 top-auto bottom-0 w-full max-w-none translate-x-[-50%] translate-y-0 rounded-t-2xl sm:max-w-lg sm:rounded-lg">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete selected words?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will remove all selected words.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleBulkDelete}>Delete</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={bulkEditOpen} onOpenChange={setBulkEditOpen}>
        <DialogContent className="left-1/2 top-auto bottom-0 w-full max-w-none translate-x-[-50%] translate-y-0 rounded-t-2xl sm:max-w-lg sm:rounded-lg">
          <DialogHeader>
            <DialogTitle>Edit selected</DialogTitle>
            <DialogDescription>Update translation or chapter for selected words.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Translation</Label>
              <Input value={bulkTranslation} onChange={(event) => setBulkTranslation(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Chapter</Label>
              <Input value={bulkChapter} onChange={(event) => setBulkChapter(event.target.value)} />
            </div>
            <Button onClick={handleBulkUpdate}>Save changes</Button>
          </div>
        </DialogContent>
      </Dialog>

      {chapterEntries.length === 0 ? (
        <Card className="glass">
          <CardContent className="p-6 text-sm text-muted-foreground">
            No words yet. Upload a CSV first.
          </CardContent>
        </Card>
      ) : (
        <Accordion
          type="single"
          collapsible
          value={openChapter}
          onValueChange={(value) => setOpenChapter(value || undefined)}
          className="space-y-4"
        >
          {chapterEntries.map((chapter) => {
            const list = grouped.get(chapter) ?? [];
            const { lesson, title } = parseChapterTitle(chapter);
            return (
              <AccordionItem key={chapter} value={chapter} className="border-none">
                <AccordionTrigger
                  className="rounded-2xl border bg-white px-4 py-3 text-left"
                  draggable
                  onDragStart={(event) => handleDragStart(chapter, event)}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => handleDrop(chapter, event)}
                >
                  <div className="flex w-full items-center justify-between gap-4">
                    <div>
                      <div className="text-sm text-muted-foreground">{lesson}</div>
                      <div className="text-base font-semibold text-foreground">{title || chapter}</div>
                    </div>
                    <div className="text-sm text-muted-foreground">{list.length} words</div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-3">
                  <Card className="glass">
                    <CardContent>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="text-left text-muted-foreground">
                            <tr>
                              <th className="py-2 pr-3">
                                <Checkbox
                                  checked={list.length > 0 && list.every((word) => selectedIds.has(word.id))}
                                  onCheckedChange={() => toggleSelectAll(chapter)}
                                />
                              </th>
                              <th className="py-2 pr-3">#</th>
                              <th className="py-2 pr-6 w-1/2">Korean</th>
                              <th className="py-2">Translation</th>
                              <th className="py-2 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {list.map((word, index) => (
                              <tr key={word.id} className="border-t">
                                <td className="py-3 pr-3">
                                  <Checkbox
                                    checked={selectedIds.has(word.id)}
                                    onCheckedChange={() => toggleSelect(word.id)}
                                  />
                                </td>
                                <td className="py-3 pr-3 text-xs text-muted-foreground">
                                  {word.order ?? index + 1}
                                </td>
                                <td className="py-3 pr-6 text-lg font-semibold w-1/2">
                                  {word.korean}
                                </td>
                                <td className="py-3 text-sm text-muted-foreground">
                                  {word.translation}
                                </td>
                                <td className="py-3 text-right">
                                  <div className="flex justify-end gap-2">
                                    <Dialog open={editWord?.id === word.id} onOpenChange={(open) => setEditWord(open ? word : null)}>
                                    <DialogTrigger asChild>
                                        <Button variant="outline" size="icon" className="h-8 w-8" aria-label="Edit">
                                          <Pencil className="h-4 w-4" />
                                        </Button>
                                      </DialogTrigger>
                                      <DialogContent className="left-1/2 top-auto bottom-0 w-full max-w-none translate-x-[-50%] translate-y-0 rounded-t-2xl sm:max-w-lg sm:rounded-lg">
                                        <DialogHeader>
                                          <DialogTitle>Edit word</DialogTitle>
                                          <DialogDescription>Update the Korean and translation.</DialogDescription>
                                        </DialogHeader>
                                        {editWord && (
                                          <div className="space-y-3">
                                            <div className="space-y-2">
                                              <Label>Korean</Label>
                                              <Input
                                                value={editWord.korean}
                                                onChange={(event) =>
                                                  setEditWord({ ...editWord, korean: event.target.value })
                                                }
                                              />
                                            </div>
                                            <div className="space-y-2">
                                              <Label>Translation</Label>
                                              <Input
                                                value={editWord.translation}
                                                onChange={(event) =>
                                                  setEditWord({ ...editWord, translation: event.target.value })
                                                }
                                              />
                                            </div>
                                            <div className="space-y-2">
                                              <Label>Chapter</Label>
                                              <Input
                                                value={editWord.chapter}
                                                onChange={(event) =>
                                                  setEditWord({ ...editWord, chapter: event.target.value })
                                                }
                                              />
                                            </div>
                                            <div className="space-y-2">
                                              <Label>Order</Label>
                                              <Input
                                                type="number"
                                                value={editWord.order ?? ""}
                                                onChange={(event) =>
                                                  setEditWord({
                                                    ...editWord,
                                                    order: event.target.value ? Number(event.target.value) : null,
                                                  })
                                                }
                                              />
                                            </div>
                                            <Button onClick={handleUpdateWord}>Save</Button>
                                          </div>
                                        )}
                                      </DialogContent>
                                    </Dialog>
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <Button
                                          variant="outline"
                                          size="icon"
                                          className="h-8 w-8 border-rose-200 text-rose-600"
                                          aria-label="Delete"
                                          onClick={() => setDeleteWord(word)}
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent className="left-1/2 top-auto bottom-0 w-full max-w-none translate-x-[-50%] translate-y-0 rounded-t-2xl sm:max-w-lg sm:rounded-lg">
                                        <AlertDialogHeader>
                                          <AlertDialogTitle>Delete word?</AlertDialogTitle>
                                          <AlertDialogDescription>
                                            This will permanently remove the word.
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                                          <AlertDialogAction onClick={handleDeleteWord}>Delete</AlertDialogAction>
                                        </AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}
    </div>
  );
}
