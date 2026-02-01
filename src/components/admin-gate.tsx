"use client";

import { UserGate, type User } from "@/components/user-gate";
import { useTranslations } from "next-intl";

export function AdminGate({
  children,
}: {
  children: (user: User) => React.ReactNode;
}) {
  const t = useTranslations();
  return (
    <UserGate>
      {(user) =>
        user.isAdmin ? (
          children(user)
        ) : (
          <div className="text-sm text-muted-foreground">{t("auth.adminOnly")}</div>
        )
      }
    </UserGate>
  );
}
