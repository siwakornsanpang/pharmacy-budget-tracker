"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ApiError } from "@/lib/api";
import { loginRequest, registerRequest } from "@/lib/api-services";
import { getStoredUser, setStoredAuth } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
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

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (!username.trim() || !password.trim()) {
      setError("กรุณากรอก Username และ Password");
      return;
    }

    if (mode === "register" && password.trim().length < 6) {
      setError("Password ต้องยาวอย่างน้อย 6 ตัวอักษร");
      return;
    }

    setLoading(true);
    try {
      const result =
        mode === "login"
          ? await loginRequest(username.trim(), password)
          : await registerRequest(
              username.trim(),
              password,
              name.trim() || undefined,
            );

      setStoredAuth(result.token, result.user);
      router.replace("/projects");
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "เกิดข้อผิดพลาด กรุณาลองใหม่";
      setError(message);
    } finally {
      setLoading(false);
    }
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
          <p className="mb-8 max-w-sm text-base leading-relaxed text-fg-muted">
            {mode === "login"
              ? "เข้าสู่ระบบเพื่อดูงบและรายจ่ายของทุกโครงการ"
              : "สมัครบัญชีใหม่เพื่อเริ่มติดตามงบโครงการ"}
          </p>

          <div className="mb-4 grid grid-cols-2 gap-2 rounded-xl border border-border bg-surface/70 p-1">
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setError("");
              }}
              className={`h-9 rounded-lg text-sm font-medium transition ${
                mode === "login"
                  ? "bg-accent text-white"
                  : "text-fg-muted hover:text-fg"
              }`}
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("register");
                setError("");
              }}
              className={`h-9 rounded-lg text-sm font-medium transition ${
                mode === "register"
                  ? "bg-accent text-white"
                  : "text-fg-muted hover:text-fg"
              }`}
            >
              Register
            </button>
          </div>

          <form
            onSubmit={handleSubmit}
            className="flex flex-col gap-5 rounded-2xl border border-border bg-surface/90 p-8 shadow-[var(--shadow)] backdrop-blur-sm"
          >
            {mode === "register" ? (
              <div className="flex flex-col gap-2">
                <label htmlFor="name" className="text-sm font-medium text-fg">
                  Display Name
                </label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="ชื่อที่แสดง (ไม่บังคับ)"
                  className="h-11 rounded-lg border border-border bg-bg-elevated px-3.5 text-sm text-fg outline-none transition placeholder:text-fg-subtle focus:border-accent focus:ring-2 focus:ring-accent-soft"
                />
              </div>
            ) : null}

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
                autoComplete={
                  mode === "login" ? "current-password" : "new-password"
                }
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
              {loading
                ? mode === "login"
                  ? "กำลังเข้าสู่ระบบ..."
                  : "กำลังสมัคร..."
                : mode === "login"
                  ? "เข้าสู่ระบบ"
                  : "สมัครสมาชิก"}
            </button>

            <p className="text-center text-xs text-fg-subtle">
              ครั้งแรกหลัง API พัก อาจรอโหลดนาน ~1 นาที
            </p>
          </form>
        </div>
      </main>
    </div>
  );
}
