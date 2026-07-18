import type { FastifyInstance } from "fastify";
import { and, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/index.js";
import { projects, transactions } from "../db/schema.js";
import { serializeProject, toNumber } from "../lib/serialize.js";

const projectSchema = z.object({
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(5000).default(""),
  budget: z.coerce.number().positive(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  owner: z.string().trim().min(1).max(120),
});

export async function projectRoutes(app: FastifyInstance) {
  app.addHook("preHandler", app.authenticate);

  app.get("/projects", async (request) => {
    const query = z
      .object({
        status: z.enum(["all", "active", "completed"]).default("all"),
        q: z.string().optional(),
      })
      .parse(request.query);

    const userProjects = await db
      .select()
      .from(projects)
      .where(eq(projects.userId, request.user.sub))
      .orderBy(desc(projects.createdAt));

    const spentRows = await db
      .select({
        projectId: transactions.projectId,
        spent: sql<string>`coalesce(sum(${transactions.amount}), 0)`,
      })
      .from(transactions)
      .innerJoin(projects, eq(transactions.projectId, projects.id))
      .where(eq(projects.userId, request.user.sub))
      .groupBy(transactions.projectId);

    const spentMap = new Map(
      spentRows.map((r) => [r.projectId, toNumber(r.spent)]),
    );

    const today = new Date().toISOString().slice(0, 10);

    return userProjects
      .map((project) => {
        const spentNum = spentMap.get(project.id) ?? 0;
        const budget = toNumber(project.budget);
        const remaining = budget - spentNum;
        const completed = project.endDate < today;
        const serialized = serializeProject(project);

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

    if (parsed.data.endDate < parsed.data.startDate) {
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
        endDate: parsed.data.endDate,
        owner: parsed.data.owner,
      })
      .returning();

    return reply.code(201).send(serializeProject(row));
  });

  app.get("/projects/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const row = await db.query.projects.findFirst({
      where: and(eq(projects.id, id), eq(projects.userId, request.user.sub)),
    });

    if (!row) {
      return reply.code(404).send({ error: "Project not found" });
    }

    const [{ spent }] = await db
      .select({
        spent: sql<string>`coalesce(sum(${transactions.amount}), 0)`,
      })
      .from(transactions)
      .where(eq(transactions.projectId, id));

    const spentNum = toNumber(spent);
    const budget = toNumber(row.budget);
    const today = new Date().toISOString().slice(0, 10);

    return {
      ...serializeProject(row),
      spent: spentNum,
      remaining: budget - spentNum,
      percentUsed:
        budget > 0 ? Math.round((spentNum / budget) * 1000) / 10 : 0,
      status: row.endDate < today ? "completed" : "active",
    };
  });

  app.patch("/projects/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = projectSchema.partial().safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: "Validation failed",
        details: parsed.error.flatten(),
      });
    }

    const existing = await db.query.projects.findFirst({
      where: and(eq(projects.id, id), eq(projects.userId, request.user.sub)),
    });
    if (!existing) {
      return reply.code(404).send({ error: "Project not found" });
    }

    const next = {
      name: parsed.data.name ?? existing.name,
      description: parsed.data.description ?? existing.description,
      budget:
        parsed.data.budget !== undefined
          ? parsed.data.budget.toFixed(2)
          : existing.budget,
      startDate: parsed.data.startDate ?? existing.startDate,
      endDate: parsed.data.endDate ?? existing.endDate,
      owner: parsed.data.owner ?? existing.owner,
    };

    if (next.endDate < next.startDate) {
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
    const existing = await db.query.projects.findFirst({
      where: and(eq(projects.id, id), eq(projects.userId, request.user.sub)),
    });
    if (!existing) {
      return reply.code(404).send({ error: "Project not found" });
    }

    await db.delete(projects).where(eq(projects.id, id));
    return reply.code(204).send();
  });
}
