import type { FastifyInstance } from "fastify";
import { and, asc, desc, eq, gte, lte } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/index.js";
import { projects, transactions } from "../db/schema.js";
import { serializeTransaction } from "../lib/serialize.js";

const transactionSchema = z.object({
  title: z.string().trim().min(1).max(200),
  category: z.string().trim().min(1).max(100),
  transactionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  amount: z.coerce.number().positive(),
  to: z.string().trim().min(1).max(200),
  note: z.string().trim().max(2000).optional(),
});

async function ownedProject(userId: string, projectId: string) {
  return db.query.projects.findFirst({
    where: and(eq(projects.id, projectId), eq(projects.userId, userId)),
  });
}

export async function transactionRoutes(app: FastifyInstance) {
  app.addHook("preHandler", app.authenticate);

  app.get("/projects/:projectId/transactions", async (request, reply) => {
    const { projectId } = request.params as { projectId: string };
    const project = await ownedProject(request.user.sub, projectId);
    if (!project) {
      return reply.code(404).send({ error: "Project not found" });
    }

    const query = z
      .object({
        q: z.string().optional(),
        category: z.string().optional(),
        dateFrom: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .optional(),
        dateTo: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .optional(),
        sort: z.enum(["date", "amount", "category", "title"]).default("date"),
        order: z.enum(["asc", "desc"]).default("desc"),
      })
      .parse(request.query);

    const conditions = [eq(transactions.projectId, projectId)];
    if (query.category && query.category !== "all") {
      conditions.push(eq(transactions.category, query.category));
    }
    if (query.dateFrom) {
      conditions.push(gte(transactions.transactionDate, query.dateFrom));
    }
    if (query.dateTo) {
      conditions.push(lte(transactions.transactionDate, query.dateTo));
    }

    const sortColumn = {
      date: transactions.transactionDate,
      amount: transactions.amount,
      category: transactions.category,
      title: transactions.title,
    }[query.sort];

    const rows = await db
      .select()
      .from(transactions)
      .where(and(...conditions))
      .orderBy(query.order === "asc" ? asc(sortColumn) : desc(sortColumn));

    const q = query.q?.trim().toLowerCase();
    const filtered = q
      ? rows.filter(
          (t) =>
            t.title.toLowerCase().includes(q) ||
            t.paidTo.toLowerCase().includes(q) ||
            t.id.toLowerCase().includes(q) ||
            (t.note ?? "").toLowerCase().includes(q),
        )
      : rows;

    return filtered.map(serializeTransaction);
  });

  app.post("/projects/:projectId/transactions", async (request, reply) => {
    const { projectId } = request.params as { projectId: string };
    const project = await ownedProject(request.user.sub, projectId);
    if (!project) {
      return reply.code(404).send({ error: "Project not found" });
    }

    const parsed = transactionSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: "Validation failed",
        details: parsed.error.flatten(),
      });
    }

    const [row] = await db
      .insert(transactions)
      .values({
        projectId,
        title: parsed.data.title,
        category: parsed.data.category,
        transactionDate: parsed.data.transactionDate,
        amount: parsed.data.amount.toFixed(2),
        paidTo: parsed.data.to,
        note: parsed.data.note || null,
      })
      .returning();

    return reply.code(201).send(serializeTransaction(row));
  });

  app.patch("/transactions/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const existing = await db.query.transactions.findFirst({
      where: eq(transactions.id, id),
    });
    if (!existing) {
      return reply.code(404).send({ error: "Transaction not found" });
    }

    const project = await ownedProject(request.user.sub, existing.projectId);
    if (!project) {
      return reply.code(404).send({ error: "Transaction not found" });
    }

    const parsed = transactionSchema.partial().safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: "Validation failed",
        details: parsed.error.flatten(),
      });
    }

    const [row] = await db
      .update(transactions)
      .set({
        title: parsed.data.title ?? existing.title,
        category: parsed.data.category ?? existing.category,
        transactionDate:
          parsed.data.transactionDate ?? existing.transactionDate,
        amount:
          parsed.data.amount !== undefined
            ? parsed.data.amount.toFixed(2)
            : existing.amount,
        paidTo: parsed.data.to ?? existing.paidTo,
        note:
          parsed.data.note !== undefined
            ? parsed.data.note || null
            : existing.note,
      })
      .where(eq(transactions.id, id))
      .returning();

    return serializeTransaction(row);
  });

  app.delete("/transactions/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const existing = await db.query.transactions.findFirst({
      where: eq(transactions.id, id),
    });
    if (!existing) {
      return reply.code(404).send({ error: "Transaction not found" });
    }

    const project = await ownedProject(request.user.sub, existing.projectId);
    if (!project) {
      return reply.code(404).send({ error: "Transaction not found" });
    }

    await db.delete(transactions).where(eq(transactions.id, id));
    return reply.code(204).send();
  });
}
