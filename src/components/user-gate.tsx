"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { graphqlRequest } from "@/lib/graphql/client";

export type User = {
  id: string;
  name: string;
  phone: string;
};

const STORAGE_KEY = "vocab-master-user";

export function UserGate({
  children,
}: {
  children: (user: User) => React.ReactNode;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (!stored) {
      setLoading(false);
      return;
    }

    const parsed = JSON.parse(stored) as User;
    graphqlRequest<{ user: User | null }>(
      `query User($id: ID) { user(id: $id) { id name phone } }`,
      { id: parsed.id }
    )
      .then((data) => {
        if (data.user) {
          setUser(data.user);
        } else {
          sessionStorage.removeItem(STORAGE_KEY);
          window.dispatchEvent(new Event("user-updated"));
        }
      })
      .catch(() => {
        sessionStorage.removeItem(STORAGE_KEY);
        window.dispatchEvent(new Event("user-updated"));
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit() {
    setError(null);
    if (!name.trim() || !phone.trim()) {
      setError("Name and phone are required.");
      return;
    }

    try {
      const data = await graphqlRequest<{ upsertUser: User }>(
        `mutation Upsert($name: String!, $phone: String!) {
          upsertUser(name: $name, phone: $phone) { id name phone }
        }`,
        { name: name.trim(), phone: phone.trim() }
      );
      setUser(data.upsertUser);
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data.upsertUser));
      localStorage.removeItem(STORAGE_KEY);
      window.dispatchEvent(new Event("user-updated"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create user.");
    }
  }

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading...</div>;
  }

  if (!user) {
    return (
      <Card className="mx-auto max-w-xl glass">
        <CardHeader>
          <CardTitle className="heading-serif text-2xl">Welcome in</CardTitle>
          <CardDescription>Enter your name and phone to continue.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && <div className="text-sm text-red-600">{error}</div>}
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Your name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="Phone number"
            />
          </div>
          <Button className="w-full" onClick={handleSubmit}>
            Continue
          </Button>
        </CardContent>
      </Card>
    );
  }

  return <>{children(user)}</>;
}
