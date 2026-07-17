"use client";

import { useEffect, useMemo, useState } from "react";
import { AuthGate } from "@/components/AuthGate";
import { AppHeader } from "@/components/AppHeader";
import { ProjectCard, isProjectCompleted } from "@/components/ProjectCard";
import { CreateProjectModal } from "@/components/CreateProjectModal";
import { addProject, loadProjects, loadTransactions } from "@/lib/storage";
import {
  calcPercentUsed,
  formatCurrency,
  formatSignedCurrency,
} from "@/lib/format";
import { downloadCsv } from "@/lib/export";
import type { Project, ProjectWithStats } from "@/lib/types";

type StatusFilter = "all" | "active" | "completed";

function buildProjectStats(
  projects: Project[],
  transactions: ReturnType<typeof loadTransactions>,
): ProjectWithStats[] {
  return projects.map((project) => {
    const spent = transactions
      .filter((t) => t.projectId === project.id)
      .reduce((sum, t) => sum + t.amount, 0);
    const variance = spent - project.budget;

    return {
      ...project,
      spent,
      remaining: project.budget - spent,
      percentUsed: calcPercentUsed(spent, project.budget),
      variance,
      variancePct:
        project.budget > 0
          ? Math.round((variance / project.budget) * 1000) / 10
          : 0,
    };
  });
}

