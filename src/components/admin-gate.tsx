"use client";

import { UserGate, type User } from "@/components/user-gate";

export function AdminGate({
  children,
}: {
  children: (user: User) => React.ReactNode;
}) {
  return (
    <UserGate>
      {(user) =>
        user.isAdmin ? (
          children(user)
        ) : (
          <div className="text-sm text-muted-foreground">Admin access only.</div>
        )
      }
    </UserGate>
  );
}
