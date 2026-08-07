"use client";

import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { AuthGate } from "@/components/AuthGate";
import { AppHeader } from "@/components/AppHeader";
import { CreateProjectModal } from "@/components/CreateProjectModal";
import { FinanceCharts } from "@/components/FinanceCharts";
import { VendorSummary } from "@/components/VendorSummary";
import { DashboardSkeleton } from "@/components/Skeleton";
import { TransactionFormModal } from "@/components/TransactionFormModal";
import { ProjectMembersPanel } from "@/components/ProjectMembersPanel";
import { ProjectPeoplePanel } from "@/components/ProjectPeoplePanel";
import { ApiError } from "@/lib/api";
import {
  createTransaction,
  deleteProject,
  deleteTransaction,
  fetchPeople,
  fetchProject,
  fetchTransactions,
  updateProject,
  updateTransaction,
  type ProjectInput,
  type TransactionInput,
} from "@/lib/api-services";
import { computeFinanceMetrics } from "@/lib/finance-metrics";
import {
  exportProjectSummaryCsv,
  exportTransactionsCsv,
} from "@/lib/export";
import {
  formatCurrency,
  formatCurrencyPrecise,
  formatDate,
} from "@/lib/format";
import type {
  ProjectPerson,
  ProjectWithStats,
  Transaction,
  TransactionKind,
} from "@/lib/types";

type ProjectDashboardProps = {
  projectId: string;
};

type SortKey = "date" | "amount" | "category" | "title";

function progressTone(percent: number): string {
  if (percent >= 90) return "bg-danger";
  if (percent >= 70) return "bg-[#a67c00]";
  return "bg-accent-mid";
}

