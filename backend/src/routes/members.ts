import type { FastifyInstance } from "fastify";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/index.js";
import { projectMembers, users } from "../db/schema.js";
import { getProjectAccess, type MemberRole } from "../lib/access.js";

const roleSchema = z.enum(["admin", "editor", "viewer"]);

const addMemberSchema = z.object({
  username: z.string().trim().min(1).max(64),
  role: roleSchema,
});

const updateMemberSchema = z.object({
  role: roleSchema,
});

export async function memberRoutes(app: FastifyInstance) {
  app.addHook("preHandler", app.authenticate);

  app.get("/projects/:projectId/members", async (request, reply) => {
    const { projectId } = request.params as { projectId: string };
    const access = await getProjectAccess(request.user.sub, projectId);
    if (!access) {
      return reply.code(404).send({ error: "Project not found" });
    }

    const creator = await db.query.users.findFirst({
      where: eq(users.id, access.project.userId),
    });

    const rows = await db
      .select({
        id: projectMembers.id,
        userId: projectMembers.userId,
        role: projectMembers.role,
        createdAt: projectMembers.createdAt,
        username: users.username,
        name: users.name,
      })
      .from(projectMembers)
      .innerJoin(users, eq(projectMembers.userId, users.id))
      .where(eq(projectMembers.projectId, projectId));

    const members = [
      {
        userId: access.project.userId,
        username: creator?.username ?? "",
        name: creator?.name ?? access.project.owner,
        role: "creator" as const,
        isCreator: true,
        createdAt: access.project.createdAt.toISOString(),
      },
      ...rows.map((r) => ({
        id: r.id,
        userId: r.userId,
        username: r.username,
        name: r.name,
        role: r.role as MemberRole,
        isCreator: false,
        createdAt: r.createdAt.toISOString(),
      })),
    ];

    return members;
  });

  app.post("/projects/:projectId/members", async (request, reply) => {
    const { projectId } = request.params as { projectId: string };
    const access = await getProjectAccess(request.user.sub, projectId);
    if (!access) {
      return reply.code(404).send({ error: "Project not found" });
    }
    if (!access.canManageMembers) {
      return reply
        .code(403)
        .send({ error: "เฉพาะผู้สร้างโครงการเท่านั้นที่เพิ่มสมาชิกได้" });
    }

    const parsed = addMemberSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: "Validation failed",
        details: parsed.error.flatten(),
      });
    }

    const username = parsed.data.username.toLowerCase();
    const user = await db.query.users.findFirst({
      where: eq(users.username, username),
    });
    if (!user) {
      return reply.code(404).send({ error: "ไม่พบ username นี้ในระบบ" });
    }
    if (user.id === access.project.userId) {
      return reply
        .code(400)
        .send({ error: "ผู้สร้างโครงการอยู่ในโปรเจคอยู่แล้ว" });
    }

    const existing = await db.query.projectMembers.findFirst({
      where: and(
        eq(projectMembers.projectId, projectId),
        eq(projectMembers.userId, user.id),
      ),
    });
    if (existing) {
      return reply.code(409).send({ error: "ผู้ใช้นี้อยู่ในโปรเจคแล้ว" });
    }

    const [row] = await db
      .insert(projectMembers)
      .values({
        projectId,
        userId: user.id,
        role: parsed.data.role,
      })
      .returning();

    return reply.code(201).send({
      id: row.id,
      userId: user.id,
      username: user.username,
      name: user.name,
      role: row.role,
      isCreator: false,
      createdAt: row.createdAt.toISOString(),
    });
  });

  app.patch(
    "/projects/:projectId/members/:userId",
    async (request, reply) => {
      const { projectId, userId } = request.params as {
        projectId: string;
        userId: string;
      };
      const access = await getProjectAccess(request.user.sub, projectId);
      if (!access) {
        return reply.code(404).send({ error: "Project not found" });
      }
      if (!access.canManageMembers) {
        return reply
          .code(403)
          .send({ error: "เฉพาะผู้สร้างโครงการเท่านั้นที่เปลี่ยน role ได้" });
      }
      if (userId === access.project.userId) {
        return reply
          .code(400)
          .send({ error: "ไม่สามารถเปลี่ยน role ของผู้สร้างโครงการได้" });
      }

      const parsed = updateMemberSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({
          error: "Validation failed",
          details: parsed.error.flatten(),
        });
      }

      const existing = await db.query.projectMembers.findFirst({
        where: and(
          eq(projectMembers.projectId, projectId),
          eq(projectMembers.userId, userId),
        ),
      });
      if (!existing) {
        return reply.code(404).send({ error: "ไม่พบสมาชิกนี้ในโปรเจค" });
      }

      const [row] = await db
        .update(projectMembers)
        .set({ role: parsed.data.role })
        .where(eq(projectMembers.id, existing.id))
        .returning();

      const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
      });

      return {
        id: row.id,
        userId: row.userId,
        username: user?.username ?? "",
        name: user?.name ?? "",
        role: row.role,
        isCreator: false,
        createdAt: row.createdAt.toISOString(),
      };
    },
  );

  app.delete(
    "/projects/:projectId/members/:userId",
    async (request, reply) => {
      const { projectId, userId } = request.params as {
        projectId: string;
        userId: string;
      };
      const access = await getProjectAccess(request.user.sub, projectId);
      if (!access) {
        return reply.code(404).send({ error: "Project not found" });
      }
      if (!access.canManageMembers) {
        return reply
          .code(403)
          .send({ error: "เฉพาะผู้สร้างโครงการเท่านั้นที่ลบสมาชิกได้" });
      }
      if (userId === access.project.userId) {
        return reply
          .code(400)
          .send({ error: "ไม่สามารถลบผู้สร้างโครงการได้" });
      }

      const existing = await db.query.projectMembers.findFirst({
        where: and(
          eq(projectMembers.projectId, projectId),
          eq(projectMembers.userId, userId),
        ),
      });
      if (!existing) {
        return reply.code(404).send({ error: "ไม่พบสมาชิกนี้ในโปรเจค" });
      }

      await db.delete(projectMembers).where(eq(projectMembers.id, existing.id));
      return reply.code(204).send();
    },
  );
}