export default function ProjectsPage() {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [projects, setProjects] = useState<Project[]>([]);
  const [transactions, setTransactions] = useState<
    ReturnType<typeof loadTransactions>
  >([]);
  const [ready, setReady] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    setProjects(loadProjects());
    setTransactions(loadTransactions());
    setReady(true);
  }, []);

  const withStats = useMemo(
    () => buildProjectStats(projects, transactions),
    [projects, transactions],
  );

  const filtered = useMemo(() => {
    return withStats.filter((p) => {
      const q = query.toLowerCase();
      const matchQuery =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.owner.toLowerCase().includes(q);

      if (!matchQuery) return false;

      const completed = isProjectCompleted(p.endDate);
      if (statusFilter === "active") return !completed;
      if (statusFilter === "completed") return completed;
      return true;
    });
  }, [withStats, query, statusFilter]);

  const statusCounts = useMemo(() => {
    const completed = withStats.filter((p) =>
      isProjectCompleted(p.endDate),
    ).length;
    return {
      all: withStats.length,
      active: withStats.length - completed,
      completed,
    };
  }, [withStats]);

  const portfolio = useMemo(() => {
    const budget = withStats.reduce((s, p) => s + p.budget, 0);
    const spent = withStats.reduce((s, p) => s + p.spent, 0);
    const overCount = withStats.filter((p) => p.spent > p.budget).length;
    const warnCount = withStats.filter(
      (p) => p.percentUsed >= 70 && p.spent <= p.budget,
    ).length;
    return {
      budget,
      spent,
      remaining: budget - spent,
      variance: spent - budget,
      projectCount: withStats.length,
      overCount,
      warnCount,
    };
  }, [withStats]);

  function handleCreate(project: Project) {
    const next = addProject(project);
    setProjects(next);
  }

  function exportPortfolio() {
    downloadCsv(
      `projects_summary_${new Date().toISOString().slice(0, 10)}.csv`,
      [
        "Project",
        "Owner",
        "Budget",
        "Spent",
        "Remaining",
        "Variance",
        "% Used",
        "Start",
        "End",
        "Status",
      ],
      withStats.map((p) => [
        p.name,
        p.owner,
        p.budget,
        p.spent,
        p.remaining,
        p.variance,
        p.percentUsed,
        p.startDate,
        p.endDate,
        isProjectCompleted(p.endDate) ? "Completed" : "Active",
      ]),
    );
  }

  const filters: { key: StatusFilter; label: string; count: number }[] = [
    { key: "all", label: "All", count: statusCounts.all },
    { key: "active", label: "Active", count: statusCounts.active },
    { key: "completed", label: "Completed", count: statusCounts.completed },
  ];

  return (
    <AuthGate>
      {(user) => (
        <div className="flex min-h-full flex-1 flex-col bg-bg">
          <div
            className="pointer-events-none fixed inset-0 -z-10"
            style={{
              background:
                "radial-gradient(ellipse 60% 40% at 80% 0%, #ebebc0 0%, transparent 50%), linear-gradient(180deg, #f0f0dc 0%, #f5f5eb 100%)",
            }}
          />
          <AppHeader user={user} />

          <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
            <div className="animate-fade-up mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight text-fg sm:text-4xl">
                  Projects
                </h1>
                <p className="mt-2 text-sm text-fg-muted">
                  ภาพรวมงบทุกโครงการ · กดเข้าไปดู Dashboard ได้เลย
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search projects..."
                  className="h-10 w-full rounded-lg border border-border bg-surface px-3.5 text-sm outline-none transition placeholder:text-fg-subtle focus:border-accent focus:ring-2 focus:ring-accent-soft sm:w-52"
                />
                <button
                  type="button"
                  onClick={exportPortfolio}
                  className="h-10 shrink-0 rounded-lg border border-border px-4 text-sm font-medium text-fg-muted transition hover:border-accent hover:text-accent"
                >
                  Export
                </button>
                <button
                  type="button"
                  className="h-10 shrink-0 rounded-lg bg-accent px-4 text-sm font-semibold text-white transition hover:bg-accent-hover"
                  onClick={() => setShowCreate(true)}
                >
                  + New Project
                </button>
              </div>
            </div>

            {ready ? (
              <div className="animate-fade-up mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <PortfolioStat
                  label="Total Budget"
                  value={formatCurrency(portfolio.budget)}
                />
                <PortfolioStat
                  label="Total Spent"
                  value={formatCurrency(portfolio.spent)}
                  accent
                />
                <PortfolioStat
                  label="Remaining"
                  value={formatCurrency(Math.abs(portfolio.remaining))}
                  danger={portfolio.remaining < 0}
                  good={portfolio.remaining >= 0}
                  sub={
                    portfolio.remaining < 0 ? "Over budget" : "Still available"
                  }
                />
                <PortfolioStat
                  label="Projects"
                  value={`${portfolio.projectCount}`}
                  sub={
                    portfolio.overCount > 0 || portfolio.warnCount > 0
                      ? `Over ${portfolio.overCount} · Watch ${portfolio.warnCount}`
                      : "All looking good"
                  }
                />
              </div>
            ) : null}

            {ready ? (
              <div className="animate-fade-up mb-6 flex flex-wrap items-center gap-2">
                <span className="mr-1 text-xs font-medium uppercase tracking-wide text-fg-subtle">
                  Filter
                </span>
                {filters.map((f) => (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => setStatusFilter(f.key)}
                    className={`h-9 rounded-lg px-3 text-sm font-medium transition ${
                      statusFilter === f.key
                        ? "bg-accent text-white"
                        : "border border-border bg-surface text-fg-muted hover:border-accent hover:text-accent"
                    }`}
                  >
                    {f.label}
                    <span className="ml-1.5 tabular-nums opacity-70">
                      {f.count}
                    </span>
                  </button>
                ))}
              </div>
            ) : null}

            {!ready ? (
              <div className="flex justify-center py-20">
                <div className="h-8 w-8 animate-pulse rounded-full bg-accent-soft" />
              </div>
            ) : filtered.length === 0 ? (
              <p className="animate-fade-in py-20 text-center text-fg-muted">
                ไม่พบโครงการตามเงื่อนไขที่เลือก
              </p>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2">
                {filtered.map((project, i) => (
                  <ProjectCard key={project.id} project={project} index={i} />
                ))}
              </div>
            )}
          </main>

          <CreateProjectModal
            open={showCreate}
            onClose={() => setShowCreate(false)}
            onCreate={handleCreate}
          />
        </div>
      )}
    </AuthGate>
  );
}

function PortfolioStat({
  label,
  value,
  sub,
  accent,
  danger,
  good,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
  danger?: boolean;
  good?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4 shadow-[var(--shadow)]">
      <p className="text-[11px] font-medium uppercase tracking-wide text-fg-subtle">
        {label}
      </p>
      <p
        className={`mt-1.5 font-[family-name:var(--font-display)] text-xl font-semibold tabular-nums ${
          danger
            ? "text-danger"
            : good
              ? "text-[#2f6b3a]"
              : accent
                ? "text-accent"
                : "text-fg"
        }`}
      >
        {value}
      </p>
      {sub ? <p className="mt-1 text-xs text-fg-muted">{sub}</p> : null}
    </div>
  );
}
