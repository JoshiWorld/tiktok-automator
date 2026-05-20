"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";

import { useSelectedTikTokAccount } from "@/components/dashboard/active-tiktok-account";

const navItems = [
  { href: "/dashboard", label: "Übersicht" },
  { href: "/dashboard/tiktok", label: "TikTok verbinden" },
  { href: "/dashboard/dms", label: "Nachrichten" },
] as const;

export function DashboardShell() {
  const pathname = usePathname();
  const {
    accounts,
    selectedId,
    setSelectedId,
    isLoading,
    error,
    hydrated,
    allAccounts,
  } = useSelectedTikTokAccount();

  const disconnectedCount = allAccounts.filter((a) => a.disconnectedAt).length;

  return (
    <header className="bg-background/95 supports-[backdrop-filter]:bg-background/80 sticky top-0 z-40 w-full border-b backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3 md:gap-4">
        <Link
          href="/dashboard"
          className="font-semibold tracking-tight text-zinc-100"
        >
          TikTok Automator
        </Link>

        <nav className="flex flex-wrap gap-1 md:gap-2">
          {navItems.map((item) => (
            <Button
              key={item.href}
              variant={pathname === item.href ? "secondary" : "ghost"}
              size="sm"
              className="text-muted-foreground hover:text-foreground cursor-pointer"
              asChild
            >
              <Link href={item.href}>{item.label}</Link>
            </Button>
          ))}
        </nav>

        <div className="flex flex-1 flex-wrap items-center justify-end gap-3">
          {!hydrated || isLoading ? (
            <span className="text-muted-foreground text-sm">Konten…</span>
          ) : error ? (
            <span className="text-destructive max-w-xs truncate text-xs" title={error.message}>
              {error.message}
            </span>
          ) : accounts.length === 0 ? (
            <span className="text-muted-foreground text-sm">
              Kein verbundenes Konto
            </span>
          ) : (
            <label className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground hidden shrink-0 md:inline">
                Aktives Konto
              </span>
              <select
                className={cn(
                  "border-input bg-background text-foreground hover:bg-accent/50 focus-visible:ring-ring max-w-[220px] truncate rounded-md border px-2 py-1.5 text-sm",
                  "outline-none focus-visible:ring-2",
                )}
                value={selectedId ?? ""}
                onChange={(e) =>
                  setSelectedId(e.target.value.length > 0 ? e.target.value : null)
                }
                aria-label="TikTok-Konto für diese Sitzung auswählen"
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {(a.displayName ?? a.handle ?? a.openId).slice(0, 48)}
                  </option>
                ))}
              </select>
            </label>
          )}

          {disconnectedCount > 0 ? (
            <span className="text-muted-foreground text-xs">
              {disconnectedCount} getrennt
            </span>
          ) : null}

          <Button variant="outline" size="sm" className="cursor-pointer" asChild>
            <Link href="/">Startseite</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
