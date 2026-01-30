"use client";

import Link from "next/link";
import { AdminGate } from "@/components/admin-gate";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FolderKanban, Layers, ListChecks, LogOut } from "lucide-react";

export default function AdminHome() {
  return (
    <AdminGate>
      {(user) => (
        <div className="space-y-6">
          <header className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <h1 className="heading-serif text-3xl font-semibold">Admin Dashboard</h1>
              <p className="text-muted-foreground">Manage languages, levels, and chapters.</p>
            </div>
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => {
                sessionStorage.removeItem("vocab-master-user");
                localStorage.removeItem("vocab-master-user");
                window.dispatchEvent(new Event("user-updated"));
                window.location.href = "/";
              }}
            >
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </header>

          <div className="grid gap-4 md:grid-cols-3">
            <Link href="/admin/courses">
              <Card className="glass transition hover:-translate-y-0.5 hover:shadow-md">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FolderKanban className="h-5 w-5 text-primary" />
                    Languages
                  </CardTitle>
                  <CardDescription>Manage language groups.</CardDescription>
                </CardHeader>
              </Card>
            </Link>
            <Link href="/admin/topics">
              <Card className="glass transition hover:-translate-y-0.5 hover:shadow-md">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Layers className="h-5 w-5 text-primary" />
                    Levels
                  </CardTitle>
                  <CardDescription>Organize levels per language.</CardDescription>
                </CardHeader>
              </Card>
            </Link>
            <Link href="/admin/words">
              <Card className="glass transition hover:-translate-y-0.5 hover:shadow-md">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ListChecks className="h-5 w-5 text-primary" />
                    Chapters
                  </CardTitle>
                  <CardDescription>Add chapters and words.</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          </div>

          <Card className="glass">
            <CardHeader>
              <CardTitle>Signed in</CardTitle>
              <CardDescription>{user.name} • {user.phone}</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Use the cards above to manage your content.
            </CardContent>
          </Card>
        </div>
      )}
    </AdminGate>
  );
}
