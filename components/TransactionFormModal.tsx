"use client";

import { useEffect, useState, type FormEvent } from "react";
import { CategorySelect } from "@/components/CategorySelect";
import type { TransactionInput } from "@/lib/api-services";
import { getDefaultCategories } from "@/lib/categories";
import type { ProjectPerson, Transaction, TransactionKind } from "@/lib/types";

type TransactionFormModalProps = {
  open: boolean;
  onClose: () => void;
  onSave: (transaction: TransactionInput) => Promise<void>;
  initial?: Transaction | null;
  people?: ProjectPerson[];
  defaultKind?: TransactionKind;
};

const inputClass =
  "h-11 rounded-lg border border-border bg-bg-elevated px-3.5 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft";

export function TransactionFormModal({
  open,
  onClose,
  onSave,
  initial = null,
  people = [],
  defaultKind = "general",
}: TransactionFormModalProps) {
  const isEdit = Boolean(initial);
  const [kind, setKind] = useState<TransactionKind>(defaultKind);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(
    () => getDefaultCategories()[0] ?? "อื่นๆ",
  );
  const [transactionDate, setTransactionDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [amount, setAmount] = useState("");
  const [to, setTo] = useState("");
  const [payeeMode, setPayeeMode] = useState<"team" | "external">("team");
  const [personId, setPersonId] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (initial) {
      const nextKind = initial.kind === "salary" ? "salary" : "general";
      setKind(nextKind);
      setTitle(initial.title);
      setCategory(initial.category);
      setTransactionDate(initial.transactionDate);
      setAmount(String(initial.amount));
      setTo(initial.to);
      setNote(initial.note ?? "");
      if (nextKind === "salary") {
        if (initial.personId) {
          setPayeeMode("team");
          setPersonId(initial.personId);
        } else {
          setPayeeMode("external");
          setPersonId("");
        }
      } else {
        setPayeeMode("team");
        setPersonId("");
      }
      setError("");
      return;
    }
    setKind(defaultKind);
    setTitle("");
    setCategory(
      defaultKind === "salary"
        ? "ค่าแรง"
        : (getDefaultCategories()[0] ?? "อื่นๆ"),
    );
    setTransactionDate(new Date().toISOString().slice(0, 10));
    setAmount("");
    setTo("");
    setPayeeMode(people.length > 0 ? "team" : "external");
    setPersonId(people[0]?.id ?? "");
    setNote("");
    setError("");
  }, [open, initial, defaultKind, people]);

  if (!open) return null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const parsedAmount = Number(amount.replace(/,/g, ""));
    if (!title.trim() || !transactionDate) {
      setError("กรุณากรอกข้อมูลให้ครบ");
      return;
    }
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError("จำนวนเงินต้องมากกว่า 0");
      return;
    }

    if (kind === "general") {
      if (!to.trim() || !category.trim()) {
        setError("กรุณากรอกข้อมูลให้ครบ");
        return;
      }
    } else if (payeeMode === "team") {
      if (!personId) {
        setError("เลือกคนในทีม หรือสลับเป็นคนนอก");
        return;
      }
    } else if (!to.trim()) {
      setError("กรุณาใส่ชื่อคนนอกที่รับค่าแรง");
      return;
    }

    setLoading(true);
    setError("");
    try {
      await onSave(
        kind === "salary"
          ? {
              kind: "salary",
              title: title.trim(),
              category: "ค่าแรง",
              transactionDate,
              amount: parsedAmount,
              personId: payeeMode === "team" ? personId : null,
              to:
                payeeMode === "team"
                  ? (people.find((p) => p.id === personId)?.name ?? "")
                  : to.trim(),
              note: note.trim() || undefined,
            }
          : {
              kind: "general",
              title: title.trim(),
              category: category.trim(),
              transactionDate,
              amount: parsedAmount,
              to: to.trim(),
              note: note.trim() || undefined,
            },
      );
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
      <div className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-surface p-6 shadow-[var(--shadow)]">
        <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold text-fg">
          {isEdit
            ? "Edit Transaction"
            : kind === "salary"
              ? "New Salary"
              : "New Transaction"}
        </h2>
        <p className="mt-1 text-sm text-fg-muted">
          {kind === "salary"
            ? "บันทึกค่าแรง / salary ให้คนในทีมหรือคนนอก"
            : "บันทึกรายจ่ายทั่วไปของโครงการ"}
        </p>

        <form onSubmit={handleSubmit} className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="grid grid-cols-2 gap-2 sm:col-span-2">
            <button
              type="button"
              onClick={() => {
                setKind("general");
                if (!category || category === "ค่าแรง") {
                  setCategory(getDefaultCategories().find((c) => c !== "ค่าแรง") ?? "อื่นๆ");
                }
              }}
              className={`h-10 rounded-lg text-sm font-medium transition ${
                kind === "general"
                  ? "bg-accent text-white"
                  : "border border-border text-fg-muted hover:border-accent hover:text-accent"
              }`}
            >
              รายจ่ายทั่วไป
            </button>
            <button
              type="button"
              onClick={() => {
                setKind("salary");
                setCategory("ค่าแรง");
                setPayeeMode(people.length > 0 ? "team" : "external");
              }}
              className={`h-10 rounded-lg text-sm font-medium transition ${
                kind === "salary"
                  ? "bg-accent text-white"
                  : "border border-border text-fg-muted hover:border-accent hover:text-accent"
              }`}
            >
              ค่าแรง / Salary
            </button>
          </div>

          <label className="flex flex-col gap-1.5 sm:col-span-2">
            <span className="text-xs font-medium text-fg-muted">Title</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={
                kind === "salary"
                  ? "เช่น ค่าแรงเดือน กรกฎาคม"
                  : "เช่น ค่าจ้างออกแบบ, ค่าอุปกรณ์"
              }
              className={inputClass}
            />
          </label>

          {kind === "general" ? (
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-fg-muted">Category</span>
              <CategorySelect value={category} onChange={setCategory} />
            </label>
          ) : (
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-fg-muted">Category</span>
              <input value="ค่าแรง" disabled className={`${inputClass} opacity-70`} />
            </label>
          )}

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-fg-muted">Date</span>
            <input
              type="date"
              value={transactionDate}
              onChange={(e) => setTransactionDate(e.target.value)}
              className={inputClass}
            />
          </label>

          <label className="flex flex-col gap-1.5 sm:col-span-2">
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

          {kind === "general" ? (
            <label className="flex flex-col gap-1.5 sm:col-span-2">
              <span className="text-xs font-medium text-fg-muted">Paid To</span>
              <input
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="ชื่อคน / ร้านค้า / บริษัท"
                className={inputClass}
              />
            </label>
          ) : (
            <div className="space-y-3 sm:col-span-2">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPayeeMode("team")}
                  className={`h-9 rounded-lg text-xs font-medium ${
                    payeeMode === "team"
                      ? "bg-accent-soft text-accent"
                      : "border border-border text-fg-muted"
                  }`}
                >
                  คนในทีม
                </button>
                <button
                  type="button"
                  onClick={() => setPayeeMode("external")}
                  className={`h-9 rounded-lg text-xs font-medium ${
                    payeeMode === "external"
                      ? "bg-accent-soft text-accent"
                      : "border border-border text-fg-muted"
                  }`}
                >
                  คนนอก (จ่ายครั้งเดียว)
                </button>
              </div>
              {payeeMode === "team" ? (
                people.length === 0 ? (
                  <p className="rounded-lg bg-bg-elevated px-3 py-2 text-sm text-fg-muted">
                    ยังไม่มีรายชื่อใน Team — เพิ่มใน Team ก่อน หรือเลือกคนนอก
                  </p>
                ) : (
                  <label className="flex flex-col gap-1.5">
                    <span className="text-xs font-medium text-fg-muted">
                      จ่ายให้
                    </span>
                    <select
                      value={personId}
                      onChange={(e) => setPersonId(e.target.value)}
                      className={inputClass}
                    >
                      {people.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} · {p.roleTitle}
                        </option>
                      ))}
                    </select>
                  </label>
                )
              ) : (
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-medium text-fg-muted">
                    ชื่อคนนอก
                  </span>
                  <input
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                    placeholder="ชื่อผู้รับค่าแรง"
                    className={inputClass}
                  />
                </label>
              )}
            </div>
          )}

          <label className="flex flex-col gap-1.5 sm:col-span-2">
            <span className="text-xs font-medium text-fg-muted">
              Note (optional)
            </span>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="เช่น เลขใบเสร็จ, งวดเดือน"
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
