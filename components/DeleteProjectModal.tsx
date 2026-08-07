"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type DeleteProjectModalProps = {
  open: boolean;
  projectName: string;
  loading?: boolean;
  error?: string;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
};

export function DeleteProjectModal({
  open,
  projectName,
  loading = false,
  error = "",
  onClose,
  onConfirm,
}: DeleteProjectModalProps) {
  const [confirmName, setConfirmName] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    setConfirmName("");
  }, [open, projectName]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open || !mounted) return null;

  const matched = confirmName.trim() === projectName;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-[#2a2a14]/45 backdrop-blur-[2px]"
        aria-label="ปิด"
        disabled={loading}
        onClick={() => {
          if (!loading) onClose();
        }}
      />
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-[var(--shadow)]">
        <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold text-danger">
          ลบโครงการ
        </h2>
        <p className="mt-2 text-sm text-fg-muted">
          การลบจะลบรายการธุรกรรมทั้งหมดด้วย และกู้คืนไม่ได้ พิมพ์ชื่อโครงการ{" "}
          <span className="font-semibold text-fg">{projectName}</span>{" "}
          เพื่อยืนยัน
        </p>

        <input
          value={confirmName}
          onChange={(e) => setConfirmName(e.target.value)}
          placeholder="พิมพ์ชื่อโครงการให้ตรง"
          autoComplete="off"
          disabled={loading}
          className="mt-4 h-11 w-full rounded-lg border border-border bg-bg-elevated px-3.5 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft disabled:opacity-60"
        />

        {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            disabled={loading}
            onClick={onClose}
            className="h-10 rounded-lg border border-border px-4 text-sm font-medium text-fg-muted hover:border-accent hover:text-accent disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={loading || !matched}
            onClick={() => void onConfirm()}
            className="h-10 rounded-lg bg-danger px-4 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-40"
          >
            {loading ? "Deleting..." : "ยืนยันลบโครงการ"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
