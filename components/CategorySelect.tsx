"use client";

import { useEffect, useState } from "react";
import { createCategory, fetchCategories } from "@/lib/api-services";
import { getDefaultCategories } from "@/lib/categories";

type CategorySelectProps = {
  value: string;
  onChange: (value: string) => void;
};

export function CategorySelect({ value, onChange }: CategorySelectProps) {
  const [categories, setCategories] = useState<string[]>(getDefaultCategories);
  const [adding, setAdding] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchCategories()
      .then((rows) => {
        if (cancelled) return;
        const names = rows.map((r) => r.name);
        setCategories(names.length ? names : getDefaultCategories());
        if (!value && names[0]) onChange(names[0]);
      })
      .catch(() => {
        if (!cancelled) setCategories(getDefaultCategories());
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSelectChange(next: string) {
    if (next === "__add_new__") {
      setAdding(true);
      setError("");
      return;
    }
    onChange(next);
  }

  async function handleAdd() {
    const trimmed = newCategory.trim();
    if (!trimmed) {
      setError("กรุณาใส่ชื่อหมวดหมู่");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const created = await createCategory(trimmed);
      setCategories((prev) =>
        prev.some((c) => c.toLowerCase() === created.name.toLowerCase())
          ? prev
          : [...prev, created.name],
      );
      onChange(created.name);
      setNewCategory("");
      setAdding(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "เพิ่มหมวดหมู่ไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    setAdding(false);
    setNewCategory("");
    setError("");
  }

  if (adding) {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <input
            autoFocus
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void handleAdd();
              }
              if (e.key === "Escape") handleCancel();
            }}
            placeholder="ชื่อหมวดหมู่ใหม่"
            className="h-11 w-full rounded-lg border border-border bg-bg-elevated px-3.5 text-sm text-fg outline-none transition placeholder:text-fg-subtle focus:border-accent focus:ring-2 focus:ring-accent-soft"
          />
          <button
            type="button"
            disabled={saving}
            onClick={() => void handleAdd()}
            className="h-11 shrink-0 rounded-lg bg-accent px-3 text-sm font-semibold text-white transition hover:bg-accent-hover disabled:opacity-60"
          >
            {saving ? "..." : "เพิ่ม"}
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={handleCancel}
            className="h-11 shrink-0 rounded-lg border border-border px-3 text-sm font-medium text-fg-muted transition hover:border-accent hover:text-accent"
          >
            ยกเลิก
          </button>
        </div>
        {error ? <p className="text-xs text-danger">{error}</p> : null}
      </div>
    );
  }

  return (
    <select
      value={value}
      onChange={(e) => handleSelectChange(e.target.value)}
      className="h-11 w-full rounded-lg border border-border bg-bg-elevated px-3.5 text-sm text-fg outline-none transition focus:border-accent focus:ring-2 focus:ring-accent-soft"
    >
      {categories.map((c) => (
        <option key={c} value={c}>
          {c}
        </option>
      ))}
      <option value="__add_new__">+ เพิ่มหมวดหมู่ใหม่...</option>
    </select>
  );
}
