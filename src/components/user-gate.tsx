"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { graphqlRequest } from "@/lib/graphql/client";

export type User = {
  id: string;
  name: string;
  phone: string;
  isAdmin?: boolean;
};

const STORAGE_KEY = "vocab-master-user";

export function UserGate({
  children,
}: {
  children: (user: User) => React.ReactNode;
}) {
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<"phone" | "name">("phone");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const isAdminRoute = pathname.startsWith("/admin");

  useEffect(() => {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (!stored) {
      if (!isAdminRoute) {
        const guestKey = "vocab-master-guest-id";
        let guestId = sessionStorage.getItem(guestKey);
        if (!guestId) {
          guestId = globalThis.crypto?.randomUUID?.() ?? String(Date.now());
          sessionStorage.setItem(guestKey, guestId);
        }
        graphqlRequest<{ upsertUser: User }>(
          `mutation Upsert($name: String!, $phone: String!) {
            upsertUser(name: $name, phone: $phone) { id name phone isAdmin }
          }`,
          { name: "Guest", phone: `guest-${guestId}` }
        )
          .then((data) => {
            setUser(data.upsertUser);
            sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data.upsertUser));
            window.dispatchEvent(new Event("user-updated"));
          })
          .catch(() => {
            setError("Failed to start guest session.");
          })
          .finally(() => setLoading(false));
        return;
      }
      setLoading(false);
      return;
    }

    const parsed = JSON.parse(stored) as User;
    graphqlRequest<{ user: User | null }>(
      `query User($id: ID) { user(id: $id) { id name phone isAdmin } }`,
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
    if (!phone.trim()) {
      setError("Phone number is required.");
      return;
    }

    try {
      if (step === "phone") {
        const lookup = await graphqlRequest<{ user: User | null }>(
          `query UserByPhone($phone: String!) { user(phone: $phone) { id name phone isAdmin } }`,
          { phone: phone.trim() }
        );
        if (lookup.user) {
          setUser(lookup.user);
          sessionStorage.setItem(STORAGE_KEY, JSON.stringify(lookup.user));
          localStorage.removeItem(STORAGE_KEY);
          window.dispatchEvent(new Event("user-updated"));
          return;
        }
        setStep("name");
        return;
      }

      if (!name.trim()) {
        setError("Name is required to create an account.");
        return;
      }

      const created = await graphqlRequest<{ upsertUser: User }>(
        `mutation Upsert($name: String!, $phone: String!) {
          upsertUser(name: $name, phone: $phone) { id name phone isAdmin }
        }`,
        { name: name.trim(), phone: phone.trim() }
      );
      setUser(created.upsertUser);
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(created.upsertUser));
      localStorage.removeItem(STORAGE_KEY);
      window.dispatchEvent(new Event("user-updated"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create user.");
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-muted border-t-primary" />
      </div>
    );
  }

  if (!user) {
    if (!isAdminRoute) {
      return <div className="text-sm text-muted-foreground">Loading...</div>;
    }
    return (
      <Card className="mx-auto max-w-xl glass">
        <CardHeader>
          <CardTitle className="heading-serif text-2xl">Welcome in</CardTitle>
          <CardDescription>
            {step === "phone"
              ? "Enter your phone number to continue."
              : "We didn’t find this phone number. Add a name to create your account."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && <div className="text-sm text-red-600">{error}</div>}
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="Phone number"
              disabled={step === "name"}
            />
          </div>
          {step === "name" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Your name"
                />
              </div>
              <Button
                variant="ghost"
                className="h-auto p-0 text-xs text-muted-foreground"
                onClick={() => setStep("phone")}
              >
                Change phone number
              </Button>
            </>
          )}
          <Button className="w-full" onClick={handleSubmit}>
            {step === "phone" ? "Continue" : "Create account"}
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (user.isAdmin && !pathname.startsWith("/admin")) {
    window.location.href = "/admin";
    return null;
  }

  return <>{children(user)}</>;
}
