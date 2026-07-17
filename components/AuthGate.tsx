"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { getStoredUser, type AuthUser } from "@/lib/auth";

type AuthGateProps = {
  children: (user: AuthUser) => ReactNode;
};

export function AuthGate({ children }: AuthGateProps) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = getStoredUser();
    if (!stored) {
      router.replace("/login");
      return;
    }
    setUser(stored);
    setReady(true);
  }, [router]);

  if (!ready || !user) {
    return (
      <div className="flex flex-1 items-center justify-center bg-bg">
        <div className="h-8 w-8 animate-pulse rounded-full bg-accent-soft" />
      </div>
    );
  }

  return <>{children(user)}</>;
}
