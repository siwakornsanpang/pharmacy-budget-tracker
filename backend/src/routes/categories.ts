import type { FastifyInstance } from "fastify";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/index.js";
import { categories } from "../db/schema.js";

export async function categoryRoutes(app: FastifyInstance) {
  app.addHook("preHandler", app.authenticate);

  app.get("/categories", async (request) => {
    const rows = await db
      .select()
      .from(categories)
      .where(eq(categories.userId, request.user.sub))
      .orderBy(categories.name);

    return rows.map((r) => ({ id: r.id, name: r.name }));
  });

  app.post("/categories", async (request, reply) => {
    const parsed = z
      .object({ name: z.string().trim().min(1).max(100) })
      .safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({
        error: "Validation failed",
        details: parsed.error.flatten(),
      });
    }

    const name = parsed.data.name;
    const existing = await db.query.categories.findFirst({
      where: and(
        eq(categories.userId, request.user.sub),
        eq(categories.name, name),
      ),
    });

    if (existing) {
      return { id: existing.id, name: existing.name };
    }

    const [row] = await db
      .insert(categories)
      .values({ userId: request.user.sub, name })
      .returning();

    return reply.code(201).send({ id: row.id, name: row.name });
  });
}
