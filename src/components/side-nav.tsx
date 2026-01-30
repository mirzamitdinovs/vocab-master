"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { BookText, HelpCircle, Layers, PenLine, Settings, BarChart3 } from "lucide-react";

const navItems = [
  { href: "/words", label: "Words", icon: BookText },
  { href: "/flashcards", label: "Flashcards", icon: Layers },
  { href: "/quiz", label: "Quiz", icon: HelpCircle },
  { href: "/write", label: "Write", icon: PenLine },
  { href: "/stats", label: "Stats", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function SideNav() {
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

  if (pathname.startsWith("/admin")) return null;
  if (!hasUser) return null;

  return (
    <aside className="hidden md:flex md:flex-col md:gap-2 md:rounded-3xl md:border md:bg-white/80 md:p-4 md:backdrop-blur">
      <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Menu</div>
      <div className="mt-2 flex flex-col gap-1">
        {navItems.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition ${
                active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
              }`}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </aside>
  );
}
