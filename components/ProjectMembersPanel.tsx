"use client";

import { useEffect, useState, type FormEvent } from "react";
import { ApiError } from "@/lib/api";
import {
  addMember,
  fetchMembers,
  removeMember,
  updateMemberRole,
} from "@/lib/api-services";
import type { MemberRole, ProjectMember } from "@/lib/types";

const ROLE_LABELS: Record<string, string> = {
  creator: "ผู้สร้าง",
  admin: "Admin — แก้โปรเจค + รายการ",
  editor: "Editor — แก้รายการอย่างเดียว",
  viewer: "Viewer — ดูอย่างเดียว",
};

type ProjectMembersPanelProps = {
  projectId: string;
  canManage: boolean;
};

export function ProjectMembersPanel({
  projectId,
  canManage,
}: ProjectMembersPanelProps) {
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [username, setUsername] = useState("");
  const [role, setRole] = useState<MemberRole>("viewer");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function load() {
    setError("");
    try {
      const data = await fetchMembers(projectId);
      setMembers(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "โหลดสมาชิกไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    if (!username.trim()) {
      setError("กรุณาใส่ username");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await addMember(projectId, {
        username: username.trim(),
        role,
      });
      setUsername("");
      setRole("viewer");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "เพิ่มสมาชิกไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  async function handleRoleChange(userId: string, next: MemberRole) {
    setError("");
    try {
      await updateMemberRole(projectId, userId, next);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "เปลี่ยน role ไม่สำเร็จ");
    }
  }

  async function handleRemove(member: ProjectMember) {
    if (!confirm(`ลบ ${member.username} ออกจากโปรเจคใช่ไหม?`)) return;
    setError("");
    try {
      await removeMember(projectId, member.userId);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "ลบสมาชิกไม่สำเร็จ");
    }
  }

  return (
    <section className="rounded-2xl border border-border bg-surface p-5 shadow-[var(--shadow)]">
      <h3 className="text-lg font-semibold text-fg">Members</h3>
      <p className="mt-1 text-sm text-fg-muted">
        เพิ่มคนที่มีบัญชีในระบบด้วย username และกำหนดสิทธิ์ในโปรเจคนี้
      </p>

      {canManage ? (
        <form
          onSubmit={handleAdd}
          className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto]"
        >
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="username"
            className="h-10 rounded-lg border border-border bg-bg-elevated px-3 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft"
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as MemberRole)}
            className="h-10 rounded-lg border border-border bg-bg-elevated px-3 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft"
          >
            <option value="admin">Admin</option>
            <option value="editor">Editor</option>
            <option value="viewer">Viewer</option>
          </select>
          <button
            type="submit"
            disabled={saving}
            className="h-10 rounded-lg bg-accent px-4 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-60"
          >
            {saving ? "Adding..." : "Add"}
          </button>
        </form>
      ) : null}

      {error ? (
        <p className="mt-3 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="mt-4 text-sm text-fg-subtle">กำลังโหลด...</p>
      ) : members.length === 0 ? (
        <p className="mt-4 text-sm text-fg-muted">ยังไม่มีสมาชิก</p>
      ) : (
        <ul className="mt-4 divide-y divide-border">
          {members.map((m) => (
            <li
              key={m.userId}
              className="flex flex-wrap items-center justify-between gap-3 py-3"
            >
              <div className="min-w-0">
                <p className="font-medium text-fg">
                  {m.name}
                  <span className="ml-2 text-sm font-normal text-fg-subtle">
                    @{m.username}
                  </span>
                </p>
                {!canManage || m.isCreator ? (
                  <p className="mt-0.5 text-xs text-fg-muted">
                    {ROLE_LABELS[m.role] ?? m.role}
                  </p>
                ) : null}
              </div>
              {canManage && !m.isCreator ? (
                <div className="flex items-center gap-2">
                  <select
                    value={m.role}
                    onChange={(e) =>
                      void handleRoleChange(
                        m.userId,
                        e.target.value as MemberRole,
                      )
                    }
                    className="h-9 rounded-lg border border-border bg-bg-elevated px-2 text-xs outline-none focus:border-accent"
                  >
                    <option value="admin">Admin</option>
                    <option value="editor">Editor</option>
                    <option value="viewer">Viewer</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => void handleRemove(m)}
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
