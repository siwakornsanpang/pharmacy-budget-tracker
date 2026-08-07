import type { FastifyInstance } from "fastify";
import { and, asc, desc, eq, gte, lte } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/index.js";
import { projectPeople, transactions } from "../db/schema.js";
import { getProjectAccess } from "../lib/access.js";
import { serializeTransaction } from "../lib/serialize.js";

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const transactionSchema = z.object({
  kind: z.enum(["general", "salary"]).default("general"),
  title: z.string().trim().min(1).max(200),
  category: z.string().trim().min(1).max(100).optional(),
  transactionDate: dateString,
  amount: z.coerce.number().positive(),
  to: z.string().trim().max(200).optional(),
  personId: z.string().uuid().nullable().optional(),
  note: z.string().trim().max(2000).optional(),
});

const transactionPatchSchema = transactionSchema.partial();

async function resolveSalaryPayee(
  projectId: string,
  personId: string | null | undefined,
  externalName: string | undefined,
): Promise<{ paidTo: string; personId: string | null } | { error: string }> {
  if (personId) {
    const person = await db.query.projectPeople.findFirst({
      where: eq(projectPeople.id, personId),
    });
    if (!person || person.projectId !== projectId) {
      return { error: "ไม่พบคนในทีมนี้" };
    }
    return { paidTo: person.name, personId: person.id };
  }
  const name = externalName?.trim();
  if (!name) {
    return { error: "กรุณาใส่ชื่อผู้รับค่าแรง" };
  }
  return { paidTo: name, personId: null };
}

export async function transactionRoutes(app: FastifyInstance) {
  app.addHook("preHandler", app.authenticate);

  app.get("/projects/:projectId/transactions", async (request, reply) => {
    const { projectId } = request.params as { projectId: string };
    const access = await getProjectAccess(request.user.sub, projectId);
    if (!access) {
      return reply.code(404).send({ error: "Project not found" });
    }

    const query = z
      .object({
        q: z.string().optional(),
        kind: z.enum(["all", "general", "salary"]).default("all"),
        category: z.string().optional(),
        dateFrom: dateString.optional(),
        dateTo: dateString.optional(),
        sort: z.enum(["date", "amount", "category", "title"]).default("date"),
        order: z.enum(["asc", "desc"]).default("desc"),
      })
      .parse(request.query);

    const conditions = [eq(transactions.projectId, projectId)];
    if (query.kind !== "all") {
      conditions.push(eq(transactions.kind, query.kind));
    }
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
    const access = await getProjectAccess(request.user.sub, projectId);
    if (!access) {
      return reply.code(404).send({ error: "Project not found" });
    }
    if (!access.canEditTransactions) {
      return reply.code(403).send({ error: "ไม่มีสิทธิ์เพิ่มรายการ" });
    }

    const parsed = transactionSchema.safeParse(request.body);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      return reply.code(400).send({
        error: first?.message || "Validation failed",
        details: parsed.error.flatten(),
      });
    }

    const kind = parsed.data.kind;
    let paidTo = parsed.data.to?.trim() || "";
    let personId: string | null = null;
    let category = parsed.data.category?.trim() || "อื่นๆ";

    if (kind === "salary") {
      category = "ค่าแรง";
      const resolved = await resolveSalaryPayee(
        projectId,
        parsed.data.personId,
        parsed.data.to,
      );
      if ("error" in resolved) {
        return reply.code(400).send({ error: resolved.error });
      }
      paidTo = resolved.paidTo;
      personId = resolved.personId;
    } else if (!paidTo) {
      return reply.code(400).send({ error: "กรุณาใส่ Paid To" });
    }

    const [row] = await db
      .insert(transactions)
      .values({
        projectId,
        kind,
        title: parsed.data.title,
        category,
        transactionDate: parsed.data.transactionDate,
        amount: parsed.data.amount.toFixed(2),
        paidTo,
        personId,
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

    const access = await getProjectAccess(
      request.user.sub,
      existing.projectId,
    );
    if (!access) {
      return reply.code(404).send({ error: "Transaction not found" });
    }
    if (!access.canEditTransactions) {
      return reply.code(403).send({ error: "ไม่มีสิทธิ์แก้ไขรายการ" });
    }

    const parsed = transactionPatchSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: parsed.error.issues[0]?.message || "Validation failed",
        details: parsed.error.flatten(),
      });
    }

    const kind = parsed.data.kind ?? (existing.kind as "general" | "salary");
    let paidTo = parsed.data.to !== undefined
      ? parsed.data.to.trim()
      : existing.paidTo;
    let personId =
      parsed.data.personId !== undefined
        ? parsed.data.personId
        : existing.personId;
    let category =
      parsed.data.category !== undefined
        ? parsed.data.category.trim()
        : existing.category;

    if (kind === "salary") {
      category = "ค่าแรง";
      const resolved = await resolveSalaryPayee(
        existing.projectId,
        parsed.data.personId !== undefined
          ? parsed.data.personId
          : existing.personId,
        parsed.data.to !== undefined ? parsed.data.to : existing.paidTo,
      );
      if ("error" in resolved) {
        return reply.code(400).send({ error: resolved.error });
      }
      paidTo = resolved.paidTo;
      personId = resolved.personId;
    } else {
      personId = null;
      if (!paidTo) {
        return reply.code(400).send({ error: "กรุณาใส่ Paid To" });
      }
    }

    const [row] = await db
      .update(transactions)
      .set({
        kind,
        title: parsed.data.title ?? existing.title,
        category,
        transactionDate:
          parsed.data.transactionDate ?? existing.transactionDate,
        amount:
          parsed.data.amount !== undefined
            ? parsed.data.amount.toFixed(2)
            : existing.amount,
        paidTo,
        personId,
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

    const access = await getProjectAccess(
      request.user.sub,
      existing.projectId,
    );
    if (!access) {
      return reply.code(404).send({ error: "Transaction not found" });
    }
    if (!access.canEditTransactions) {
      return reply.code(403).send({ error: "ไม่มีสิทธิ์ลบรายการ" });
    }

    await db.delete(transactions).where(eq(transactions.id, id));
    return reply.code(204).send();
  });
}
