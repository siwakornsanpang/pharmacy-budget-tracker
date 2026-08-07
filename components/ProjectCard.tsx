import Link from "next/link";
import type { ProjectStatus, ProjectWithStats } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/format";

type ProjectCardProps = {
  project: ProjectWithStats;
  index?: number;
  onEdit?: (project: ProjectWithStats) => void;
  onDelete?: (project: ProjectWithStats) => void;
};

function progressTone(percent: number): string {
  if (percent >= 90) return "bg-danger";
  if (percent >= 70) return "bg-[#a67c00]";
  return "bg-accent-mid";
}

export function isProjectCompleted(
  endDate: string | null | undefined,
  today = new Date(),
): boolean {
  if (!endDate) return false;
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);
  return end.getTime() < today.getTime();
}

export function resolveProjectStatus(project: {
  status?: ProjectStatus | null;
  endDate?: string | null;
}): ProjectStatus {
  if (project.status === "paused") return "paused";
  // End date already passed → completed (even if stored as active)
  if (isProjectCompleted(project.endDate)) return "completed";
  if (project.status === "completed") return "completed";
  return "active";
}

const STATUS_BADGE: Record<
  ProjectStatus,
  { label: string; className: string }
> = {
  active: {
    label: "Active",
    className: "bg-accent-soft text-accent",
  },
  paused: {
    label: "On Hold",
    className: "bg-[#ebe4c8] text-[#7a6520]",
  },
  completed: {
    label: "Completed",
    className: "bg-[#e4e4e0] text-[#6b6b66]",
  },
};

export function ProjectCard({
  project,
  index = 0,
  onEdit,
  onDelete,
}: ProjectCardProps) {
  const status = resolveProjectStatus(project);
  const isCompleted = status === "completed";
  const isPaused = status === "paused";

  return (
    <div
      className={`animate-fade-up group relative rounded-2xl border p-6 shadow-[var(--shadow)] transition ${
        isCompleted
          ? "border-[#d8d8d0] bg-[#f0f0ec] opacity-75 hover:opacity-90"
          : isPaused
            ? "border-[#ddd4b0] bg-[#f7f4e8] hover:-translate-y-0.5 hover:border-[#c4b87a]/60 hover:shadow-lg"
            : "border-border bg-surface hover:-translate-y-0.5 hover:border-accent-mid/40 hover:shadow-lg"
      }`}
      style={{ animationDelay: `${index * 80}ms` }}
    >
      {(onEdit || onDelete) && (
        <div className="absolute right-4 top-4 z-10 flex gap-1.5">
          {onEdit ? (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onEdit(project);
              }}
              className="rounded-md border border-border bg-surface px-2 py-1 text-xs font-medium text-fg-muted transition hover:border-accent hover:text-accent"
            >
              แก้ไข
            </button>
          ) : null}
          {onDelete ? (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onDelete(project);
              }}
              className="rounded-md border border-border bg-surface px-2 py-1 text-xs font-medium text-fg-muted transition hover:border-danger hover:text-danger"
            >
              ลบ
            </button>
          ) : null}
        </div>
      )}

      <Link href={`/projects/${project.id}`} className="block">
        <div className="mb-3 min-w-0 pr-28">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span
              className={`rounded-md px-2 py-0.5 text-[11px] font-semibold tracking-wide ${STATUS_BADGE[status].className}`}
            >
              {STATUS_BADGE[status].label}
            </span>
            <span
              className={`rounded-lg px-2.5 py-0.5 text-xs font-semibold tabular-nums ${
                isCompleted
                  ? "bg-[#e4e4e0] text-[#6b6b66]"
                  : project.percentUsed >= 90
                    ? "bg-danger-soft text-danger"
                    : "bg-accent-soft text-accent"
              }`}
            >
              {project.percentUsed}%
            </span>
          </div>
          <h2
            className={`truncate font-[family-name:var(--font-display)] text-xl font-semibold tracking-tight group-hover:text-accent ${
              isCompleted ? "text-[#5c5c56]" : "text-fg"
            }`}
          >
            {project.name}
          </h2>
          <p
            className={`mt-1 line-clamp-2 text-sm leading-relaxed ${
              isCompleted ? "text-[#8a8a82]" : "text-fg-muted"
            }`}
          >
            {project.description}
          </p>
        </div>

        <p
          className={`mb-4 text-xs ${isCompleted ? "text-[#9a9a92]" : "text-fg-subtle"}`}
        >
          <span
            className={`font-medium ${isCompleted ? "text-[#7a7a72]" : "text-fg-muted"}`}
          >
            Duration
          </span>
          {" · "}
          {formatDate(project.startDate)} –{" "}
          {project.endDate ? formatDate(project.endDate) : "ไม่ระบุวันจบ"}
        </p>

        <div className="mb-2 flex items-end justify-between gap-2 text-sm">
          <span className={isCompleted ? "text-[#8a8a82]" : "text-fg-muted"}>
            Budget used
          </span>
          <span
            className={`font-semibold tabular-nums ${isCompleted ? "text-[#5c5c56]" : "text-fg"}`}
          >
            {formatCurrency(project.spent)}
            <span
              className={`font-normal ${isCompleted ? "text-[#9a9a92]" : "text-fg-subtle"}`}
            >
              {" "}
              / {formatCurrency(project.budget)}
            </span>
          </span>
        </div>

        <div
          className={`h-2 overflow-hidden rounded-full ${
            isCompleted ? "bg-[#e0e0d8]" : "bg-accent-soft"
          }`}
        >
          <div
            className={`animate-progress h-full rounded-full ${
              isCompleted ? "bg-[#b0b0a4]" : progressTone(project.percentUsed)
            }`}
            style={{ width: `${Math.min(project.percentUsed, 100)}%` }}
          />
        </div>

        <div
          className={`mt-4 flex items-center justify-between text-xs ${
            isCompleted ? "text-[#9a9a92]" : "text-fg-subtle"
          }`}
        >
          <span>Owner · {project.owner}</span>
          <span
            className={
              project.remaining < 0
                ? "font-medium text-danger"
                : isPaused
                  ? "font-medium text-[#7a6520]"
                  : isCompleted
                    ? "text-[#7a7a72]"
                    : "text-fg-subtle"
            }
          >
            {project.remaining < 0
              ? "Over budget"
              : status === "completed"
                ? "Completed"
                : status === "paused"
                  ? "On hold"
                  : "On track"}
          </span>
        </div>
        <div className="mt-1 text-right text-xs text-accent opacity-0 transition group-hover:opacity-100">
          View details →
        </div>
      </Link>
    </div>
  );
}