export function ProjectDashboard({ projectId }: ProjectDashboardProps) {
  const router = useRouter();
  const [project, setProject] = useState<ProjectWithStats | null>(null);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [people, setPeople] = useState<ProjectPerson[]>([]);
  const [showEditProject, setShowEditProject] = useState(false);
  const [showTxnModal, setShowTxnModal] = useState(false);
  const [editingTxn, setEditingTxn] = useState<Transaction | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [txnDefaultKind, setTxnDefaultKind] =
    useState<TransactionKind>("general");
  const [kindFilter, setKindFilter] = useState<"all" | TransactionKind>("all");

  async function reload() {
    setLoadError("");
    try {
      const [projectData, txnData, peopleData] = await Promise.all([
        fetchProject(projectId),
        fetchTransactions(projectId),
        fetchPeople(projectId),
      ]);
      setProject(projectData);
      setTransactions(txnData);
      setPeople(peopleData);
    } catch (err) {
      setProject(null);
      setTransactions([]);
      setPeople([]);
      setLoadError(
        err instanceof ApiError ? err.message : "โหลดข้อมูลไม่สำเร็จ",
      );
    } finally {
      setReady(true);
    }
  }

  useEffect(() => {
    setReady(false);
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortAsc, setSortAsc] = useState(false);

  const metrics = useMemo(
    () => (project ? computeFinanceMetrics(project, transactions) : null),
    [project, transactions],
  );

  const categoriesInUse = useMemo(() => {
    const set = new Set(transactions.map((t) => t.category));
    return [...set].sort();
  }, [transactions]);

  const filtered = useMemo(() => {
    let list = [...transactions];
    if (kindFilter !== "all") {
      list = list.filter((t) => (t.kind ?? "general") === kindFilter);
    }
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.to.toLowerCase().includes(q) ||
          t.id.toLowerCase().includes(q) ||
          (t.note ?? "").toLowerCase().includes(q),
      );
    }
    if (filterCategory !== "all") {
      list = list.filter((t) => t.category === filterCategory);
    }
    if (dateFrom) {
      list = list.filter((t) => t.transactionDate >= dateFrom);
    }
    if (dateTo) {
      list = list.filter((t) => t.transactionDate <= dateTo);
    }

    list.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "date") {
        cmp =
          new Date(a.transactionDate).getTime() -
          new Date(b.transactionDate).getTime();
      } else if (sortKey === "amount") {
        cmp = a.amount - b.amount;
      } else if (sortKey === "category") {
        cmp = a.category.localeCompare(b.category);
      } else {
        cmp = a.title.localeCompare(b.title);
      }
      return sortAsc ? cmp : -cmp;
    });
    return list;
  }, [
    transactions,
    kindFilter,
    search,
    filterCategory,
    dateFrom,
    dateTo,
    sortKey,
    sortAsc,
  ]);

  const filteredTotal = filtered.reduce((s, t) => s + t.amount, 0);

  const runningById = useMemo(() => {
    const chrono = [...transactions].sort(
      (a, b) =>
        new Date(a.transactionDate).getTime() -
        new Date(b.transactionDate).getTime() || a.id.localeCompare(b.id),
    );
    const map = new Map<string, number>();
    let run = 0;
    for (const t of chrono) {
      run += t.amount;
      map.set(t.id, run);
    }
    return map;
  }, [transactions]);

  function openCreateTransaction(kind: TransactionKind = "general") {
    setEditingTxn(null);
    setTxnDefaultKind(kind);
    void fetchPeople(projectId).then(setPeople).catch(() => undefined);
    setShowTxnModal(true);
  }

  function openEditTransaction(txn: Transaction) {
    setEditingTxn(txn);
    setTxnDefaultKind(txn.kind === "salary" ? "salary" : "general");
    void fetchPeople(projectId).then(setPeople).catch(() => undefined);
    setShowTxnModal(true);
  }

  async function handleSaveTransaction(input: TransactionInput) {
    if (editingTxn) {
      await updateTransaction(editingTxn.id, input);
    } else {
      await createTransaction(projectId, input);
    }
    await reload();
  }

  async function handleDelete(id: string) {
    if (!confirm("ลบรายการนี้ใช่ไหม? ตัวเลขงบจะเปลี่ยนตามด้วย")) return;
    try {
      await deleteTransaction(id);
      if (editingTxn?.id === id) {
        setEditingTxn(null);
        setShowTxnModal(false);
      }
      await reload();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "ลบรายการไม่สำเร็จ");
    }
  }

  async function handleUpdateProject(input: ProjectInput) {
    await updateProject(projectId, input);
    await reload();
  }

  async function handleDeleteProject() {
    if (!project) return;
    if (
      !confirm(
        `ลบโครงการ "${project.name}" ใช่ไหม? รายการธุรกรรมทั้งหมดจะถูกลบด้วย`,
      )
    ) {
      return;
    }
    try {
      await deleteProject(projectId);
      router.replace("/projects");
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "ลบโครงการไม่สำเร็จ");
    }
  }

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortAsc((v) => !v);
    } else {
      setSortKey(key);
      setSortAsc(key === "title" || key === "category");
    }
  }

  if (!ready) {
    return (
      <AuthGate>
        {(user) => (
          <div className="flex min-h-full flex-1 flex-col bg-bg">
            <AppHeader
              user={user}
              backHref="/projects"
              backLabel="Projects"
            />
            <DashboardSkeleton />
          </div>
        )}
      </AuthGate>
    );
  }

  if (!project || !metrics) {
    return (
      <AuthGate>
        {(user) => (
          <div className="flex min-h-full flex-1 flex-col bg-bg">
            <AppHeader
              user={user}
              backHref="/projects"
              backLabel="Projects"
            />
            <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center gap-3 px-6 py-20">
              <p className="text-fg-muted">
                {loadError || "ไม่พบโครงการนี้"}
              </p>
              {loadError ? (
                <button
                  type="button"
                  onClick={() => {
                    setReady(false);
                    void reload();
                  }}
                  className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white"
                >
                  ลองใหม่
                </button>
              ) : null}
            </main>
          </div>
        )}
      </AuthGate>
    );
  }

  return (
    <AuthGate>
      {(user) => (
        <div className="flex min-h-full flex-1 flex-col bg-bg">
          <div
            className="pointer-events-none fixed inset-0 -z-10"
            style={{
              background:
                "radial-gradient(ellipse 50% 35% at 20% 0%, #ebebc0 0%, transparent 55%), linear-gradient(180deg, #f0f0dc 0%, #f5f5eb 100%)",
            }}
          />
          <AppHeader
            user={user}
            backHref="/projects"
            backLabel="Projects"
            title={project.name}
          />

          <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8 print:max-w-none print:px-0">
            {/* Header + export */}
            <section className="animate-fade-up mb-6">
              <div className="mb-2 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-sm text-fg-muted">
                    Project Dashboard
                  </p>
                  <h2 className="mt-1 font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight text-fg sm:text-3xl">
                    {project.name}
                  </h2>
                </div>
                <div className="flex flex-wrap gap-2 print:hidden">
                  {project.canEditProject ? (
                    <button
                      type="button"
                      onClick={() => setShowEditProject(true)}
                      className="h-9 rounded-lg border border-border px-3 text-sm font-medium text-fg-muted transition hover:border-accent hover:text-accent"
                    >
                      Edit Project
                    </button>
                  ) : null}
                  {project.canDeleteProject ? (
                    <button
                      type="button"
                      onClick={() => void handleDeleteProject()}
                      className="h-9 rounded-lg border border-border px-3 text-sm font-medium text-fg-muted transition hover:border-danger hover:text-danger"
                    >
                      Delete
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() =>
                      exportTransactionsCsv(project.name, filtered)
                    }
                    className="h-9 rounded-lg border border-border px-3 text-sm font-medium text-fg-muted transition hover:border-accent hover:text-accent"
                  >
                    Export CSV
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      exportProjectSummaryCsv(project.name, [
                        { label: "ชื่อโครงการ", value: project.name },
                        { label: "ผู้ดูแล", value: project.owner },
                        { label: "งบทั้งหมด", value: project.budget },
                        { label: "ใช้ไปแล้ว", value: metrics.spent },
                        { label: "เหลือ", value: metrics.remaining },
                        { label: "เกิน/เหลืองบ", value: metrics.variance },
                        { label: "เกิน/เหลือ %", value: metrics.variancePct },
                        { label: "ใช้เงินคุ้มไหม", value: metrics.cpi },
                        {
                          label: "ใช้เฉลี่ยต่อวัน",
                          value: metrics.burnRatePerDay,
                        },
                        {
                          label: "คาดว่าจะใช้ทั้งหมด",
                          value: metrics.eac ?? "",
                        },
                        {
                          label: "ตามแผนควรใช้ไปแล้ว",
                          value: metrics.plannedValue,
                        },
                      ])
                    }
                    className="h-9 rounded-lg border border-border px-3 text-sm font-medium text-fg-muted transition hover:border-accent hover:text-accent"
                  >
                    Export Summary
                  </button>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="h-9 rounded-lg border border-border px-3 text-sm font-medium text-fg-muted transition hover:border-accent hover:text-accent"
                  >
                    Print
                  </button>
                  {project.canEditTransactions ? (
                    <>
                      <button
                        type="button"
                        onClick={() => openCreateTransaction("general")}
                        className="h-9 rounded-lg bg-accent px-3 text-sm font-semibold text-white transition hover:bg-accent-hover"
                      >
                        + รายจ่ายทั่วไป
                      </button>
                      <button
                        type="button"
                        onClick={() => openCreateTransaction("salary")}
                        className="h-9 rounded-lg border border-accent px-3 text-sm font-semibold text-accent transition hover:bg-accent-soft"
                      >
                        + ค่าแรง
                      </button>
                    </>
                  ) : null}
                </div>
              </div>

              <p className="mb-4 max-w-2xl text-sm leading-relaxed text-fg-muted">
                {project.description}
              </p>

              <div className="grid gap-4 sm:grid-cols-3">
                <StatBlock
                  label="Total Budget"
                  value={formatCurrency(project.budget)}
                />
                <StatBlock
                  label="Spent"
                  value={formatCurrency(metrics.spent)}
                  accent
                />
                <StatBlock
                  label={metrics.remaining >= 0 ? "Remaining" : "Over Budget"}
                  value={formatCurrency(Math.abs(metrics.remaining))}
                  danger={metrics.remaining < 0}
                  good={metrics.remaining >= 0}
                />
              </div>

              <div className="mt-5">
                <div className="mb-2 flex justify-between text-xs text-fg-subtle">
                  <span>
                    {formatDate(project.startDate)} –{" "}
                    {project.endDate
                      ? formatDate(project.endDate)
                      : "ไม่ระบุวันจบ"}
                  </span>
                  <span>Owner · {project.owner}</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-accent-soft">
                  <div
                    className={`animate-progress h-full rounded-full ${progressTone(metrics.percentUsed)}`}
                    style={{
                      width: `${Math.min(metrics.percentUsed, 100)}%`,
                    }}
                  />
                </div>
              </div>
            </section>

            {/* Charts + vendors */}
            <section
              className="animate-fade-up mb-8"
              style={{ animationDelay: "80ms" }}
            >
              <h3 className="mb-4 text-lg font-semibold text-fg">
                Charts
              </h3>
              <div className="mb-5">
                <FinanceCharts
                  transactions={transactions}
                  budget={project.budget}
                  spent={metrics.spent}
                />
              </div>
              <VendorSummary transactions={transactions} />
            </section>

            <section
              className="animate-fade-up mb-8 grid gap-5 print:hidden lg:grid-cols-2"
              style={{ animationDelay: "90ms" }}
            >
              <ProjectMembersPanel
                projectId={projectId}
                canManage={Boolean(project.canManageMembers)}
              />
              <ProjectPeoplePanel
                projectId={projectId}
                canManage={Boolean(project.canManagePeople)}
              />
            </section>

            {/* Transactions */}
            <section
              className="animate-fade-up mb-6 print:hidden"
              style={{ animationDelay: "100ms" }}
            >
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-lg font-semibold text-fg">
                  Transactions
                </h3>
                {project.canEditTransactions ? (
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => openCreateTransaction("general")}
                      className="h-10 rounded-lg bg-accent px-4 text-sm font-semibold text-white transition hover:bg-accent-hover"
                    >
                      + รายจ่ายทั่วไป
                    </button>
                    <button
                      type="button"
                      onClick={() => openCreateTransaction("salary")}
                      className="h-10 rounded-lg border border-accent px-4 text-sm font-semibold text-accent transition hover:bg-accent-soft"
                    >
                      + ค่าแรง
                    </button>
                  </div>
                ) : null}
              </div>

              <div className="mb-4 flex flex-wrap gap-2">
                {(
                  [
                    ["all", "ทั้งหมด"],
                    ["general", "รายจ่ายทั่วไป"],
                    ["salary", "ค่าแรง"],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setKindFilter(key)}
                    className={`h-8 rounded-lg px-3 text-xs font-medium transition ${
                      kindFilter === key
                        ? "bg-accent text-white"
                        : "border border-border text-fg-muted hover:border-accent hover:text-accent"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Filters */}
              <div className="mb-4 grid gap-3 rounded-2xl border border-border bg-surface p-4 sm:grid-cols-2 lg:grid-cols-5">
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search title, payee, ref, note..."
                  className="input lg:col-span-2"
                />
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="input"
                >
                  <option value="all">All categories</option>
                  {categoriesInUse.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="input"
                  title="จากวันที่"
                />
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="input"
                  title="ถึงวันที่"
                />
              </div>
              <p className="mb-3 text-xs text-fg-subtle">
                แสดง {filtered.length} จาก {transactions.length} รายการ · ยอดรวมที่กรอง{" "}
                <span className="font-semibold text-fg">
                  {formatCurrencyPrecise(filteredTotal)}
                </span>
              </p>
            </section>

            <section
              className="animate-fade-up overflow-hidden rounded-2xl border border-border bg-surface shadow-[var(--shadow)]"
              style={{ animationDelay: "140ms" }}
            >
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-border bg-bg-elevated text-xs uppercase tracking-wide text-fg-subtle">
                      <th className="px-4 py-3 font-medium">
                        <SortBtn
                          active={sortKey === "date"}
                          asc={sortAsc}
                          onClick={() => toggleSort("date")}
                        >
                          Date
                        </SortBtn>
                      </th>
                      <th className="px-4 py-3 font-medium">
                        <SortBtn
                          active={sortKey === "title"}
                          asc={sortAsc}
                          onClick={() => toggleSort("title")}
                        >
                          Detail
                        </SortBtn>
                      </th>
                      <th className="px-4 py-3 font-medium">Paid To</th>
                      <th className="px-4 py-3 text-right font-medium">
                        <SortBtn
                          active={sortKey === "amount"}
                          asc={sortAsc}
                          onClick={() => toggleSort("amount")}
                          right
                        >
                          Amount
                        </SortBtn>
                      </th>
                      <th className="px-4 py-3 text-right font-medium">
                        Running
                      </th>
                      <th className="px-4 py-3 text-right font-medium print:hidden">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-5 py-12 text-center text-fg-muted"
                        >
                          ไม่พบรายการตามเงื่อนไขที่กรอง
                        </td>
                      </tr>
                    ) : (
                      filtered.map((txn) => {
                        const isSalary = (txn.kind ?? "general") === "salary";
                        return (
                          <tr
                            key={txn.id}
                            className="border-b border-border/70 last:border-0 transition hover:bg-accent-soft/30"
                          >
                            <td className="whitespace-nowrap px-4 py-3.5 tabular-nums text-fg-muted">
                              {formatDate(txn.transactionDate)}
                            </td>
                            <td className="px-4 py-3.5">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-medium text-fg">
                                  {txn.title}
                                </span>
                                <span
                                  className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                                    isSalary
                                      ? "bg-accent-soft text-accent"
                                      : "bg-bg text-fg-muted"
                                  }`}
                                >
                                  {isSalary ? "ค่าแรง" : "ทั่วไป"}
                                </span>
                              </div>
                              <p className="mt-1 text-xs text-fg-subtle">
                                {txn.category}
                                {txn.note ? ` · ${txn.note}` : ""}
                              </p>
                            </td>
                            <td className="px-4 py-3.5 text-fg-muted">
                              {txn.to}
                            </td>
                            <td className="px-4 py-3.5 text-right font-semibold tabular-nums text-fg">
                              {formatCurrencyPrecise(txn.amount)}
                            </td>
                            <td className="px-4 py-3.5 text-right tabular-nums text-fg-muted">
                              {formatCurrency(
                                runningById.get(txn.id) ?? txn.amount,
                              )}
                            </td>
                            <td className="px-4 py-3.5 print:hidden">
                              <div className="flex flex-wrap items-center justify-end gap-2">
                                {txn.receiptUrl ? (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setReceiptPreview(txn.receiptUrl!)
                                    }
                                    className="inline-flex h-9 items-center rounded-lg border border-accent bg-accent-soft px-3 text-xs font-semibold text-accent transition hover:bg-accent hover:text-white"
                                  >
                                    ดูใบเสร็จ
                                  </button>
                                ) : null}
                                {project.canEditTransactions ? (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => openEditTransaction(txn)}
                                      className="inline-flex h-9 items-center rounded-lg border border-border px-3 text-xs font-medium text-fg-muted transition hover:border-accent hover:text-accent"
                                    >
                                      แก้ไข
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDelete(txn.id)}
                                      className="inline-flex h-9 items-center rounded-lg border border-border px-3 text-xs font-medium text-fg-muted transition hover:border-danger hover:text-danger"
                                    >
                                      ลบ
                                    </button>
                                  </>
                                ) : null}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                  {filtered.length > 0 ? (
                    <tfoot>
                      <tr className="border-t border-border bg-bg-elevated">
                        <td
                          colSpan={3}
                          className="px-4 py-3 text-xs font-medium uppercase text-fg-subtle"
                        >
                          รวมตาม Filter
                        </td>
                        <td className="px-4 py-3 text-right font-semibold tabular-nums text-fg">
                          {formatCurrencyPrecise(filteredTotal)}
                        </td>
                        <td colSpan={2} />
                      </tr>
                    </tfoot>
                  ) : null}
                </table>
              </div>
            </section>
          </main>

          {receiptPreview ? (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <button
                type="button"
                className="absolute inset-0 bg-[#2a2a14]/50 backdrop-blur-[2px]"
                aria-label="ปิด"
                onClick={() => setReceiptPreview(null)}
              />
              <div className="relative z-10 flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-[var(--shadow)]">
                <div className="flex items-center justify-between border-b border-border px-4 py-3">
                  <h3 className="text-sm font-semibold text-fg">ใบเสร็จ</h3>
                  <div className="flex items-center gap-2">
                    <a
                      href={receiptPreview}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-fg-muted hover:border-accent hover:text-accent"
                    >
                      เปิดแท็บใหม่
                    </a>
                    <button
                      type="button"
                      onClick={() => setReceiptPreview(null)}
                      className="rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-white hover:bg-accent-hover"
                    >
                      ปิด
                    </button>
                  </div>
                </div>
                <div className="flex min-h-[280px] flex-1 items-center justify-center overflow-auto bg-bg p-4">
                  {/\.pdf($|\?)/i.test(receiptPreview) ? (
                    <iframe
                      title="receipt"
                      src={receiptPreview}
                      className="h-[70vh] w-full rounded-lg border border-border bg-white"
                    />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={receiptPreview}
                      alt="ใบเสร็จ"
                      className="max-h-[70vh] max-w-full rounded-lg object-contain"
                    />
                  )}
                </div>
              </div>
            </div>
          ) : null}

          <CreateProjectModal
            open={showEditProject}
            initial={project}
            onClose={() => setShowEditProject(false)}
            onSave={handleUpdateProject}
          />

          <TransactionFormModal
            open={showTxnModal}
            projectId={projectId}
            initial={editingTxn}
            people={people}
            defaultKind={txnDefaultKind}
            onClose={() => {
              setShowTxnModal(false);
              setEditingTxn(null);
            }}
            onSave={handleSaveTransaction}
          />
        </div>
      )}
    </AuthGate>
  );
}

function StatBlock({
  label,
  value,
  accent,
  danger,
  good,
}: {
  label: string;
  value: string;
  accent?: boolean;
  danger?: boolean;
  good?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-5 shadow-[var(--shadow)]">
      <p className="text-xs font-medium uppercase tracking-wide text-fg-subtle">
        {label}
      </p>
      <p
        className={`mt-2 font-[family-name:var(--font-display)] text-2xl font-semibold tabular-nums tracking-tight ${
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
    </div>
  );
}

function SortBtn({
  children,
  active,
  asc,
  onClick,
  right,
}: {
  children: ReactNode;
  active: boolean;
  asc: boolean;
  onClick: () => void;
  right?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1 uppercase tracking-wide transition hover:text-accent ${
        right ? "ml-auto" : ""
      } ${active ? "text-accent" : ""}`}
    >
      {children}
      {active ? <span className="normal-case">{asc ? "↑" : "↓"}</span> : null}
    </button>
  );
}
