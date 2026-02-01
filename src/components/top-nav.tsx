"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

type User = {
  id: string;
  name: string;
  phone: string;
};

const STORAGE_KEY = "vocab-master-user";

export function TopNav() {
  const [user, setUser] = useState<User | null>(null);
  const pathname = usePathname();
  const t = useTranslations();
  const segments = pathname.split("/");
  const locale = ["en", "ru", "uz"].includes(segments[1]) ? segments[1] : "en";

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

  if (!user) return null;

  return (
    <div className="sticky top-0 z-40 mb-6 flex items-center justify-between rounded-2xl border bg-white/80 px-4 py-3 backdrop-blur">
      <div>
        <div className="text-xs text-muted-foreground">{t("topNav.welcome")}</div>
        <div className="font-semibold">{user.name}</div>
      </div>
      <div className="hidden sm:block text-xs text-muted-foreground">
        {t("topNav.keepGoing")}
      </div>
      <Button asChild variant="outline" size="icon" aria-label={t("topNav.settings")}>
        <Link href={`/${locale}/settings`}>
          <Settings className="h-4 w-4" />
        </Link>
      </Button>
    </div>
  );
}
