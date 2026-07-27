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

const ROLE_BADGE: Record<string, { label: string; className: string }> = {
  creator: {
    label: "ผู้สร้าง",
    className: "bg-accent-soft text-accent",
  },
  admin: {
    label: "Admin",
    className: "bg-accent-soft text-accent",
  },
  editor: {
    label: "Editor",
    className: "bg-bg text-fg-muted",
  },
  viewer: {
    label: "Viewer",
    className: "bg-bg text-fg-subtle",
  },
};

type ProjectMembersPanelProps = {
  projectId: string;
  canManage: boolean;
};

function initials(name: string) {
  return name.trim().slice(0, 1).toUpperCase() || "?";
}

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
  const [showAdd, setShowAdd] = useState(false);

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
      setShowAdd(false);
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
    <section className="flex h-full flex-col rounded-2xl border border-border bg-surface shadow-[var(--shadow)]">
      <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
        <div>
          <h3 className="text-base font-semibold text-fg">Members</h3>
          <p className="mt-0.5 text-xs text-fg-subtle">
            คนที่มีบัญชีในระบบ · กำหนดสิทธิ์การใช้งาน
          </p>
        </div>
        {canManage ? (
          <button
            type="button"
            onClick={() => {
              setShowAdd((v) => !v);
              setError("");
            }}
            className="shrink-0 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-fg-muted transition hover:border-accent hover:text-accent"
          >
            {showAdd ? "ปิด" : "+ เพิ่ม"}
          </button>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col p-4">
        {canManage && showAdd ? (
          <form
            onSubmit={handleAdd}
            className="mb-4 space-y-3 rounded-xl bg-bg-elevated p-3"
          >
            <label className="block">
              <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-fg-subtle">
                Username
              </span>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="เช่น demo2"
                autoFocus
                className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-fg-subtle">
                Role
              </span>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as MemberRole)}
                className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft"
              >
                <option value="viewer">Viewer — ดูอย่างเดียว</option>
                <option value="editor">Editor — แก้รายการ</option>
                <option value="admin">Admin — แก้โปรเจค + รายการ</option>
              </select>
            </label>
            <button
              type="submit"
              disabled={saving}
              className="h-10 w-full rounded-lg bg-accent text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-60"
            >
              {saving ? "กำลังเพิ่ม..." : "เพิ่มสมาชิก"}
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
        ) : members.length === 0 ? (
          <p className="py-8 text-center text-sm text-fg-muted">ยังไม่มีสมาชิก</p>
        ) : (
          <ul className="space-y-2">
            {members.map((m) => {
              const badge = ROLE_BADGE[m.role] ?? ROLE_BADGE.viewer;
              return (
                <li
                  key={m.userId}
                  className="flex items-center gap-3 rounded-xl border border-border/70 px-3 py-2.5"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-sm font-semibold text-accent">
                    {initials(m.name)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-fg">
                      {m.name}
                    </p>
                    <p className="truncate text-xs text-fg-subtle">
                      @{m.username}
                    </p>
                  </div>
                  {canManage && !m.isCreator ? (
                    <div className="flex shrink-0 items-center gap-1.5">
                      <select
                        value={m.role}
                        onChange={(e) =>
                          void handleRoleChange(
                            m.userId,
                            e.target.value as MemberRole,
                          )
                        }
                        className="h-8 max-w-[6.5rem] rounded-md border border-border bg-bg-elevated px-1.5 text-xs outline-none focus:border-accent"
                        aria-label="เปลี่ยน role"
                      >
                        <option value="admin">Admin</option>
                        <option value="editor">Editor</option>
                        <option value="viewer">Viewer</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => void handleRemove(m)}
                        className="rounded-md px-2 py-1 text-xs text-fg-subtle hover:bg-danger-soft hover:text-danger"
                      >
                        ลบ
                      </button>
                    </div>
                  ) : (
                    <span
                      className={`shrink-0 rounded-md px-2 py-0.5 text-[11px] font-semibold ${badge.className}`}
                    >
                      {badge.label}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
