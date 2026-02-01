"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminGate } from "@/components/admin-gate";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

type Language = {
  id: string;
  key: string;
  value: string;
  description?: string | null;
  order: number;
};

export default function AdminCoursesPage() {
  return (
    <AdminGate>
      {(user) => <LanguagesView userId={user.id} />}
    </AdminGate>
  );
}

function LanguagesView({ userId }: { userId: string }) {
  const [languages, setLanguages] = useState<Language[]>([]);
  const [key, setKey] = useState("");
  const [value, setValue] = useState("");
  const [description, setDescription] = useState("");
  const [order, setOrder] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingLanguage, setEditingLanguage] = useState<Language | null>(null);
  const [editKey, setEditKey] = useState("");
  const [editValue, setEditValue] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editOrder, setEditOrder] = useState(0);

  const fetchLanguages = useCallback(async () => {
    try {
      setError(null);
      const data = await graphqlRequest<{ languages: Language[] }>(
        `query { languages { id key value description order } }`
      );
      setLanguages(data.languages);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load languages.");
    }
  }, []);

  useEffect(() => {
    fetchLanguages();
  }, [fetchLanguages]);

  async function handleCreate() {
    if (!key.trim() || !value.trim()) return;
    await graphqlRequest<{ createLanguage: Language }>(
      `mutation Create($userId: ID!, $key: String!, $value: String!, $description: String, $order: Int) {
        createLanguage(userId: $userId, key: $key, value: $value, description: $description, order: $order) { id }
      }`,
      { userId, key: key.trim(), value: value.trim(), description: description.trim() || null, order }
    );
    setKey("");
    setValue("");
    setDescription("");
    setOrder(0);
    setOpen(false);
    fetchLanguages();
  }

  async function handleDelete(languageId: string) {
    await graphqlRequest<{ deleteLanguage: boolean }>(
      `mutation Delete($userId: ID!, $languageId: ID!) { deleteLanguage(userId: $userId, languageId: $languageId) }`,
      { userId, languageId }
    );
    fetchLanguages();
  }

  async function handleEditSave() {
    if (!editingLanguage || !editKey.trim() || !editValue.trim()) return;
    await graphqlRequest<{ updateLanguage: Language }>(
      `mutation Update($userId: ID!, $languageId: ID!, $key: String!, $value: String!, $description: String, $order: Int) {
        updateLanguage(userId: $userId, languageId: $languageId, key: $key, value: $value, description: $description, order: $order) { id }
      }`,
      {
        userId,
        languageId: editingLanguage.id,
        key: editKey.trim(),
        value: editValue.trim(),
        description: editDescription.trim() || null,
        order: editOrder,
      }
    );
    setEditOpen(false);
    setEditingLanguage(null);
    fetchLanguages();
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h1 className="heading-serif text-3xl font-semibold">Languages</h1>
          <p className="text-muted-foreground">Create and manage languages.</p>
        </div>
        <Button className="md:hidden" onClick={() => setOpen(true)}>
          Add language
        </Button>
      </header>

      <Card className="glass hidden md:block">
        <CardHeader>
          <CardTitle>Add language</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-4">
          <div className="space-y-2 md:col-span-1">
            <Label>Key</Label>
            <Input value={key} onChange={(event) => setKey(event.target.value)} />
          </div>
          <div className="space-y-2 md:col-span-1">
            <Label>Value</Label>
            <Input value={value} onChange={(event) => setValue(event.target.value)} />
          </div>
          <div className="space-y-2 md:col-span-1">
            <Label>Description</Label>
            <Input value={description} onChange={(event) => setDescription(event.target.value)} />
          </div>
          <div className="space-y-2 md:col-span-1">
            <Label>Order</Label>
            <Input type="number" value={order} onChange={(event) => setOrder(Number(event.target.value))} />
          </div>
          <Button onClick={handleCreate} className="md:col-span-3">
            Create language
          </Button>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bottom-0 left-0 right-0 top-auto max-w-none translate-x-0 translate-y-0 rounded-t-3xl border-t">
          <DialogHeader className="text-left">
            <DialogTitle>Add language</DialogTitle>
            <DialogDescription>Languages group levels.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2 md:col-span-1">
              <Label>Key</Label>
              <Input value={key} onChange={(event) => setKey(event.target.value)} />
            </div>
            <div className="space-y-2 md:col-span-1">
              <Label>Value</Label>
              <Input value={value} onChange={(event) => setValue(event.target.value)} />
            </div>
            <div className="space-y-2 md:col-span-1">
              <Label>Description</Label>
              <Input value={description} onChange={(event) => setDescription(event.target.value)} />
            </div>
            <div className="space-y-2 md:col-span-1">
              <Label>Order</Label>
              <Input type="number" value={order} onChange={(event) => setOrder(Number(event.target.value))} />
            </div>
            <Button onClick={handleCreate} className="md:col-span-3">
              Create language
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Card className="glass">
        <CardHeader>
          <CardTitle>All languages</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {error && <div className="text-sm text-red-600">{error}</div>}
          {languages.map((language) => (
            <div key={language.id} className="flex items-center justify-between rounded-xl border bg-white px-4 py-3">
              <div>
                <div className="font-semibold">{language.value}</div>
                <div className="text-xs text-muted-foreground">
                  {language.key} · Order {language.order}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => {
                    setEditingLanguage(language);
                    setEditKey(language.key);
                    setEditValue(language.value);
                    setEditDescription(language.description ?? "");
                    setEditOrder(language.order);
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
                      <AlertDialogTitle>Delete language?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will remove all levels and chapters under it.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDelete(language.id)}>
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))}
          {languages.length === 0 && (
            <div className="text-sm text-muted-foreground">No languages yet.</div>
          )}
        </CardContent>
      </Card>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="bottom-0 left-0 right-0 top-auto max-w-none translate-x-0 translate-y-0 rounded-t-3xl border-t">
          <DialogHeader className="text-left">
            <DialogTitle>Edit language</DialogTitle>
            <DialogDescription>Update the language details.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2 md:col-span-1">
              <Label>Key</Label>
              <Input value={editKey} onChange={(event) => setEditKey(event.target.value)} />
            </div>
            <div className="space-y-2 md:col-span-1">
              <Label>Value</Label>
              <Input value={editValue} onChange={(event) => setEditValue(event.target.value)} />
            </div>
            <div className="space-y-2 md:col-span-1">
              <Label>Description</Label>
              <Input value={editDescription} onChange={(event) => setEditDescription(event.target.value)} />
            </div>
            <div className="space-y-2 md:col-span-1">
              <Label>Order</Label>
              <Input type="number" value={editOrder} onChange={(event) => setEditOrder(Number(event.target.value))} />
            </div>
            <Button onClick={handleEditSave} className="md:col-span-3">
              Save changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
