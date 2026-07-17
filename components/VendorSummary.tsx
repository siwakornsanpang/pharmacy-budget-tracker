"use client";

import { formatCurrency } from "@/lib/format";
import type { Transaction } from "@/lib/types";

type VendorSummaryProps = {
  transactions: Transaction[];
};

export function VendorSummary({ transactions }: VendorSummaryProps) {
  const map = new Map<string, { total: number; count: number }>();
  for (const t of transactions) {
    const prev = map.get(t.to) ?? { total: 0, count: 0 };
    map.set(t.to, {
      total: prev.total + t.amount,
      count: prev.count + 1,
    });
  }

  const vendors = [...map.entries()]
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  const grand = transactions.reduce((s, t) => s + t.amount, 0);

  if (vendors.length === 0) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-5 shadow-[var(--shadow)]">
      <h3 className="mb-1 text-sm font-semibold text-fg">
        Top Payees
      </h3>
      <p className="mb-4 text-xs text-fg-subtle">
        5 อันดับผู้รับเงิน / ร้านค้าที่ยอดรวมสูงสุด
      </p>
      <ul className="flex flex-col gap-3">
        {vendors.map((v) => {
          const pct = grand > 0 ? Math.round((v.total / grand) * 100) : 0;
          return (
            <li key={v.name}>
              <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                <span className="truncate font-medium text-fg">{v.name}</span>
                <span className="shrink-0 tabular-nums text-fg">
                  {formatCurrency(v.total)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-accent-soft">
                  <div
                    className="h-full rounded-full bg-accent"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="w-20 shrink-0 text-right text-xs text-fg-subtle">
                  {pct}% · {v.count} รายการ
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
