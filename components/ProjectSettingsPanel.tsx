"use client";

import { useEffect, useState, type FormEvent } from "react";
import { ProjectMembersPanel } from "@/components/ProjectMembersPanel";
import { ProjectPeoplePanel } from "@/components/ProjectPeoplePanel";
import { ProjectStatusField } from "@/components/ProjectStatusField";
import type { ProjectInput } from "@/lib/api-services";
import type { ProjectStatus, ProjectWithStats } from "@/lib/types";

type ProjectSettingsPanelProps = {
  project: ProjectWithStats;
  projectId: string;
  onSave: (input: ProjectInput) => Promise<void>;
  onDelete: () => Promise<void>;
};

export function ProjectSettingsPanel({
  project,
  projectId,
  onSave,
  onDelete,
}: ProjectSettingsPanelProps) {
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description);
  const [budget, setBudget] = useState(String(project.budget));
  const [startDate, setStartDate] = useState(project.startDate);
  const [endDate, setEndDate] = useState(project.endDate ?? "");
  const [unknownEnd, setUnknownEnd] = useState(!project.endDate);
  const [owner, setOwner] = useState(project.owner);
  const [status, setStatus] = useState<ProjectStatus>(
    project.status === "paused" || project.status === "completed"
      ? project.status
      : "active",
  );
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [savedOk, setSavedOk] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const canEdit = project.canEditProject !== false;

  useEffect(() => {
    setName(project.name);
    setDescription(project.description);
    setBudget(String(project.budget));
    setStartDate(project.startDate);
    setEndDate(project.endDate ?? "");
    setUnknownEnd(!project.endDate);
    setOwner(project.owner);
    setStatus(
      project.status === "paused" || project.status === "completed"
        ? project.status
        : "active",
    );
    setError("");
    setSavedOk(false);
  }, [
    project.id,
    project.name,
    project.description,
    project.budget,
    project.startDate,
    project.endDate,
    project.owner,
    project.status,
  ]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canEdit) return;

    const parsedBudget = Number(budget.replace(/,/g, ""));
    if (!name.trim() || !description.trim() || !owner.trim() || !startDate) {
      setError("กรุณากรอกข้อมูลให้ครบ");
      return;
    }
    if (!unknownEnd && !endDate) {
      setError("กรุณาใส่วันสิ้นสุด หรือเลือกไม่ระบุวันจบ");
      return;
    }
    if (!Number.isFinite(parsedBudget) || parsedBudget <= 0) {
      setError("งบประมาณต้องมากกว่า 0");
      return;
    }
    if (!unknownEnd && endDate && new Date(endDate) < new Date(startDate)) {
      setError("วันสิ้นสุดต้องไม่ก่อนวันเริ่ม");
      return;
    }

    setLoading(true);
    setError("");
    setSavedOk(false);
    try {
      await onSave({
        name: name.trim(),
        description: description.trim(),
        budget: parsedBudget,
        startDate,
        endDate: unknownEnd ? null : endDate,
        owner: owner.trim(),
        status,
      });
      setSavedOk(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "บันทึกไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteConfirm() {
    if (deleteConfirm.trim() !== project.name) {
      setDeleteError("ชื่อโครงการไม่ตรง — พิมพ์ชื่อให้ตรงทุกตัวอักษร");
      return;
    }
    setDeleteLoading(true);
    setDeleteError("");
    try {
      await onDelete();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "ลบโครงการไม่สำเร็จ");
      setDeleteLoading(false);
    }
  }

  const inputClass =
    "h-11 rounded-lg border border-border bg-bg-elevated px-3.5 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft disabled:cursor-not-allowed disabled:opacity-60";

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-border bg-surface p-6 shadow-[var(--shadow)]">
        <h3 className="text-lg font-semibold text-fg">แก้ไขโครงการ</h3>
        <p className="mt-1 text-sm text-fg-muted">
          อัปเดตชื่อ งบประมาณ ช่วงเวลา และผู้ดูแล
        </p>

        <form onSubmit={handleSubmit} className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 sm:col-span-2">
            <span className="text-xs font-medium text-fg-muted">Project Name</span>
            <input
              value={name}
              disabled={!canEdit}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-1.5 sm:col-span-2">
            <span className="text-xs font-medium text-fg-muted">Description</span>
            <textarea
              value={description}
              disabled={!canEdit}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="rounded-lg border border-border bg-bg-elevated px-3.5 py-2.5 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft disabled:cursor-not-allowed disabled:opacity-60"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-fg-muted">Budget (THB)</span>
            <input
              type="number"
              min="1"
              value={budget}
              disabled={!canEdit}
              onChange={(e) => setBudget(e.target.value)}
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-fg-muted">Owner</span>
            <input
              value={owner}
              disabled={!canEdit}
              onChange={(e) => setOwner(e.target.value)}
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-fg-muted">Start Date</span>
            <input
              type="date"
              value={startDate}
              disabled={!canEdit}
              onChange={(e) => setStartDate(e.target.value)}
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-fg-muted">End Date</span>
            <input
              type="date"
              value={endDate}
              disabled={!canEdit || unknownEnd}
              onChange={(e) => setEndDate(e.target.value)}
              className={inputClass}
            />
          </label>
          <label className="flex items-center gap-2 sm:col-span-2">
            <input
              type="checkbox"
              checked={unknownEnd}
              disabled={!canEdit}
              onChange={(e) => {
                setUnknownEnd(e.target.checked);
                if (e.target.checked) setEndDate("");
              }}
              className="h-4 w-4 rounded border-border accent-[var(--accent)]"
            />
            <span className="text-sm text-fg-muted">
              ไม่ระบุวันจบ / ยังไม่รู้วันจบ
            </span>
          </label>

          <ProjectStatusField
            value={status}
            onChange={setStatus}
            disabled={!canEdit}
          />

          {error ? (
            <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger sm:col-span-2">
              {error}
            </p>
          ) : null}
          {savedOk ? (
            <p className="rounded-lg bg-accent-soft px-3 py-2 text-sm text-accent sm:col-span-2">
              บันทึกแล้ว
            </p>
          ) : null}

          {canEdit ? (
            <div className="flex sm:col-span-2 sm:justify-end">
              <button
                type="submit"
                disabled={loading}
                className="h-10 rounded-lg bg-accent px-4 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-60"
              >
                {loading ? "Saving..." : "Save Changes"}
              </button>
            </div>
          ) : (
            <p className="text-sm text-fg-muted sm:col-span-2">
              คุณไม่มีสิทธิ์แก้ไขโครงการนี้
            </p>
          )}
        </form>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <ProjectMembersPanel
          projectId={projectId}
          canManage={Boolean(project.canManageMembers)}
        />
        <ProjectPeoplePanel
          projectId={projectId}
          canManage={Boolean(project.canManagePeople)}
        />
      </section>

      {project.canDeleteProject ? (
        <section className="rounded-2xl border border-danger/30 bg-surface p-6 shadow-[var(--shadow)]">
          <h3 className="text-lg font-semibold text-danger">Danger Zone</h3>
          <p className="mt-1 text-sm text-fg-muted">
            ลบโครงการนี้จะลบรายการธุรกรรมทั้งหมดด้วย และกู้คืนไม่ได้
          </p>

          {!deleteOpen ? (
            <button
              type="button"
              onClick={() => {
                setDeleteOpen(true);
                setDeleteConfirm("");
                setDeleteError("");
              }}
              className="mt-4 h-10 rounded-lg border border-danger px-4 text-sm font-semibold text-danger transition hover:bg-danger-soft"
            >
              Delete Project
            </button>
          ) : (
            <div className="mt-4 space-y-3 rounded-xl border border-border bg-bg-elevated p-4">
              <p className="text-sm text-fg-muted">
                พิมพ์ชื่อโครงการ{" "}
                <span className="font-semibold text-fg">{project.name}</span>{" "}
                เพื่อยืนยันการลบ
              </p>
              <input
                value={deleteConfirm}
                onChange={(e) => {
                  setDeleteConfirm(e.target.value);
                  setDeleteError("");
                }}
                placeholder="พิมพ์ชื่อโครงการให้ตรง"
                className={inputClass}
                autoComplete="off"
              />
              {deleteError ? (
                <p className="text-sm text-danger">{deleteError}</p>
              ) : null}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={deleteLoading}
                  onClick={() => {
                    setDeleteOpen(false);
                    setDeleteConfirm("");
                    setDeleteError("");
                  }}
                  className="h-10 rounded-lg border border-border px-4 text-sm font-medium text-fg-muted hover:border-accent hover:text-accent disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={
                    deleteLoading || deleteConfirm.trim() !== project.name
                  }
                  onClick={() => void handleDeleteConfirm()}
                  className="h-10 rounded-lg bg-danger px-4 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-40"
                >
                  {deleteLoading ? "Deleting..." : "ยืนยันลบโครงการ"}
                </button>
              </div>
            </div>
          )}
        </section>
      ) : null}
    </div>
  );
}
