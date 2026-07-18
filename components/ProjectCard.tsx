import Link from "next/link";
import type { ProjectWithStats } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/format";

type ProjectCardProps = {
  project: ProjectWithStats;
  index?: number;
};

function progressTone(percent: number): string {
  if (percent >= 90) return "bg-danger";
  if (percent >= 70) return "bg-[#a67c00]";
  return "bg-accent-mid";
}

export function isProjectCompleted(endDate: string, today = new Date()): boolean {
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);
  return end.getTime() < today.getTime();
}

export function ProjectCard({ project, index = 0 }: ProjectCardProps) {
  const completed = isProjectCompleted(project.endDate);

  return (
    <Link
      href={`/projects/${project.id}`}
      className="animate-fade-up group block rounded-2xl border border-border bg-surface p-6 shadow-[var(--shadow)] transition hover:-translate-y-0.5 hover:border-accent-mid/40 hover:shadow-lg"
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span
              className={`rounded-md px-2 py-0.5 text-[11px] font-semibold tracking-wide ${
                completed
                  ? "bg-bg text-fg-muted"
                  : "bg-accent-soft text-accent"
              }`}
            >
              {completed ? "Completed" : "Active"}
            </span>
          </div>
          <h2 className="truncate font-[family-name:var(--font-display)] text-xl font-semibold tracking-tight text-fg group-hover:text-accent">
            {project.name}
          </h2>
          <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-fg-muted">
            {project.description}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-lg px-2.5 py-1 text-xs font-semibold tabular-nums ${
            project.percentUsed >= 90
              ? "bg-danger-soft text-danger"
              : "bg-accent-soft text-accent"
          }`}
        >
          {project.percentUsed}%
        </span>
      </div>

      <p className="mb-4 text-xs text-fg-subtle">
        <span className="font-medium text-fg-muted">Duration</span>
        {" · "}
        {formatDate(project.startDate)} – {formatDate(project.endDate)}
      </p>

      <div className="mb-2 flex items-end justify-between gap-2 text-sm">
        <span className="text-fg-muted">Budget used</span>
        <span className="font-semibold tabular-nums text-fg">
          {formatCurrency(project.spent)}
          <span className="font-normal text-fg-subtle">
            {" "}
            / {formatCurrency(project.budget)}
          </span>
        </span>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-accent-soft">
        <div
          className={`animate-progress h-full rounded-full ${progressTone(project.percentUsed)}`}
          style={{ width: `${Math.min(project.percentUsed, 100)}%` }}
        />
      </div>

      <div className="mt-4 flex items-center justify-between text-xs text-fg-subtle">
        <span>Owner · {project.owner}</span>
        <span
          className={
            project.remaining < 0 ? "font-medium text-danger" : "text-fg-subtle"
          }
        >
          {project.remaining < 0
            ? "Over budget"
            : project.status === "completed"
              ? "Completed"
              : "On track"}
        </span>
      </div>
      <div className="mt-1 text-right text-xs text-accent opacity-0 transition group-hover:opacity-100">
        View details →
      </div>
    </Link>
  );
}
