"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { ProjectInput } from "@/lib/api-services";
import type { Project } from "@/lib/types";

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
  const [owner, setOwner] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setName(initial.name);
      setDescription(initial.description);
      setBudget(String(initial.budget));
      setStartDate(initial.startDate);
      setEndDate(initial.endDate);
      setOwner(initial.owner);
      setError("");
      return;
    }
    setName("");
    setDescription("");
    setBudget("");
    setStartDate(new Date().toISOString().slice(0, 10));
    setEndDate("");
    setOwner("");
    setError("");
  }, [open, initial]);

  if (!open) return null;

  function reset() {
    setName("");
    setDescription("");
    setBudget("");
    setStartDate(new Date().toISOString().slice(0, 10));
    setEndDate("");
    setOwner("");
    setError("");
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const parsedBudget = Number(budget.replace(/,/g, ""));
    if (
      !name.trim() ||
      !description.trim() ||
      !owner.trim() ||
      !startDate ||
      !endDate
    ) {
      setError("กรุณากรอกข้อมูลให้ครบ");
      return;
    }
    if (!Number.isFinite(parsedBudget) || parsedBudget <= 0) {
      setError("งบประมาณต้องมากกว่า 0");
      return;
    }
    if (new Date(endDate) < new Date(startDate)) {
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
        endDate,
        owner: owner.trim(),
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
              onChange={(e) => setEndDate(e.target.value)}
              className="h-11 rounded-lg border border-border bg-bg-elevated px-3.5 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft"
            />
          </label>

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
