import type { FastifyInstance } from "fastify";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/index.js";
import { projectMembers, projects, transactions } from "../db/schema.js";
import { accessFlags, getProjectAccess } from "../lib/access.js";
import { serializeProject, toNumber } from "../lib/serialize.js";

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const projectSchema = z.object({
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(5000).default(""),
  budget: z.coerce.number().positive(),
  startDate: dateString,
  endDate: dateString.nullable().optional(),
  owner: z.string().trim().min(1).max(120),
});

async function accessibleProjectIds(userId: string): Promise<string[]> {
  const owned = await db
    .select({ id: projects.id })
    .from(projects)
    .where(eq(projects.userId, userId));

  const memberOf = await db
    .select({ id: projectMembers.projectId })
    .from(projectMembers)
    .where(eq(projectMembers.userId, userId));

  return [...new Set([...owned.map((r) => r.id), ...memberOf.map((r) => r.id)])];
}

export async function projectRoutes(app: FastifyInstance) {
  app.addHook("preHandler", app.authenticate);

  app.get("/projects", async (request) => {
    const query = z
      .object({
        status: z.enum(["all", "active", "completed"]).default("all"),
        q: z.string().optional(),
      })
      .parse(request.query);

    const ids = await accessibleProjectIds(request.user.sub);
    if (ids.length === 0) return [];

    const userProjects = await db
      .select()
      .from(projects)
      .where(inArray(projects.id, ids))
      .orderBy(desc(projects.createdAt));

    const spentRows = await db
      .select({
        projectId: transactions.projectId,
        spent: sql<string>`coalesce(sum(${transactions.amount}), 0)`,
      })
      .from(transactions)
      .where(inArray(transactions.projectId, ids))
      .groupBy(transactions.projectId);

    const spentMap = new Map(
      spentRows.map((r) => [r.projectId, toNumber(r.spent)]),
    );

    const memberRows = await db
      .select()
      .from(projectMembers)
      .where(
        and(
          eq(projectMembers.userId, request.user.sub),
          inArray(projectMembers.projectId, ids),
        ),
      );
    const memberRoleMap = new Map(
      memberRows.map((m) => [m.projectId, m.role]),
    );

    const today = new Date().toISOString().slice(0, 10);

    return userProjects
      .map((project) => {
        const spentNum = spentMap.get(project.id) ?? 0;
        const budget = toNumber(project.budget);
        const remaining = budget - spentNum;
        const completed = Boolean(
          project.endDate && project.endDate < today,
        );
        const serialized = serializeProject(project);
        const isCreator = project.userId === request.user.sub;
        const role = isCreator
          ? "creator"
          : (memberRoleMap.get(project.id) ?? "viewer");

        return {
          ...serialized,
          spent: spentNum,
          remaining,
          percentUsed:
            budget > 0 ? Math.round((spentNum / budget) * 1000) / 10 : 0,
          variance: spentNum - budget,
          variancePct:
            budget > 0
              ? Math.round(((spentNum - budget) / budget) * 1000) / 10
              : 0,
          status: completed ? "completed" : "active",
          isCreator,
          role,
        };
      })
      .filter((p) => {
        if (query.status === "active" && p.status !== "active") return false;
        if (query.status === "completed" && p.status !== "completed")
          return false;
        if (query.q) {
          const q = query.q.toLowerCase();
          return (
            p.name.toLowerCase().includes(q) ||
            p.owner.toLowerCase().includes(q)
          );
        }
        return true;
      });
  });

  app.post("/projects", async (request, reply) => {
    const parsed = projectSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: "Validation failed",
        details: parsed.error.flatten(),
      });
    }

    if (
      parsed.data.endDate &&
      parsed.data.endDate < parsed.data.startDate
    ) {
      return reply
        .code(400)
        .send({ error: "End date must be on or after start date" });
    }

    const [row] = await db
      .insert(projects)
      .values({
        userId: request.user.sub,
        name: parsed.data.name,
        description: parsed.data.description,
        budget: parsed.data.budget.toFixed(2),
        startDate: parsed.data.startDate,
        endDate: parsed.data.endDate ?? null,
        owner: parsed.data.owner,
      })
      .returning();

    return reply.code(201).send(serializeProject(row));
  });

  app.get("/projects/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const access = await getProjectAccess(request.user.sub, id);
    if (!access) {
      return reply.code(404).send({ error: "Project not found" });
    }

    const [{ spent }] = await db
      .select({
        spent: sql<string>`coalesce(sum(${transactions.amount}), 0)`,
      })
      .from(transactions)
      .where(eq(transactions.projectId, id));

    const spentNum = toNumber(spent);
    const budget = toNumber(access.project.budget);
    const today = new Date().toISOString().slice(0, 10);

    return {
      ...serializeProject(access.project),
      spent: spentNum,
      remaining: budget - spentNum,
      percentUsed:
        budget > 0 ? Math.round((spentNum / budget) * 1000) / 10 : 0,
      status:
        access.project.endDate && access.project.endDate < today
          ? "completed"
          : "active",
      ...accessFlags(access),
    };
  });

  app.patch("/projects/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const access = await getProjectAccess(request.user.sub, id);
    if (!access) {
      return reply.code(404).send({ error: "Project not found" });
    }
    if (!access.canEditProject) {
      return reply.code(403).send({ error: "ไม่มีสิทธิ์แก้ไขโครงการ" });
    }

    const parsed = projectSchema.partial().safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: "Validation failed",
        details: parsed.error.flatten(),
      });
    }

    const existing = access.project;
    const next = {
      name: parsed.data.name ?? existing.name,
      description: parsed.data.description ?? existing.description,
      budget:
        parsed.data.budget !== undefined
          ? parsed.data.budget.toFixed(2)
          : existing.budget,
      startDate: parsed.data.startDate ?? existing.startDate,
      endDate:
        parsed.data.endDate !== undefined
          ? parsed.data.endDate
          : existing.endDate,
      owner: parsed.data.owner ?? existing.owner,
    };

    if (next.endDate && next.endDate < next.startDate) {
      return reply
        .code(400)
        .send({ error: "End date must be on or after start date" });
    }

    const [row] = await db
      .update(projects)
      .set(next)
      .where(eq(projects.id, id))
      .returning();

    return serializeProject(row);
  });

  app.delete("/projects/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const access = await getProjectAccess(request.user.sub, id);
    if (!access) {
      return reply.code(404).send({ error: "Project not found" });
    }
    if (!access.canDeleteProject) {
      return reply.code(403).send({ error: "เฉพาะผู้สร้างโครงการเท่านั้นที่ลบได้" });
    }

    await db.delete(projects).where(eq(projects.id, id));
    return reply.code(204).send();
  });
}
