"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { resolveProjectStatus } from "@/components/ProjectCard";
import { ProjectStatusField } from "@/components/ProjectStatusField";
import type { ProjectInput } from "@/lib/api-services";
import type { Project, ProjectStatus } from "@/lib/types";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

type CreateProjectModalProps = {
  open: boolean;
  onClose: () => void;
  onSave: (project: ProjectInput) => Promise<void>;
  initial?: Project | null;
};

export function CreateProjectModal({
  open,
  onClose,
  onSave,
  initial = null,
}: CreateProjectModalProps) {
  const isEdit = Boolean(initial);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [budget, setBudget] = useState("");
  const [startDate, setStartDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [endDate, setEndDate] = useState("");
  const [unknownEnd, setUnknownEnd] = useState(false);
  const [owner, setOwner] = useState("");
  const [status, setStatus] = useState<ProjectStatus>("active");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setName(initial.name);
      setDescription(initial.description);
      setBudget(String(initial.budget));
      setStartDate(initial.startDate);
      setEndDate(initial.endDate ?? "");
      setUnknownEnd(!initial.endDate);
      setOwner(initial.owner);
      setStatus(resolveProjectStatus(initial));
      setError("");
      return;
    }
    setName("");
    setDescription("");
    setBudget("");
    setStartDate(new Date().toISOString().slice(0, 10));
    setEndDate("");
    setUnknownEnd(false);
    setOwner("");
    setStatus("active");
    setError("");
  }, [open, initial]);

  const endKeyRef = useRef<string | null>(null);

  // Auto-complete when end date passes; reopen when user extends the deadline
  useEffect(() => {
    if (!open) {
      endKeyRef.current = null;
      return;
    }
    const key = unknownEnd ? "open" : endDate;
    const pastDue = !unknownEnd && Boolean(endDate) && endDate < todayISO();
    const prev = endKeyRef.current;
    endKeyRef.current = key;

    setStatus((s) => {
      if (s === "paused") return s;
      if (pastDue) return "completed";
      if (prev !== null && prev !== key && s === "completed") return "active";
      return s;
    });
  }, [open, endDate, unknownEnd]);

  if (!open) return null;

  function reset() {
    setName("");
    setDescription("");
    setBudget("");
    setStartDate(new Date().toISOString().slice(0, 10));
    setEndDate("");
    setUnknownEnd(false);
    setOwner("");
    setStatus("active");
    setError("");
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const parsedBudget = Number(budget.replace(/,/g, ""));
    if (!name.trim() || !description.trim() || !owner.trim() || !startDate) {
      setError("กรุณากรอกข้อมูลให้ครบ");
      return;
    }
    if (!unknownEnd && !endDate) {
      setError("กรุณาใส่วันสิ้นสุด หรือเลือกไม่ระบุวันจบ");
      return;
    }
    if (!Number.isFinite(parsedBudget) || parsedBudget <= 0) {
      setError("งบประมาณต้องมากกว่า 0");
      return;
    }
    if (!unknownEnd && endDate && new Date(endDate) < new Date(startDate)) {
      setError("วันสิ้นสุดต้องไม่ก่อนวันเริ่ม");
      return;
    }

    setLoading(true);
    setError("");
    try {
      await onSave({
        name: name.trim(),
        description: description.trim(),
        budget: parsedBudget,
        startDate,
        endDate: unknownEnd ? null : endDate,
        owner: owner.trim(),
        status,
      });
      if (!isEdit) reset();
      onClose();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : isEdit
            ? "แก้ไขโครงการไม่สำเร็จ"
            : "สร้างโครงการไม่สำเร็จ",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-[#2a2a14]/40 backdrop-blur-[2px]"
        aria-label="ปิด"
        onClick={() => {
          if (loading) return;
          if (!isEdit) reset();
          onClose();
        }}
      />
      <div className="relative z-10 w-full max-w-lg rounded-2xl border border-border bg-surface p-6 shadow-[var(--shadow)]">
        <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold text-fg">
          {isEdit ? "Edit Project" : "New Project"}
        </h2>
        <p className="mt-1 text-sm text-fg-muted">
          {isEdit
            ? "อัปเดตข้อมูลโครงการ"
            : "กรอกข้อมูลพื้นฐานเพื่อเริ่มติดตามงบโครงการ"}
        </p>

        <form onSubmit={handleSubmit} className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 sm:col-span-2">
            <span className="text-xs font-medium text-fg-muted">Project Name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-11 rounded-lg border border-border bg-bg-elevated px-3.5 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft"
            />
          </label>
          <label className="flex flex-col gap-1.5 sm:col-span-2">
            <span className="text-xs font-medium text-fg-muted">Description</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="rounded-lg border border-border bg-bg-elevated px-3.5 py-2.5 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-fg-muted">Budget (THB)</span>
            <input
              type="number"
              min="1"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              className="h-11 rounded-lg border border-border bg-bg-elevated px-3.5 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-fg-muted">Owner</span>
            <input
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
              className="h-11 rounded-lg border border-border bg-bg-elevated px-3.5 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-fg-muted">Start Date</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-11 rounded-lg border border-border bg-bg-elevated px-3.5 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-fg-muted">End Date</span>
            <input
              type="date"
              value={endDate}
              disabled={unknownEnd}
              onChange={(e) => setEndDate(e.target.value)}
              className="h-11 rounded-lg border border-border bg-bg-elevated px-3.5 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft disabled:cursor-not-allowed disabled:opacity-50"
            />
          </label>
          <label className="flex items-center gap-2 sm:col-span-2">
            <input
              type="checkbox"
              checked={unknownEnd}
              onChange={(e) => {
                setUnknownEnd(e.target.checked);
                if (e.target.checked) setEndDate("");
              }}
              className="h-4 w-4 rounded border-border accent-[var(--accent)]"
            />
            <span className="text-sm text-fg-muted">ไม่ระบุวันจบ / ยังไม่รู้วันจบ</span>
          </label>

          {isEdit ? (
            <ProjectStatusField value={status} onChange={setStatus} />
          ) : null}

          {error ? (
            <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger sm:col-span-2">
              {error}
            </p>
          ) : null}

          <div className="flex gap-2 sm:col-span-2 sm:justify-end">
            <button
              type="button"
              disabled={loading}
              onClick={() => {
                if (!isEdit) reset();
                onClose();
              }}
              className="h-10 rounded-lg border border-border px-4 text-sm font-medium text-fg-muted hover:border-accent hover:text-accent disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="h-10 rounded-lg bg-accent px-4 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-60"
            >
              {loading ? "Saving..." : isEdit ? "Save Changes" : "Create Project"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
