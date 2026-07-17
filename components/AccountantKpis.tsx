"use client";

import type { FinanceMetrics } from "@/lib/finance-metrics";
import { formatCurrency, formatNumber } from "@/lib/format";

type AccountantKpisProps = {
  metrics: FinanceMetrics;
};

export function AccountantKpis({ metrics }: AccountantKpisProps) {
  const overspend = metrics.remaining < 0;

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Kpi
        label="% Used"
        explain="เปอร์เซ็นต์งบที่ใช้ไปแล้ว"
        value={`${metrics.percentUsed}%`}
        sub={
          overspend
            ? "ใช้เกินงบแล้ว"
            : metrics.percentUsed >= 70
              ? "ใกล้หมดงบแล้ว"
              : "ยังใช้ได้สบาย"
        }
        tone={
          overspend || metrics.percentUsed >= 90
            ? "bad"
            : metrics.percentUsed >= 70
              ? "warn"
              : "good"
        }
      />
      <Kpi
        label="Daily Spend"
        explain="ใช้เฉลี่ยวันละเท่าไหร่"
        value={formatCurrency(metrics.burnRatePerDay)}
        sub="per day"
        tone="neutral"
      />
      <Kpi
        label="Runway"
        explain="ถ้าใช้ต่อแบบนี้ งบจะหมดใน"
        value={
          overspend
            ? "หมดแล้ว"
            : metrics.runwayDays === null
              ? "ยังนาน"
              : `${formatNumber(metrics.runwayDays)} วัน`
        }
        sub={
          overspend
            ? "ควรรีบดูรายจ่าย"
            : metrics.runwayDays !== null && metrics.runwayDays < 30
              ? "เหลือน้อย ระวังหน่อย"
              : "ยังพอไปได้"
        }
        tone={
          overspend || (metrics.runwayDays !== null && metrics.runwayDays < 30)
            ? "warn"
            : "neutral"
        }
      />
      <Kpi
        label="Largest Expense"
        explain="รายจ่ายก้อนใหญ่สุด"
        value={formatCurrency(metrics.largestExpense)}
        sub={
          metrics.transactionCount > 0
            ? `${formatNumber(metrics.transactionCount)} transactions`
            : "ยังไม่มีรายการ"
        }
        tone="neutral"
      />
    </div>
  );
}

function Kpi({
  label,
  explain,
  value,
  sub,
  tone,
}: {
  label: string;
  explain: string;
  value: string;
  sub?: string;
  tone: "good" | "bad" | "warn" | "neutral";
}) {
  const valueColor =
    tone === "good"
      ? "text-[#2f6b3a]"
      : tone === "bad"
        ? "text-danger"
        : tone === "warn"
          ? "text-[#8a6a00]"
          : "text-fg";

  return (
    <div className="rounded-2xl border border-border bg-surface p-4 shadow-[var(--shadow)]">
      <p className="text-sm font-semibold tracking-tight text-fg">{label}</p>
      <p className="mt-0.5 text-xs text-fg-subtle">{explain}</p>
      <p
        className={`mt-3 font-[family-name:var(--font-display)] text-2xl font-semibold tabular-nums tracking-tight ${valueColor}`}
      >
        {value}
      </p>
      {sub ? <p className="mt-1 text-xs text-fg-muted">{sub}</p> : null}
    </div>
  );
}
