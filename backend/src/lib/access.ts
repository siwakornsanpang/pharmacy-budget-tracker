import { and, eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { projectMembers, projects } from "../db/schema.js";

export type MemberRole = "admin" | "editor" | "viewer";
export type AccessRole = MemberRole | "creator";

export type ProjectAccess = {
  project: typeof projects.$inferSelect;
  isCreator: boolean;
  role: AccessRole;
  canEditProject: boolean;
  canDeleteProject: boolean;
  canEditTransactions: boolean;
  canManageMembers: boolean;
  canManagePeople: boolean;
};

export function accessFlags(access: ProjectAccess) {
  return {
    isCreator: access.isCreator,
    role: access.role,
    canEditProject: access.canEditProject,
    canDeleteProject: access.canDeleteProject,
    canEditTransactions: access.canEditTransactions,
    canManageMembers: access.canManageMembers,
    canManagePeople: access.canManagePeople,
  };
}

export async function getProjectAccess(
  userId: string,
  projectId: string,
): Promise<ProjectAccess | null> {
  const project = await db.query.projects.findFirst({
    where: eq(projects.id, projectId),
  });
  if (!project) return null;

  if (project.userId === userId) {
    return {
      project,
      isCreator: true,
      role: "creator",
      canEditProject: true,
      canDeleteProject: true,
      canEditTransactions: true,
      canManageMembers: true,
      canManagePeople: true,
    };
  }

  const member = await db.query.projectMembers.findFirst({
    where: and(
      eq(projectMembers.projectId, projectId),
      eq(projectMembers.userId, userId),
    ),
  });
  if (!member) return null;

  const role = member.role as MemberRole;
  if (role !== "admin" && role !== "editor" && role !== "viewer") {
    return null;
  }

  return {
    project,
    isCreator: false,
    role,
    canEditProject: role === "admin",
    canDeleteProject: false,
    canEditTransactions: role === "admin" || role === "editor",
    canManageMembers: false,
    canManagePeople: role === "admin",
  };
}
