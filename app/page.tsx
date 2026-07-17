"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getStoredUser } from "@/lib/auth";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    const user = getStoredUser();
    router.replace(user ? "/projects" : "/login");
  }, [router]);

  return (
    <div className="flex flex-1 items-center justify-center bg-bg">
      <div className="h-8 w-8 animate-pulse rounded-full bg-accent-soft" />
    </div>
  );
}
