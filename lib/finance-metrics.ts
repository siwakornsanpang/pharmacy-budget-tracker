import type { Project, Transaction } from "./types";

export type FinanceMetrics = {
  budget: number;
  spent: number;
  remaining: number;
  percentUsed: number;
  /** Actual − Budget (positive = over budget) */
  variance: number;
  variancePct: number;
  /** Cost Performance Index: budget/spent (>1 under, <1 over) */
  cpi: number;
  transactionCount: number;
  avgTransaction: number;
  largestExpense: number;
  /** Average spend per day since first transaction (or project start) */
  burnRatePerDay: number;
  /** Days until budget depleted at current burn rate */
  runwayDays: number | null;
  /** Estimate at Completion based on burn rate × project duration */
  eac: number | null;
  /** Planned value if spend were linear over project timeline */
  plannedValue: number;
  schedulePct: number;
};

function daysBetween(a: string, b: string): number {
  const ms = new Date(b).getTime() - new Date(a).getTime();
  return Math.max(1, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function computeFinanceMetrics(
  project: Project,
  transactions: Transaction[],
): FinanceMetrics {
  const spent = transactions.reduce((s, t) => s + t.amount, 0);
  const remaining = project.budget - spent;
  const percentUsed =
    project.budget > 0 ? Math.round((spent / project.budget) * 1000) / 10 : 0;
  const variance = spent - project.budget;
  const variancePct =
    project.budget > 0
      ? Math.round((variance / project.budget) * 1000) / 10
      : 0;
  const cpi = spent > 0 ? Math.round((project.budget / spent) * 100) / 100 : 0;

  const amounts = transactions.map((t) => t.amount);
  const largestExpense = amounts.length ? Math.max(...amounts) : 0;
  const avgTransaction =
    amounts.length > 0
      ? Math.round(spent / amounts.length)
      : 0;

  const today = todayISO();
  const sortedDates = transactions
    .map((t) => t.transactionDate)
    .sort();
  const firstSpend = sortedDates[0] ?? project.startDate;
  const elapsedDays = daysBetween(firstSpend, today);
  const burnRatePerDay =
    spent > 0 ? Math.round(spent / elapsedDays) : 0;

  const runwayDays =
    burnRatePerDay > 0 && remaining > 0
      ? Math.ceil(remaining / burnRatePerDay)
      : remaining <= 0
        ? 0
        : null;

  const totalProjectDays = daysBetween(project.startDate, project.endDate);
  const daysElapsed = daysBetween(
    project.startDate,
    today < project.endDate ? today : project.endDate,
  );
  const schedulePct = Math.min(
    100,
    Math.round((daysElapsed / totalProjectDays) * 1000) / 10,
  );
  const plannedValue = Math.round(
    (project.budget * daysElapsed) / totalProjectDays,
  );

  // EAC ≈ spent + (remaining work cost) using burn rate over remaining calendar
  const daysLeft = Math.max(
    0,
    daysBetween(today, project.endDate),
  );
  const eac =
    burnRatePerDay > 0
      ? Math.round(spent + burnRatePerDay * daysLeft)
      : spent;

  return {
    budget: project.budget,
    spent,
    remaining,
    percentUsed,
    variance,
    variancePct,
    cpi,
    transactionCount: transactions.length,
    avgTransaction,
    largestExpense,
    burnRatePerDay,
    runwayDays,
    eac,
    plannedValue,
    schedulePct,
  };
}
