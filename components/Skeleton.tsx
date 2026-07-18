export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-md bg-accent-soft/70 ${className}`}
      aria-hidden
    />
  );
}

export function ProjectCardSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-surface p-6 shadow-[var(--shadow)]">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
        <Skeleton className="h-6 w-12 shrink-0" />
      </div>
      <Skeleton className="mb-4 h-3 w-40" />
      <div className="mb-2 flex justify-between">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-28" />
      </div>
      <Skeleton className="h-2 w-full rounded-full" />
      <div className="mt-4 flex justify-between">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
  );
}

export function ProjectsPageSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="กำลังโหลด">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-border bg-surface p-4 shadow-[var(--shadow)]"
          >
            <Skeleton className="h-3 w-20" />
            <Skeleton className="mt-2 h-7 w-28" />
            <Skeleton className="mt-2 h-3 w-24" />
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <Skeleton className="h-9 w-16" />
        <Skeleton className="h-9 w-20" />
        <Skeleton className="h-9 w-24" />
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <ProjectCardSkeleton />
        <ProjectCardSkeleton />
        <ProjectCardSkeleton />
        <ProjectCardSkeleton />
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-6 py-8" aria-busy="true">
      <div className="mb-6 space-y-3">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-4 w-full max-w-xl" />
        <div className="grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl border border-border bg-surface p-5 shadow-[var(--shadow)]"
            >
              <Skeleton className="h-3 w-24" />
              <Skeleton className="mt-3 h-8 w-32" />
            </div>
          ))}
        </div>
        <Skeleton className="mt-2 h-3 w-full rounded-full" />
      </div>

      <div className="mb-8 space-y-3">
        <Skeleton className="h-6 w-36" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl border border-border bg-surface p-4"
            >
              <Skeleton className="h-3 w-20" />
              <Skeleton className="mt-2 h-6 w-24" />
            </div>
          ))}
        </div>
      </div>

      <div className="mb-8 space-y-3">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-56 w-full rounded-2xl" />
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-surface">
        <div className="space-y-3 p-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
