import type { FastifyInstance } from "fastify";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/index.js";
import { projectPeople } from "../db/schema.js";
import { getProjectAccess } from "../lib/access.js";

const personSchema = z.object({
  name: z.string().trim().min(1).max(200),
  roleTitle: z.string().trim().min(1).max(200),
  note: z.string().trim().max(2000).optional(),
});

function serializePerson(row: typeof projectPeople.$inferSelect) {
  return {
    id: row.id,
    projectId: row.projectId,
    name: row.name,
    roleTitle: row.roleTitle,
    note: row.note ?? undefined,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function peopleRoutes(app: FastifyInstance) {
  app.addHook("preHandler", app.authenticate);

  app.get("/projects/:projectId/people", async (request, reply) => {
    const { projectId } = request.params as { projectId: string };
    const access = await getProjectAccess(request.user.sub, projectId);
    if (!access) {
      return reply.code(404).send({ error: "Project not found" });
    }

    const rows = await db
      .select()
      .from(projectPeople)
      .where(eq(projectPeople.projectId, projectId))
      .orderBy(asc(projectPeople.name));

    return rows.map(serializePerson);
  });

  app.post("/projects/:projectId/people", async (request, reply) => {
    const { projectId } = request.params as { projectId: string };
    const access = await getProjectAccess(request.user.sub, projectId);
    if (!access) {
      return reply.code(404).send({ error: "Project not found" });
    }
    if (!access.canManagePeople) {
      return reply.code(403).send({ error: "ไม่มีสิทธิ์เพิ่มรายชื่อทีม" });
    }

    const parsed = personSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: "Validation failed",
        details: parsed.error.flatten(),
      });
    }

    const [row] = await db
      .insert(projectPeople)
      .values({
        projectId,
        name: parsed.data.name,
        roleTitle: parsed.data.roleTitle,
        note: parsed.data.note || null,
      })
      .returning();

    return reply.code(201).send(serializePerson(row));
  });

  app.patch("/projects/:projectId/people/:personId", async (request, reply) => {
    const { projectId, personId } = request.params as {
      projectId: string;
      personId: string;
    };
    const access = await getProjectAccess(request.user.sub, projectId);
    if (!access) {
      return reply.code(404).send({ error: "Project not found" });
    }
    if (!access.canManagePeople) {
      return reply.code(403).send({ error: "ไม่มีสิทธิ์แก้ไขรายชื่อทีม" });
    }

    const parsed = personSchema.partial().safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: "Validation failed",
        details: parsed.error.flatten(),
      });
    }

    const existing = await db.query.projectPeople.findFirst({
      where: eq(projectPeople.id, personId),
    });
    if (!existing || existing.projectId !== projectId) {
      return reply.code(404).send({ error: "ไม่พบรายชื่อนี้" });
    }

    const [row] = await db
      .update(projectPeople)
      .set({
        name: parsed.data.name ?? existing.name,
        roleTitle: parsed.data.roleTitle ?? existing.roleTitle,
        note:
          parsed.data.note !== undefined
            ? parsed.data.note || null
            : existing.note,
      })
      .where(eq(projectPeople.id, personId))
      .returning();

    return serializePerson(row);
  });

  app.delete(
    "/projects/:projectId/people/:personId",
    async (request, reply) => {
      const { projectId, personId } = request.params as {
        projectId: string;
        personId: string;
      };
      const access = await getProjectAccess(request.user.sub, projectId);
      if (!access) {
        return reply.code(404).send({ error: "Project not found" });
      }
      if (!access.canManagePeople) {
        return reply.code(403).send({ error: "ไม่มีสิทธิ์ลบรายชื่อทีม" });
      }

      const existing = await db.query.projectPeople.findFirst({
        where: eq(projectPeople.id, personId),
      });
      if (!existing || existing.projectId !== projectId) {
        return reply.code(404).send({ error: "ไม่พบรายชื่อนี้" });
      }

      await db.delete(projectPeople).where(eq(projectPeople.id, personId));
      return reply.code(204).send();
    },
  );
}
