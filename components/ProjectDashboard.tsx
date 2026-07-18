"use client";

import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { AuthGate } from "@/components/AuthGate";
import { AppHeader } from "@/components/AppHeader";
import { CategorySelect } from "@/components/CategorySelect";
import { FinanceCharts } from "@/components/FinanceCharts";
import { AccountantKpis } from "@/components/AccountantKpis";
import { BudgetAlerts } from "@/components/BudgetAlerts";
import { VendorSummary } from "@/components/VendorSummary";
import { ApiError } from "@/lib/api";
import {
  createTransaction,
  deleteTransaction,
  fetchProject,
  fetchTransactions,
} from "@/lib/api-services";
import { computeFinanceMetrics } from "@/lib/finance-metrics";
import { getDefaultCategories } from "@/lib/categories";
import {
  exportProjectSummaryCsv,
  exportTransactionsCsv,
} from "@/lib/export";
import {
  formatCurrency,
  formatCurrencyPrecise,
  formatDate,
} from "@/lib/format";
import type { Project, Transaction } from "@/lib/types";

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
  const defaults = getDefaultCategories();
  const [project, setProject] = useState<Project | null>(null);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  async function reload() {
    setLoadError("");
    try {
      const [projectData, txnData] = await Promise.all([
        fetchProject(projectId),
        fetchTransactions(projectId),
      ]);
      setProject(projectData);
      setTransactions(txnData);
    } catch (err) {
      setProject(null);
      setTransactions([]);
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

  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(defaults[0] ?? "อื่นๆ");
  const [transactionDate, setTransactionDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [amount, setAmount] = useState("");
  const [to, setTo] = useState("");
  const [note, setNote] = useState("");
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

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

  function resetForm() {
    setTitle("");
    setCategory(defaults[0] ?? "อื่นๆ");
    setTransactionDate(new Date().toISOString().slice(0, 10));
    setAmount("");
    setTo("");
    setNote("");
    setFormError("");
  }

  async function handleAddTransaction(e: FormEvent) {
    e.preventDefault();
    setFormError("");

    const parsedAmount = Number(amount.replace(/,/g, ""));
    if (!title.trim() || !to.trim() || !transactionDate || !category.trim()) {
      setFormError("กรุณากรอกข้อมูลให้ครบ");
      return;
    }
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setFormError("จำนวนเงินต้องมากกว่า 0");
      return;
    }

    setSaving(true);
    try {
      await createTransaction(projectId, {
        title: title.trim(),
        category: category.trim(),
        transactionDate,
        amount: parsedAmount,
        to: to.trim(),
        note: note.trim() || undefined,
      });
      await reload();
      resetForm();
      setShowForm(false);
    } catch (err) {
      setFormError(
        err instanceof ApiError ? err.message : "บันทึกรายการไม่สำเร็จ",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("ลบรายการนี้ใช่ไหม? ตัวเลขงบจะเปลี่ยนตามด้วย")) return;
    try {
      await deleteTransaction(id);
      await reload();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "ลบรายการไม่สำเร็จ");
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
      <div className="flex flex-1 items-center justify-center bg-bg">
        <div className="h-8 w-8 animate-pulse rounded-full bg-accent-soft" />
      </div>
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
                  <span
                    className={`rounded-lg px-3 py-1.5 text-sm font-semibold tabular-nums ${
                      metrics.percentUsed >= 90
                        ? "bg-danger-soft text-danger"
                        : "bg-accent-soft text-accent"
                    }`}
                  >
                    ใช้ไป {metrics.percentUsed}%
                  </span>
                </div>
              </div>

              <p className="mb-4 max-w-2xl text-sm leading-relaxed text-fg-muted">
                {project.description}
              </p>

              <div className="mb-5">
                <BudgetAlerts metrics={metrics} />
              </div>

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
                    {formatDate(project.endDate)}
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

            {/* Accountant KPIs */}
            <section
              className="animate-fade-up mb-8"
              style={{ animationDelay: "40ms" }}
            >
              <h3 className="mb-1 text-lg font-semibold text-fg">
                Quick Summary
              </h3>
              <p className="mb-3 text-sm text-fg-muted">
                ตัวเลขสำคัญแบบเข้าใจง่าย
              </p>
              <AccountantKpis metrics={metrics} />
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

            {/* Transactions */}
            <section
              className="animate-fade-up mb-6 print:hidden"
              style={{ animationDelay: "100ms" }}
            >
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-lg font-semibold text-fg">
                  Transactions
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm((v) => !v);
                    setFormError("");
                  }}
                  className="h-10 rounded-lg bg-accent px-4 text-sm font-semibold text-white transition hover:bg-accent-hover"
                >
                  {showForm ? "Close" : "+ Add Transaction"}
                </button>
              </div>

              {showForm ? (
                <form
                  onSubmit={handleAddTransaction}
                  className="mb-6 grid gap-4 rounded-2xl border border-border bg-surface p-6 shadow-[var(--shadow)] sm:grid-cols-2 lg:grid-cols-3"
                >
                  <Field label="Title">
                    <input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="เช่น ค่าจ้างออกแบบ, ค่าอุปกรณ์"
                      className="input"
                    />
                  </Field>
                  <Field label="Category">
                    <CategorySelect value={category} onChange={setCategory} />
                  </Field>
                  <Field label="Date">
                    <input
                      type="date"
                      value={transactionDate}
                      onChange={(e) => setTransactionDate(e.target.value)}
                      className="input"
                    />
                  </Field>
                  <Field label="Amount (THB)">
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      className="input"
                    />
                  </Field>
                  <Field label="Paid To">
                    <input
                      value={to}
                      onChange={(e) => setTo(e.target.value)}
                      placeholder="ชื่อคน / ร้านค้า / บริษัท"
                      className="input"
                    />
                  </Field>
                  <Field label="Note (optional)">
                    <input
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="เช่น เลขใบเสร็จ, รายละเอียดเพิ่มเติม"
                      className="input"
                    />
                  </Field>
                  <div className="flex items-end sm:col-span-2 lg:col-span-3">
                    <button
                      type="submit"
                      disabled={saving}
                      className="h-11 rounded-lg bg-accent px-6 text-sm font-semibold text-white transition hover:bg-accent-hover disabled:opacity-60"
                    >
                      {saving ? "Saving..." : "Save"}
                    </button>
                  </div>
                  {formError ? (
                    <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger sm:col-span-2 lg:col-span-3">
                      {formError}
                    </p>
                  ) : null}
                </form>
              ) : null}

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
                <table className="w-full min-w-[860px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-border bg-bg-elevated text-xs uppercase tracking-wide text-fg-subtle">
                      <th className="px-4 py-3 font-medium">Ref</th>
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
                          Title
                        </SortBtn>
                      </th>
                      <th className="px-4 py-3 font-medium">
                        <SortBtn
                          active={sortKey === "category"}
                          asc={sortAsc}
                          onClick={() => toggleSort("category")}
                        >
                          Category
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
                      <th className="px-4 py-3 font-medium print:hidden"> </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 ? (
                      <tr>
                        <td
                          colSpan={8}
                          className="px-5 py-12 text-center text-fg-muted"
                        >
                          ไม่พบรายการตามเงื่อนไขที่กรอง
                        </td>
                      </tr>
                    ) : (
                      filtered.map((txn) => (
                        <tr
                          key={txn.id}
                          className="border-b border-border/70 last:border-0 transition hover:bg-accent-soft/30"
                        >
                          <td className="px-4 py-3 font-mono text-xs text-fg-subtle">
                            {txn.id}
                          </td>
                          <td className="px-4 py-3 tabular-nums text-fg-muted">
                            {formatDate(txn.transactionDate)}
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-medium text-fg">{txn.title}</div>
                            {txn.note ? (
                              <div className="mt-0.5 text-xs text-fg-subtle">
                                {txn.note}
                              </div>
                            ) : null}
                          </td>
                          <td className="px-4 py-3">
                            <span className="rounded-md bg-bg px-2 py-0.5 text-xs text-fg-muted">
                              {txn.category}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-fg-muted">{txn.to}</td>
                          <td className="px-4 py-3 text-right font-semibold tabular-nums text-fg">
                            {formatCurrencyPrecise(txn.amount)}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums text-fg-muted">
                            {formatCurrency(
                              runningById.get(txn.id) ?? txn.amount,
                            )}
                          </td>
                          <td className="px-4 py-3 text-right print:hidden">
                            <button
                              type="button"
                              onClick={() => handleDelete(txn.id)}
                              className="text-xs text-fg-subtle hover:text-danger"
                            >
                              ลบ
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {filtered.length > 0 ? (
                    <tfoot>
                      <tr className="border-t border-border bg-bg-elevated">
                        <td
                          colSpan={5}
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

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-fg-muted">{label}</span>
      {children}
    </label>
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
