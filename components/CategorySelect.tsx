"use client";

import { useEffect, useState } from "react";
import {
  addCategory,
  getDefaultCategories,
  getStoredCategories,
} from "@/lib/categories";

type CategorySelectProps = {
  value: string;
  onChange: (value: string) => void;
};

export function CategorySelect({ value, onChange }: CategorySelectProps) {
  const [categories, setCategories] = useState<string[]>(getDefaultCategories);
  const [adding, setAdding] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setCategories(getStoredCategories());
  }, []);

  function handleSelectChange(next: string) {
    if (next === "__add_new__") {
      setAdding(true);
      setError("");
      return;
    }
    onChange(next);
  }

  function handleAdd() {
    const trimmed = newCategory.trim();
    if (!trimmed) {
      setError("กรุณาใส่ชื่อหมวดหมู่");
      return;
    }
    const next = addCategory(trimmed, categories);
    setCategories(next);
    onChange(trimmed);
    setNewCategory("");
    setAdding(false);
    setError("");
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
                handleAdd();
              }
              if (e.key === "Escape") handleCancel();
            }}
            placeholder="ชื่อหมวดหมู่ใหม่"
            className="h-11 w-full rounded-lg border border-border bg-bg-elevated px-3.5 text-sm text-fg outline-none transition placeholder:text-fg-subtle focus:border-accent focus:ring-2 focus:ring-accent-soft"
          />
          <button
            type="button"
            onClick={handleAdd}
            className="h-11 shrink-0 rounded-lg bg-accent px-3 text-sm font-semibold text-white transition hover:bg-accent-hover"
          >
            เพิ่ม
          </button>
          <button
            type="button"
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
