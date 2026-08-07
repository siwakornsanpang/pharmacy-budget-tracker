"use client";

import type { CSSProperties } from "react";
import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ProjectPerson } from "@/lib/types";

const CHART_COLORS = [
  "#737300",
  "#9a9a1a",
  "#b8b83a",
  "#5c5c00",
  "#c4c46e",
  "#8a7000",
  "#a3a020",
  "#6e6e10",
];

type TeamCompositionChartProps = {
  people: ProjectPerson[];
};

export function TeamCompositionChart({ people }: TeamCompositionChartProps) {
  const { roleData, byRole } = useMemo(() => {
    const countMap = new Map<string, string[]>();
    for (const p of people) {
      const role = p.roleTitle.trim() || "ไม่ระบุตำแหน่ง";
      const list = countMap.get(role) ?? [];
      list.push(p.name);
      countMap.set(role, list);
    }

    const roleData = [...countMap.entries()]
      .map(([role, names]) => ({
        role,
        count: names.length,
        names: names.sort((a, b) => a.localeCompare(b, "th")),
      }))
      .sort((a, b) => b.count - a.count || a.role.localeCompare(b.role, "th"));

    return { roleData, byRole: roleData };
  }, [people]);

  if (people.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-8 text-center text-sm text-fg-muted shadow-[var(--shadow)]">
        ยังไม่มีรายชื่อในทีม — เพิ่มได้ที่หน้า Setting
      </div>
    );
  }

  const chartHeight = Math.max(180, roleData.length * 44 + 40);

  return (
    <div className="rounded-2xl border border-border bg-surface p-5 shadow-[var(--shadow)]">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-fg">Team Composition</h3>
          <p className="mt-1 text-xs text-fg-subtle">
            จำนวนคนในทีมแยกตามตำแหน่ง
          </p>
        </div>
        <p className="text-sm font-semibold tabular-nums text-accent">
          รวม {people.length} คน · {roleData.length} ตำแหน่ง
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div style={{ height: chartHeight }} className="w-full min-h-[180px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={roleData}
              layout="vertical"
              margin={{ top: 4, right: 16, left: 4, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#d9d9b8"
                horizontal={false}
              />
              <XAxis
                type="number"
                allowDecimals={false}
                tick={{ fill: "#6b6b4a", fontSize: 12 }}
                axisLine={{ stroke: "#d9d9b8" }}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="role"
                width={100}
                tick={{ fill: "#6b6b4a", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                formatter={(value) => [`${Number(value ?? 0)} คน`, "จำนวน"]}
                contentStyle={tooltipStyle}
              />
              <Bar dataKey="count" radius={[0, 6, 6, 0]} maxBarSize={28}>
                {roleData.map((item, i) => (
                  <Cell
                    key={item.role}
                    fill={CHART_COLORS[i % CHART_COLORS.length]}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <ul className="flex flex-col gap-3">
          {byRole.map((item, i) => (
            <li
              key={item.role}
              className="rounded-xl border border-border/70 bg-bg-elevated/60 px-3.5 py-3"
            >
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <span className="flex min-w-0 items-center gap-2 text-sm font-medium text-fg">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-sm"
                    style={{
                      background: CHART_COLORS[i % CHART_COLORS.length],
                    }}
                  />
                  <span className="truncate">{item.role}</span>
                </span>
                <span className="shrink-0 text-xs font-semibold tabular-nums text-fg-muted">
                  {item.count} คน
                </span>
              </div>
              <p className="text-xs leading-relaxed text-fg-subtle">
                {item.names.join(" · ")}
              </p>
            </li>
          ))}
        </ul>
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
