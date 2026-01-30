"use client";

import { useCallback, useEffect, useState } from "react";
import { UserGate, type User } from "@/components/user-gate";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { graphqlRequest } from "@/lib/graphql/client";

const STORAGE_KEY = "vocab-master-user";

export default function SettingsPage() {
  return (
    <UserGate>
      {(user) => <SettingsView user={user} />}
    </UserGate>
  );
}

function SettingsView({ user }: { user: User }) {
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setName(user.name);
    setPhone(user.phone);
  }, [user]);

  const handleUpdate = useCallback(async () => {
    const data = await graphqlRequest<{ updateUser: User }>(
      `mutation UpdateUser($userId: ID!, $name: String!, $phone: String!) {
        updateUser(userId: $userId, name: $name, phone: $phone) { id name phone }
      }`,
      { userId: user.id, name: name.trim(), phone: phone.trim() }
    );
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data.updateUser));
    setMessage("Profile updated.");
  }, [user.id, name, phone]);

  const handleClearWords = useCallback(async () => {
    await graphqlRequest<{ clearWords: boolean }>(
      `mutation ClearWords($userId: ID!) { clearWords(userId: $userId) }`,
      { userId: user.id }
    );
    setMessage("All words cleared.");
  }, [user.id]);

  const handleDeleteAccount = useCallback(async () => {
    await graphqlRequest<{ deleteUser: boolean }>(
      `mutation DeleteUser($userId: ID!) { deleteUser(userId: $userId) }`,
      { userId: user.id }
    );
    sessionStorage.removeItem(STORAGE_KEY);
    window.location.href = "/";
  }, [user.id]);

  const handleLogout = useCallback(() => {
    sessionStorage.removeItem(STORAGE_KEY);
    window.location.href = "/";
  }, []);

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="heading-serif text-3xl font-semibold">Settings</h1>
        <p className="text-muted-foreground">Manage your profile and data.</p>
      </header>

      {message && <div className="text-sm text-emerald-700">{message}</div>}

      <Card className="glass">
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Update your name or phone.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input value={name} onChange={(event) => setName(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Phone</Label>
            <Input value={phone} onChange={(event) => setPhone(event.target.value)} />
          </div>
          <Button onClick={handleUpdate}>Save changes</Button>
        </CardContent>
      </Card>

      <Card className="glass">
        <CardHeader>
          <CardTitle>Data</CardTitle>
          <CardDescription>Clear words or delete your account.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="w-full">Clear all words</Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="left-1/2 top-auto bottom-0 w-full max-w-none translate-x-[-50%] translate-y-0 rounded-t-2xl sm:max-w-lg sm:rounded-lg">
              <AlertDialogHeader>
                <AlertDialogTitle>Clear all words?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently remove all your vocabulary.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleClearWords}>Confirm</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="w-full">Delete account</Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="left-1/2 top-auto bottom-0 w-full max-w-none translate-x-[-50%] translate-y-0 rounded-t-2xl sm:max-w-lg sm:rounded-lg">
              <AlertDialogHeader>
                <AlertDialogTitle>Delete account?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will remove your profile and all stored words. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteAccount}>Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <Button variant="ghost" className="w-full" onClick={handleLogout}>
            Logout
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
