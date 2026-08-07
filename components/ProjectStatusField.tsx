"use client";

import type { ProjectStatus } from "@/lib/types";

const OPTIONS: {
  value: ProjectStatus;
  label: string;
  hint: string;
}[] = [
  {
    value: "active",
    label: "Active",
    hint: "กำลังดำเนินการ",
  },
  {
    value: "paused",
    label: "On Hold",
    hint: "ระงับชั่วคราว ยังไม่ปิดโครงการ",
  },
  {
    value: "completed",
    label: "Completed",
    hint: "จบโครงการแล้ว",
  },
];

type ProjectStatusFieldProps = {
  value: ProjectStatus;
  onChange: (value: ProjectStatus) => void;
  disabled?: boolean;
};

export function ProjectStatusField({
  value,
  onChange,
  disabled = false,
}: ProjectStatusFieldProps) {
  return (
    <div className="sm:col-span-2">
      <p className="mb-2 text-xs font-medium text-fg-muted">สถานะโครงการ</p>
      <div
        className="grid gap-2 sm:grid-cols-3"
        role="radiogroup"
        aria-label="สถานะโครงการ"
      >
        {OPTIONS.map((opt) => {
          const selected = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={disabled}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (disabled) return;
                onChange(opt.value);
              }}
              className={`rounded-xl border px-3 py-2.5 text-left transition disabled:cursor-not-allowed disabled:opacity-60 ${
                selected
                  ? opt.value === "paused"
                    ? "border-[#c4b87a] bg-[#f3edd4] text-[#5c4a10]"
                    : opt.value === "completed"
                      ? "border-[#c8c8c0] bg-[#ecece8] text-[#4a4a44]"
                      : "border-accent bg-accent-soft text-accent"
                  : "border-border bg-bg-elevated text-fg-muted hover:border-accent/50"
              }`}
            >
              <span className="block text-sm font-semibold">{opt.label}</span>
              <span className="mt-0.5 block text-[11px] opacity-80">
                {opt.hint}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
