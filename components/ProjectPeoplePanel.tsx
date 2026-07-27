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

  function startEdit(person: ProjectPerson) {
    setEditingId(person.id);
    setName(person.name);
    setRoleTitle(person.roleTitle);
    setNote(person.note ?? "");
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
      resetForm();
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
      if (editingId === person.id) resetForm();
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "ลบรายชื่อไม่สำเร็จ");
    }
  }

  return (
    <section className="rounded-2xl border border-border bg-surface p-5 shadow-[var(--shadow)]">
      <h3 className="text-lg font-semibold text-fg">Team</h3>
      <p className="mt-1 text-sm text-fg-muted">
        รายชื่อคนในโปรเจค (พิมพ์ชื่อ/ตำแหน่งได้เลย ไม่ต้องมีบัญชี)
      </p>

      {canManage ? (
        <form
          onSubmit={handleSubmit}
          className="mt-4 grid gap-3 sm:grid-cols-2"
        >
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="ชื่อ"
            className="h-10 rounded-lg border border-border bg-bg-elevated px-3 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft"
          />
          <input
            value={roleTitle}
            onChange={(e) => setRoleTitle(e.target.value)}
            placeholder="ตำแหน่ง / หน้าที่"
            className="h-10 rounded-lg border border-border bg-bg-elevated px-3 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft"
          />
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="หมายเหตุ (ไม่บังคับ)"
            className="h-10 rounded-lg border border-border bg-bg-elevated px-3 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft sm:col-span-2"
          />
          <div className="flex gap-2 sm:col-span-2">
            <button
              type="submit"
              disabled={saving}
              className="h-10 rounded-lg bg-accent px-4 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-60"
            >
              {saving
                ? "Saving..."
                : editingId
                  ? "Save Changes"
                  : "Add Person"}
            </button>
            {editingId ? (
              <button
                type="button"
                onClick={resetForm}
                className="h-10 rounded-lg border border-border px-4 text-sm font-medium text-fg-muted hover:border-accent hover:text-accent"
              >
                Cancel
              </button>
            ) : null}
          </div>
        </form>
      ) : null}

      {error ? (
        <p className="mt-3 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="mt-4 text-sm text-fg-subtle">กำลังโหลด...</p>
      ) : people.length === 0 ? (
        <p className="mt-4 text-sm text-fg-muted">ยังไม่มีรายชื่อทีม</p>
      ) : (
        <ul className="mt-4 divide-y divide-border">
          {people.map((p) => (
            <li
              key={p.id}
              className="flex flex-wrap items-start justify-between gap-3 py-3"
            >
              <div className="min-w-0">
                <p className="font-medium text-fg">{p.name}</p>
                <p className="text-sm text-fg-muted">{p.roleTitle}</p>
                {p.note ? (
                  <p className="mt-0.5 text-xs text-fg-subtle">{p.note}</p>
                ) : null}
              </div>
              {canManage ? (
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => startEdit(p)}
                    className="text-xs text-fg-subtle hover:text-accent"
                  >
                    แก้ไข
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDelete(p)}
                    className="text-xs text-fg-subtle hover:text-danger"
                  >
                    ลบ
                  </button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
