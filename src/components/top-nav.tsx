"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { graphqlRequest } from "@/lib/graphql/client";

type User = {
  id: string;
  name: string;
  phone: string;
};

type UserStats = {
  wordsLearned: number;
  sessionsCompleted: number;
  totalWords: number;
  correctTotal: number;
  incorrectTotal: number;
};

const STORAGE_KEY = "vocab-master-user";

export function TopNav() {
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);

  useEffect(() => {
    function syncUser() {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (!stored) {
        setUser(null);
        return;
      }
      try {
        setUser(JSON.parse(stored) as User);
      } catch {
        sessionStorage.removeItem(STORAGE_KEY);
        setUser(null);
      }
    }

    syncUser();
    window.addEventListener("user-updated", syncUser);
    return () => window.removeEventListener("user-updated", syncUser);
  }, []);

  const fetchStats = useCallback(async () => {
    if (!user) return;
    const data = await graphqlRequest<{ stats: UserStats }>(
      `query Stats($userId: ID!) { stats(userId: $userId) { wordsLearned sessionsCompleted totalWords correctTotal incorrectTotal } }`,
      { userId: user.id }
    );
    setStats(data.stats);
  }, [user]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  if (!user) return null;

  return (
    <div className="sticky top-0 z-40 mb-6 flex items-center justify-between rounded-2xl border bg-white/80 px-4 py-3 backdrop-blur">
      <div>
        <div className="text-xs text-muted-foreground">Welcome</div>
        <div className="font-semibold">{user.name}</div>
      </div>
      <div className="hidden sm:flex items-center gap-4 text-xs text-muted-foreground">
        <div>
          <div className="text-xs">Progress</div>
          <div className="text-sm font-semibold text-foreground">
            {stats?.wordsLearned ?? 0}/{stats?.totalWords ?? 0}
          </div>
        </div>
        <div>
          <div className="text-xs">Sessions</div>
          <div className="text-sm font-semibold text-foreground">
            {stats?.sessionsCompleted ?? 0}
          </div>
        </div>
      </div>
      <Button asChild variant="outline" size="icon" aria-label="Settings">
        <Link href="/settings">⚙️</Link>
      </Button>
    </div>
  );
}
