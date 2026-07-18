"use client";

import { useEffect, useState, type FormEvent } from "react";
import { CategorySelect } from "@/components/CategorySelect";
import type { TransactionInput } from "@/lib/api-services";
import { getDefaultCategories } from "@/lib/categories";
import type { Transaction } from "@/lib/types";

type TransactionFormModalProps = {
  open: boolean;
  onClose: () => void;
  onSave: (transaction: TransactionInput) => Promise<void>;
  initial?: Transaction | null;
};

const inputClass =
  "h-11 rounded-lg border border-border bg-bg-elevated px-3.5 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft";

export function TransactionFormModal({
  open,
  onClose,
  onSave,
  initial = null,
}: TransactionFormModalProps) {
  const isEdit = Boolean(initial);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(
    () => getDefaultCategories()[0] ?? "อื่นๆ",
  );
  const [transactionDate, setTransactionDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [amount, setAmount] = useState("");
  const [to, setTo] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setTitle(initial.title);
      setCategory(initial.category);
      setTransactionDate(initial.transactionDate);
      setAmount(String(initial.amount));
      setTo(initial.to);
      setNote(initial.note ?? "");
      setError("");
      return;
    }
    setTitle("");
    setCategory(getDefaultCategories()[0] ?? "อื่นๆ");
    setTransactionDate(new Date().toISOString().slice(0, 10));
    setAmount("");
    setTo("");
    setNote("");
    setError("");
  }, [open, initial]);

  if (!open) return null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const parsedAmount = Number(amount.replace(/,/g, ""));
    if (!title.trim() || !to.trim() || !transactionDate || !category.trim()) {
      setError("กรุณากรอกข้อมูลให้ครบ");
      return;
    }
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError("จำนวนเงินต้องมากกว่า 0");
      return;
    }

    setLoading(true);
    setError("");
    try {
      await onSave({
        title: title.trim(),
        category: category.trim(),
        transactionDate,
        amount: parsedAmount,
        to: to.trim(),
        note: note.trim() || undefined,
      });
      onClose();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : isEdit
            ? "แก้ไขรายการไม่สำเร็จ"
            : "บันทึกรายการไม่สำเร็จ",
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
          onClose();
        }}
      />
      <div className="relative z-10 w-full max-w-lg rounded-2xl border border-border bg-surface p-6 shadow-[var(--shadow)]">
        <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold text-fg">
          {isEdit ? "Edit Transaction" : "New Transaction"}
        </h2>
        <p className="mt-1 text-sm text-fg-muted">
          {isEdit
            ? "อัปเดตรายจ่ายของโครงการ"
            : "กรอกรายจ่ายเพื่ออัปเดตงบที่ใช้ไป"}
        </p>

        <form onSubmit={handleSubmit} className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 sm:col-span-2">
            <span className="text-xs font-medium text-fg-muted">Title</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="เช่น ค่าจ้างออกแบบ, ค่าอุปกรณ์"
              className={inputClass}
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-fg-muted">Category</span>
            <CategorySelect value={category} onChange={setCategory} />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-fg-muted">Date</span>
            <input
              type="date"
              value={transactionDate}
              onChange={(e) => setTransactionDate(e.target.value)}
              className={inputClass}
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-fg-muted">Amount (THB)</span>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className={inputClass}
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-fg-muted">Paid To</span>
            <input
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="ชื่อคน / ร้านค้า / บริษัท"
              className={inputClass}
            />
          </label>

          <label className="flex flex-col gap-1.5 sm:col-span-2">
            <span className="text-xs font-medium text-fg-muted">
              Note (optional)
            </span>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="เช่น เลขใบเสร็จ, รายละเอียดเพิ่มเติม"
              className={inputClass}
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
              onClick={onClose}
              className="h-10 rounded-lg border border-border px-4 text-sm font-medium text-fg-muted hover:border-accent hover:text-accent disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="h-10 rounded-lg bg-accent px-4 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-60"
            >
              {loading
                ? "Saving..."
                : isEdit
                  ? "Save Changes"
                  : "Add Transaction"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
