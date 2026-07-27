"use client";

import { useEffect, useState, type FormEvent } from "react";
import { ApiError } from "@/lib/api";
import {
  createPerson,
  deletePerson,
  fetchPeople,
  updatePerson,
} from "@/lib/api-services";
import type { ProjectPerson } from "@/lib/types";

type ProjectPeoplePanelProps = {
  projectId: string;
  canManage: boolean;
};

function initials(name: string) {
  return name.trim().slice(0, 1).toUpperCase() || "?";
}

export function ProjectPeoplePanel({
  projectId,
  canManage,
}: ProjectPeoplePanelProps) {
  const [people, setPeople] = useState<ProjectPerson[]>([]);
  const [name, setName] = useState("");
  const [roleTitle, setRoleTitle] = useState("");
  const [note, setNote] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);

  async function load() {
    setError("");
    try {
      const data = await fetchPeople(projectId);
      setPeople(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "โหลดรายชื่อทีมไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  function resetForm() {
    setName("");
    setRoleTitle("");
    setNote("");
    setEditingId(null);
  }

  function closeForm() {
    resetForm();
    setShowForm(false);
    setError("");
  }

  function startEdit(person: ProjectPerson) {
    setEditingId(person.id);
    setName(person.name);
    setRoleTitle(person.roleTitle);
    setNote(person.note ?? "");
    setShowForm(true);
    setError("");
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim() || !roleTitle.trim()) {
      setError("กรุณากรอกชื่อและตำแหน่ง");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const payload = {
        name: name.trim(),
        roleTitle: roleTitle.trim(),
        note: note.trim() || undefined,
      };
      if (editingId) {
        await updatePerson(projectId, editingId, payload);
      } else {
        await createPerson(projectId, payload);
      }
      closeForm();
      await load();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "บันทึกรายชื่อไม่สำเร็จ",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(person: ProjectPerson) {
    if (!confirm(`ลบ ${person.name} ออกจากรายชื่อทีมใช่ไหม?`)) return;
    setError("");
    try {
      await deletePerson(projectId, person.id);
      if (editingId === person.id) closeForm();
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "ลบรายชื่อไม่สำเร็จ");
    }
  }

  return (
    <section className="flex h-full flex-col rounded-2xl border border-border bg-surface shadow-[var(--shadow)]">
      <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
        <div>
          <h3 className="text-base font-semibold text-fg">Team</h3>
          <p className="mt-0.5 text-xs text-fg-subtle">
            รายชื่อคนในโปรเจค · ไม่ต้องมีบัญชี
          </p>
        </div>
        {canManage ? (
          <button
            type="button"
            onClick={() => {
              if (showForm) {
                closeForm();
              } else {
                resetForm();
                setShowForm(true);
                setError("");
              }
            }}
            className="shrink-0 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-fg-muted transition hover:border-accent hover:text-accent"
          >
            {showForm ? "ปิด" : "+ เพิ่ม"}
          </button>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col p-4">
        {canManage && showForm ? (
          <form
            onSubmit={handleSubmit}
            className="mb-4 space-y-3 rounded-xl bg-bg-elevated p-3"
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-fg-subtle">
                  ชื่อ
                </span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="เช่น สมชาย"
                  autoFocus
                  className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-fg-subtle">
                  ตำแหน่ง
                </span>
                <input
                  value={roleTitle}
                  onChange={(e) => setRoleTitle(e.target.value)}
                  placeholder="เช่น PM, บัญชี"
                  className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft"
                />
              </label>
            </div>
            <label className="block">
              <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-fg-subtle">
                หมายเหตุ
              </span>
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="ไม่บังคับ"
                className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft"
              />
            </label>
            <button
              type="submit"
              disabled={saving}
              className="h-10 w-full rounded-lg bg-accent text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-60"
            >
              {saving
                ? "กำลังบันทึก..."
                : editingId
                  ? "บันทึกการแก้ไข"
                  : "เพิ่มรายชื่อ"}
            </button>
          </form>
        ) : null}

        {error ? (
          <p className="mb-3 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
            {error}
          </p>
        ) : null}

        {loading ? (
          <p className="py-8 text-center text-sm text-fg-subtle">กำลังโหลด...</p>
        ) : people.length === 0 ? (
          <p className="py-8 text-center text-sm text-fg-muted">
            ยังไม่มีรายชื่อทีม
          </p>
        ) : (
          <ul className="space-y-2">
            {people.map((p) => (
              <li
                key={p.id}
                className="flex items-center gap-3 rounded-xl border border-border/70 px-3 py-2.5"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-bg text-sm font-semibold text-fg-muted">
                  {initials(p.name)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-fg">
                    {p.name}
                  </p>
                  <p className="truncate text-xs text-fg-muted">{p.roleTitle}</p>
                  {p.note ? (
                    <p className="mt-0.5 truncate text-[11px] text-fg-subtle">
                      {p.note}
                    </p>
                  ) : null}
                </div>
                {canManage ? (
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => startEdit(p)}
                      className="rounded-md px-2 py-1 text-xs text-fg-subtle hover:bg-accent-soft hover:text-accent"
                    >
                      แก้ไข
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDelete(p)}
                      className="rounded-md px-2 py-1 text-xs text-fg-subtle hover:bg-danger-soft hover:text-danger"
                    >
                      ลบ
                    </button>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
