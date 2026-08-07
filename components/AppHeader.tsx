"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { clearStoredAuth, type AuthUser } from "@/lib/auth";

type AppHeaderProps = {
  user: AuthUser;
  title?: string;
  backHref?: string;
  backLabel?: string;
  nav?: ReactNode;
};

export function AppHeader({
  user,
  title,
  backHref,
  backLabel = "กลับ",
  nav,
}: AppHeaderProps) {
  const router = useRouter();

  function handleLogout() {
    clearStoredAuth();
    router.replace("/login");
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-6 sm:h-16">
        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          {backHref ? (
            <Link
              href={backHref}
              className="shrink-0 text-sm font-medium text-fg-muted transition hover:text-accent"
            >
              ← {backLabel}
            </Link>
          ) : (
            <Link
              href="/projects"
              className="shrink-0 font-[family-name:var(--font-display)] text-xl font-semibold tracking-tight text-accent"
            >
              Budget Tracker
            </Link>
          )}
          {title ? (
            <h1 className="truncate text-base font-semibold text-fg sm:text-lg">
              {title}
            </h1>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <span className="hidden text-sm text-fg-muted sm:inline">
            {user.name}
          </span>
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-fg-muted transition hover:border-accent hover:text-accent"
          >
            Logout
          </button>
        </div>
      </div>
      {nav ? (
        <div className="border-t border-border/70">
          <div className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-6">
            {nav}
          </div>
        </div>
      ) : null}
    </header>
  );
}
