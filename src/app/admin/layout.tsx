"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, FolderKanban, Layers, ListChecks, LogOut } from "lucide-react";

function AdminNav() {
  const pathname = usePathname();
  const items = [
    { href: "/admin", label: "Dashboard", icon: BookOpen },
    { href: "/admin/courses", label: "Languages", icon: FolderKanban },
    { href: "/admin/topics", label: "Levels", icon: Layers },
    { href: "/admin/words", label: "Chapters", icon: ListChecks },
  ];
  const handleLogout = () => {
    sessionStorage.removeItem("vocab-master-user");
    localStorage.removeItem("vocab-master-user");
    window.dispatchEvent(new Event("user-updated"));
    window.location.href = "/";
  };

  return (
    <>
      <aside className="hidden w-64 flex-col gap-2 rounded-3xl border bg-white/80 p-4 backdrop-blur md:flex">
        <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Admin</div>
        <div className="mt-2 flex flex-col gap-1">
          {items.map((item) => {
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
        <button
          type="button"
          onClick={handleLogout}
          className="mt-auto flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-muted-foreground transition hover:bg-muted"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </aside>

      <nav className="fixed inset-x-0 bottom-0 z-50 md:hidden">
        <div className="mx-auto max-w-5xl px-3 pb-4">
          <div className="rounded-3xl border bg-white/90 px-2 py-2 shadow-lg backdrop-blur">
            <div className="grid grid-cols-4 gap-1 text-[11px]">
              {items.map((item) => {
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
    </>
  );
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex max-w-6xl gap-6 px-4 py-6 pb-28 md:pb-10">
      <AdminNav />
      <div className="flex-1">{children}</div>
    </div>
  );
}
