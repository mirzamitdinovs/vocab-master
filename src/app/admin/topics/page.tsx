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

type Language = { id: string; key: string; value: string; order: number };

type Level = {
  id: string;
  languageId: string;
  title: string;
  order: number;
};

export default function AdminTopicsPage() {
  return (
    <AdminGate>
      {(user) => <LevelsView userId={user.id} />}
    </AdminGate>
  );
}

function LevelsView({ userId }: { userId: string }) {
  const [languages, setLanguages] = useState<Language[]>([]);
  const [levels, setLevels] = useState<Level[]>([]);
  const [languageId, setLanguageId] = useState("");
  const [title, setTitle] = useState("");
  const [order, setOrder] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingLevel, setEditingLevel] = useState<Level | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editOrder, setEditOrder] = useState(0);

  const fetchLanguages = useCallback(async () => {
    try {
      setError(null);
      const data = await graphqlRequest<{ languages: Language[] }>(
        `query { languages { id key value order } }`
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
        `query Levels($languageId: ID!) { levels(languageId: $languageId) { id languageId title order } }`,
        { languageId }
      );
      setLevels(data.levels);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load levels.");
    }
  }, [languageId]);

  useEffect(() => {
    fetchLanguages();
  }, [fetchLanguages]);

  useEffect(() => {
    fetchLevels();
  }, [fetchLevels]);

  async function handleCreate() {
    if (!languageId || !title.trim()) return;
    await graphqlRequest<{ createLevel: Level }>(
      `mutation Create($userId: ID!, $languageId: ID!, $title: String!, $order: Int) {
        createLevel(userId: $userId, languageId: $languageId, title: $title, order: $order) { id }
      }`,
      { userId, languageId, title: title.trim(), order }
    );
    setTitle("");
    setOrder(0);
    setOpen(false);
    fetchLevels();
  }

  async function handleDelete(levelId: string) {
    await graphqlRequest<{ deleteLevel: boolean }>(
      `mutation Delete($userId: ID!, $levelId: ID!) { deleteLevel(userId: $userId, levelId: $levelId) }`,
      { userId, levelId }
    );
    fetchLevels();
  }

  async function handleEditSave() {
    if (!editingLevel || !editTitle.trim()) return;
    await graphqlRequest<{ updateLevel: Level }>(
      `mutation Update($userId: ID!, $levelId: ID!, $title: String!, $order: Int) {
        updateLevel(userId: $userId, levelId: $levelId, title: $title, order: $order) { id }
      }`,
      {
        userId,
        levelId: editingLevel.id,
        title: editTitle.trim(),
        order: editOrder,
      }
    );
    setEditOpen(false);
    setEditingLevel(null);
    fetchLevels();
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h1 className="heading-serif text-3xl font-semibold">Levels</h1>
          <p className="text-muted-foreground">Add levels to a language.</p>
        </div>
        <Button className="md:hidden" onClick={() => setOpen(true)}>
          Add level
        </Button>
      </header>

      <Card className="glass hidden md:block">
        <CardHeader>
          <CardTitle>Add level</CardTitle>
          <CardDescription>Levels group chapters within a language.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2 md:col-span-1">
            <Label>Language</Label>
            <select
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={languageId}
              onChange={(event) => setLanguageId(event.target.value)}
            >
              {languages.map((language) => (
                <option key={language.id} value={language.id}>
                  {language.value}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2 md:col-span-1">
            <Label>Title</Label>
            <Input value={title} onChange={(event) => setTitle(event.target.value)} />
          </div>
          <div className="space-y-2 md:col-span-1">
            <Label>Order</Label>
            <Input type="number" value={order} onChange={(event) => setOrder(Number(event.target.value))} />
          </div>
          <Button onClick={handleCreate} className="md:col-span-3">
            Create level
          </Button>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bottom-0 left-0 right-0 top-auto max-w-none translate-x-0 translate-y-0 rounded-t-3xl border-t">
          <DialogHeader className="text-left">
            <DialogTitle>Add level</DialogTitle>
            <DialogDescription>Levels group chapters within a language.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2 md:col-span-1">
              <Label>Language</Label>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={languageId}
                onChange={(event) => setLanguageId(event.target.value)}
              >
                {languages.map((language) => (
                  <option key={language.id} value={language.id}>
                    {language.value}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2 md:col-span-1">
              <Label>Title</Label>
              <Input value={title} onChange={(event) => setTitle(event.target.value)} />
            </div>
            <div className="space-y-2 md:col-span-1">
              <Label>Order</Label>
              <Input type="number" value={order} onChange={(event) => setOrder(Number(event.target.value))} />
            </div>
            <Button onClick={handleCreate} className="md:col-span-3">
              Create level
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Card className="glass">
        <CardHeader>
          <CardTitle>Levels</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {error && <div className="text-sm text-red-600">{error}</div>}
          {levels.map((level) => (
            <div key={level.id} className="flex items-center justify-between rounded-xl border bg-white px-4 py-3">
              <div>
                <div className="font-semibold">{level.title}</div>
                <div className="text-xs text-muted-foreground">Order {level.order}</div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => {
                    setEditingLevel(level);
                    setEditTitle(level.title);
                    setEditOrder(level.order);
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
                      <AlertDialogTitle>Delete level?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will remove all chapters under it.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDelete(level.id)}>
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))}
          {levels.length === 0 && (
            <div className="text-sm text-muted-foreground">No levels yet.</div>
          )}
        </CardContent>
      </Card>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="bottom-0 left-0 right-0 top-auto max-w-none translate-x-0 translate-y-0 rounded-t-3xl border-t">
          <DialogHeader className="text-left">
            <DialogTitle>Edit level</DialogTitle>
            <DialogDescription>Update the level details.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={editTitle} onChange={(event) => setEditTitle(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Order</Label>
              <Input type="number" value={editOrder} onChange={(event) => setEditOrder(Number(event.target.value))} />
            </div>
            <Button onClick={handleEditSave} className="md:col-span-2">
              Save changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
