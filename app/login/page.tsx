"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { getStoredUser, setStoredUser } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (getStoredUser()) {
      router.replace("/projects");
    } else {
      setChecking(false);
    }
  }, [router]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (!username.trim() || !password.trim()) {
      setError("กรุณากรอกชื่อผู้ใช้และรหัสผ่าน");
      return;
    }

    setLoading(true);

    // Frontend-only mock login — any credentials work
    window.setTimeout(() => {
      const trimmed = username.trim();
      setStoredUser({
        username: trimmed,
        name: trimmed.charAt(0).toUpperCase() + trimmed.slice(1),
      });
      router.replace("/projects");
    }, 600);
  }

  if (checking) {
    return (
      <div className="flex flex-1 items-center justify-center bg-bg">
        <div className="h-8 w-8 animate-pulse rounded-full bg-accent-soft" />
      </div>
    );
  }

  return (
    <div className="relative flex min-h-full flex-1 overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 10% 20%, #ebebc0 0%, transparent 55%), radial-gradient(ellipse 70% 50% at 90% 80%, #d9d9b8 0%, transparent 50%), linear-gradient(160deg, #f0f0dc 0%, #f5f5eb 40%, #ebebc0 100%)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23737300' fill-opacity='0.08'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
        }}
      />

      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 py-16">
        <div className="animate-fade-up w-full max-w-md">
          <p className="mb-3 font-[family-name:var(--font-display)] text-4xl font-semibold tracking-tight text-accent sm:text-5xl">
            Budget Tracker
          </p>
          <p className="mb-10 max-w-sm text-base leading-relaxed text-fg-muted">
            เข้าสู่ระบบเพื่อดูงบและรายจ่ายของทุกโครงการ
          </p>

          <form
            onSubmit={handleSubmit}
            className="flex flex-col gap-5 rounded-2xl border border-border bg-surface/90 p-8 shadow-[var(--shadow)] backdrop-blur-sm"
          >
            <div className="flex flex-col gap-2">
              <label htmlFor="username" className="text-sm font-medium text-fg">
                Username
              </label>
              <input
                id="username"
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="your username"
                className="h-11 rounded-lg border border-border bg-bg-elevated px-3.5 text-sm text-fg outline-none transition placeholder:text-fg-subtle focus:border-accent focus:ring-2 focus:ring-accent-soft"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="password" className="text-sm font-medium text-fg">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="h-11 rounded-lg border border-border bg-bg-elevated px-3.5 text-sm text-fg outline-none transition placeholder:text-fg-subtle focus:border-accent focus:ring-2 focus:ring-accent-soft"
              />
            </div>

            {error ? (
              <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="mt-1 h-11 rounded-lg bg-accent text-sm font-semibold text-white transition hover:bg-accent-hover disabled:opacity-60"
            >
              {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
            </button>

            <p className="text-center text-xs text-fg-subtle">
              Demo · ใส่ Username / Password อะไรก็ได้
            </p>
          </form>
        </div>
      </main>
    </div>
  );
}
