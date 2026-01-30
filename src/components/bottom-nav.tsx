"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { BookText, HelpCircle, Layers, PenLine, Settings } from "lucide-react";

const navItems = [
  { href: "/words", label: "Words", icon: BookText },
  { href: "/flashcards", label: "Cards", icon: Layers },
  { href: "/quiz", label: "Quiz", icon: HelpCircle },
  { href: "/write", label: "Write", icon: PenLine },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function BottomNav() {
  const pathname = usePathname();
  const [hasUser, setHasUser] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem("vocab-master-user");
    setHasUser(!!stored);

    const handleUpdate = () => {
      const next = sessionStorage.getItem("vocab-master-user");
      setHasUser(!!next);
    };
    window.addEventListener("user-updated", handleUpdate);
    return () => window.removeEventListener("user-updated", handleUpdate);
  }, []);

  if (pathname.startsWith("/admin")) {
    return null;
  }

  if (!hasUser) return null;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 sm:hidden">
      <div className="mx-auto max-w-5xl px-3 pb-4">
        <div className="rounded-3xl border bg-white/90 px-2 py-2 shadow-lg backdrop-blur">
          <div className="grid grid-cols-5 gap-1 text-[11px]">
            {navItems.map((item) => {
              const active = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex flex-col items-center gap-1 rounded-2xl px-2 py-2 transition ${
                    active
                      ? "bg-gradient-to-r from-sky-500 to-indigo-500 text-white shadow"
                      : "text-muted-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="leading-none">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}
