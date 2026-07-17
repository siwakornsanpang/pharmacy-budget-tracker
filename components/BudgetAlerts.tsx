"use client";

import type { FinanceMetrics } from "@/lib/finance-metrics";
import { formatCurrency, formatPercent } from "@/lib/format";

type BudgetAlertsProps = {
  metrics: FinanceMetrics;
};

export function BudgetAlerts({ metrics }: BudgetAlertsProps) {
  const alerts: { tone: "danger" | "warn" | "info"; text: string }[] = [];

  if (metrics.spent > metrics.budget) {
    alerts.push({
      tone: "danger",
      text: `ใช้เกินงบไปแล้ว ${formatCurrency(metrics.spent - metrics.budget)} (${formatPercent(metrics.variancePct)}) — ควรหยุดใช้หรือขอเพิ่มงบ`,
    });
  } else if (metrics.percentUsed >= 90) {
    alerts.push({
      tone: "danger",
      text: `ใช้ไปแล้ว ${formatPercent(metrics.percentUsed)} ของงบ — เหลือน้อยมาก ระวังจะไม่พอ`,
    });
  } else if (metrics.percentUsed >= 70) {
    alerts.push({
      tone: "warn",
      text: `ใช้ไปแล้ว ${formatPercent(metrics.percentUsed)} ของงบ — ควรดูรายจ่ายที่เหลือให้ดี`,
    });
  }

  if (metrics.cpi > 0 && metrics.cpi < 0.9) {
    alerts.push({
      tone: "warn",
      text: "ตอนนี้ใช้เงินเกินงบค่อนข้างมาก ควรชะลอรายจ่ายที่ไม่จำเป็น",
    });
  }

  if (
    metrics.plannedValue > 0 &&
    metrics.spent > metrics.plannedValue * 1.15
  ) {
    alerts.push({
      tone: "warn",
      text: `ใช้เงินเร็วกว่าที่วางแผนไว้ (ใช้ไปแล้ว ${formatCurrency(metrics.spent)} ทั้งที่ตามเวลาควรใช้ประมาณ ${formatCurrency(metrics.plannedValue)})`,
    });
  }

  if (
    metrics.runwayDays !== null &&
    metrics.runwayDays > 0 &&
    metrics.runwayDays < 14
  ) {
    alerts.push({
      tone: "danger",
      text: `ถ้าใช้ต่อในอัตรานี้ งบจะหมดในประมาณ ${metrics.runwayDays} วัน`,
    });
  }

  if (metrics.eac != null && metrics.eac > metrics.budget * 1.1) {
    alerts.push({
      tone: "info",
      text: `คาดว่าเมื่อจบโปรเจกต์จะใช้ราว ${formatCurrency(metrics.eac)} — อาจเกินงบ ถ้ายังใช้เร็วแบบนี้ต่อไป`,
    });
  }

  if (alerts.length === 0) {
    return (
      <div className="rounded-xl border border-[#c5d9c8] bg-[#eef6ef] px-4 py-3 text-sm text-[#2f6b3a]">
        สบายใจได้ — งบยังอยู่ในเกณฑ์ที่ใช้ได้ตามปกติ
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {alerts.map((a) => (
        <div
          key={a.text}
          className={`rounded-xl border px-4 py-3 text-sm ${
            a.tone === "danger"
              ? "border-danger/30 bg-danger-soft text-danger"
              : a.tone === "warn"
                ? "border-[#d4c07a] bg-[#faf6e8] text-[#6b5a10]"
                : "border-border bg-accent-soft/50 text-fg-muted"
          }`}
        >
          {a.text}
        </div>
      ))}
    </div>
  );
}
