"use client";

import type { CSSProperties } from "react";
import { useMemo } from "react";
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import type { Transaction } from "@/lib/types";
import { formatCurrency } from "@/lib/format";

const CHART_COLORS = [
  "#737300",
  "#9a9a1a",
  "#b8b83a",
  "#5c5c00",
  "#c4c46e",
  "#8a7000",
  "#a3a020",
  "#6e6e10",
  "#d4d48a",
  "#4a4a00",
];

type FinanceChartsProps = {
  transactions: Transaction[];
  budget: number;
  spent: number;
};

export function FinanceCharts({
  transactions,
  budget,
  spent,
}: FinanceChartsProps) {
  const categoryData = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of transactions) {
      map.set(t.category, (map.get(t.category) ?? 0) + t.amount);
    }
    return [...map.entries()]
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [transactions]);

  const budgetData = useMemo(() => {
    const remaining = Math.max(budget - spent, 0);
    const over = Math.max(spent - budget, 0);
    if (over > 0) {
      return [
        { name: "งบที่ตั้งไว้", value: budget },
        { name: "ใช้เกินงบ", value: over },
      ];
    }
    return [
      { name: "ใช้ไปแล้ว", value: spent },
      { name: "ยังเหลือ", value: remaining },
    ];
  }, [budget, spent]);

  const monthlyData = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of transactions) {
      const key = t.transactionDate.slice(0, 7);
      map.set(key, (map.get(key) ?? 0) + t.amount);
    }
    return [...map.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, amount]) => ({
        month: formatMonth(month),
        amount,
      }));
  }, [transactions]);

  const totalCategory = categoryData.reduce((s, d) => s + d.value, 0);

  if (transactions.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-8 text-center text-sm text-fg-muted shadow-[var(--shadow)]">
        ยังไม่มีข้อมูลให้แสดงกราฟ — ลองเพิ่มรายการจ่ายก่อน
      </div>
    );
  }

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {/* Category donut */}
      <div className="rounded-2xl border border-border bg-surface p-5 shadow-[var(--shadow)]">
        <h3 className="mb-1 text-sm font-semibold text-fg">
          Spend by Category
        </h3>
        <p className="mb-4 text-xs text-fg-subtle">
          สัดส่วนรายจ่ายแยกตามหมวดหมู่
        </p>
        <div className="flex flex-col items-center gap-4 sm:flex-row">
          <div className="h-52 w-full max-w-[220px] shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={52}
                  outerRadius={78}
                  paddingAngle={2}
                  stroke="none"
                >
                  {categoryData.map((_, i) => (
                    <Cell
                      key={categoryData[i].name}
                      fill={CHART_COLORS[i % CHART_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => formatCurrency(Number(value ?? 0))}
                  contentStyle={tooltipStyle}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="flex w-full flex-col gap-2">
            {categoryData.map((item, i) => {
              const pct =
                totalCategory > 0
                  ? Math.round((item.value / totalCategory) * 100)
                  : 0;
              return (
                <li
                  key={item.name}
                  className="flex items-center justify-between gap-2 text-sm"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-sm"
                      style={{
                        background: CHART_COLORS[i % CHART_COLORS.length],
                      }}
                    />
                    <span className="truncate text-fg-muted">{item.name}</span>
                  </span>
                  <span className="shrink-0 tabular-nums text-fg">
                    {pct}% · {formatCurrency(item.value)}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {/* Budget used vs remaining */}
      <div className="rounded-2xl border border-border bg-surface p-5 shadow-[var(--shadow)]">
        <h3 className="mb-1 text-sm font-semibold text-fg">Budget vs Spent</h3>
        <p className="mb-4 text-xs text-fg-subtle">
          ดูว่าใช้ไปแล้วเท่าไหร่ และยังเหลือเท่าไหร่
        </p>
        <div className="flex flex-col items-center gap-4 sm:flex-row">
          <div className="h-52 w-full max-w-[220px] shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={budgetData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={52}
                  outerRadius={78}
                  paddingAngle={2}
                  stroke="none"
                >
                  <Cell fill="#737300" />
                  <Cell fill={spent > budget ? "#b93a3a" : "#d4d48a"} />
                </Pie>
                <Tooltip
                  formatter={(value) => formatCurrency(Number(value ?? 0))}
                  contentStyle={tooltipStyle}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="flex w-full flex-col gap-3">
            {budgetData.map((item, i) => (
              <li key={item.name} className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm text-fg-muted">
                  <span
                    className="h-2.5 w-2.5 rounded-sm"
                    style={{
                      background:
                        i === 0
                          ? "#737300"
                          : spent > budget
                            ? "#b93a3a"
                            : "#d4d48a",
                    }}
                  />
                  {item.name}
                </span>
                <span className="text-sm font-semibold tabular-nums text-fg">
                  {formatCurrency(item.value)}
                </span>
              </li>
            ))}
            <li className="border-t border-border pt-3 text-xs text-fg-subtle">
              งบทั้งหมด {formatCurrency(budget)}
            </li>
          </ul>
        </div>
      </div>

      {/* Monthly bar */}
      <div className="rounded-2xl border border-border bg-surface p-5 shadow-[var(--shadow)] lg:col-span-2">
        <h3 className="mb-1 text-sm font-semibold text-fg">
          Monthly Spend
        </h3>
        <p className="mb-4 text-xs text-fg-subtle">
          ดูว่าเดือนไหนใช้เยอะ เดือนไหนใช้น้อย
        </p>
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#d9d9b8" vertical={false} />
              <XAxis
                dataKey="month"
                tick={{ fill: "#6b6b4a", fontSize: 12 }}
                axisLine={{ stroke: "#d9d9b8" }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "#6b6b4a", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) =>
                  v >= 1000 ? `${Math.round(v / 1000)}k` : String(v)
                }
              />
              <Tooltip
                formatter={(value) => formatCurrency(Number(value ?? 0))}
                contentStyle={tooltipStyle}
              />
              <Bar dataKey="amount" fill="#737300" radius={[6, 6, 0, 0]} maxBarSize={48} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

const tooltipStyle: CSSProperties = {
  background: "#fafaf5",
  border: "1px solid #d9d9b8",
  borderRadius: 8,
  fontSize: 12,
  color: "#2a2a14",
};

function formatMonth(ym: string): string {
  const [y, m] = ym.split("-");
  const months = [
    "ม.ค.",
    "ก.พ.",
    "มี.ค.",
    "เม.ย.",
    "พ.ค.",
    "มิ.ย.",
    "ก.ค.",
    "ส.ค.",
    "ก.ย.",
    "ต.ค.",
    "พ.ย.",
    "ธ.ค.",
  ];
  const idx = Number(m) - 1;
  return `${months[idx] ?? m} ${y?.slice(2) ?? ""}`;
}
