"use client";

import { useCallback, useEffect, useState } from "react";
import { UserGate, type User } from "@/components/user-gate";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { graphqlRequest } from "@/lib/graphql/client";

type UserStats = {
  wordsLearned: number;
  sessionsCompleted: number;
  totalWords: number;
  correctTotal: number;
  incorrectTotal: number;
};

export default function StatsPage() {
  return (
    <UserGate>
      {(user) => <StatsView user={user} />}
    </UserGate>
  );
}

function StatsView({ user }: { user: User }) {
  const [stats, setStats] = useState<UserStats | null>(null);

  const fetchStats = useCallback(async () => {
    const data = await graphqlRequest<{ stats: UserStats }>(
      `query Stats($userId: ID!) { stats(userId: $userId) { wordsLearned sessionsCompleted totalWords correctTotal incorrectTotal } }`,
      { userId: user.id }
    );
    setStats(data.stats);
  }, [user.id]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="heading-serif text-3xl font-semibold">Stats</h1>
        <p className="text-muted-foreground">Your progress so far.</p>
      </header>

      <Card className="glass">
        <CardHeader>
          <CardTitle>Overview</CardTitle>
          <CardDescription>Totals for your sessions.</CardDescription>
        </CardHeader>
        <CardContent>
          {stats ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg border bg-white p-4">
                <div className="text-sm text-muted-foreground">Total words</div>
                <div className="text-2xl font-semibold">{stats.totalWords}</div>
              </div>
              <div className="rounded-lg border bg-white p-4">
                <div className="text-sm text-muted-foreground">Words learned</div>
                <div className="text-2xl font-semibold">{stats.wordsLearned}</div>
              </div>
              <div className="rounded-lg border bg-white p-4">
                <div className="text-sm text-muted-foreground">Sessions completed</div>
                <div className="text-2xl font-semibold">{stats.sessionsCompleted}</div>
              </div>
              <div className="rounded-lg border bg-white p-4">
                <div className="text-sm text-muted-foreground">Correct / Incorrect</div>
                <div className="text-2xl font-semibold">
                  {stats.correctTotal} / {stats.incorrectTotal}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">No stats yet.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
