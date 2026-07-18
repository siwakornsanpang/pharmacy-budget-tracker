import type { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/index.js";
import { categories, users } from "../db/schema.js";
import { hashPassword, verifyPassword } from "../lib/password.js";
import { DEFAULT_CATEGORIES } from "../lib/serialize.js";

const credentialsSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, "Username ต้องยาวอย่างน้อย 3 ตัวอักษร")
    .max(64)
    .regex(/^[a-zA-Z0-9._-]+$/, "Username ใช้ได้แค่ a-z, 0-9, . _ -"),
  password: z.string().min(6, "Password ต้องยาวอย่างน้อย 6 ตัวอักษร").max(128),
  name: z.string().trim().min(1).max(120).optional(),
});

export async function authRoutes(app: FastifyInstance) {
  app.post("/auth/register", async (request, reply) => {
    const parsed = credentialsSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: "Validation failed",
        details: parsed.error.flatten(),
      });
    }

    const { username, password, name } = parsed.data;
    const existing = await db.query.users.findFirst({
      where: eq(users.username, username.toLowerCase()),
    });

    if (existing) {
      return reply.code(409).send({ error: "Username นี้ถูกใช้แล้ว" });
    }

    const passwordHash = await hashPassword(password);
    const displayName = name?.trim() || username;

    const [user] = await db
      .insert(users)
      .values({
        username: username.toLowerCase(),
        passwordHash,
        name: displayName,
      })
      .returning();

    await db.insert(categories).values(
      DEFAULT_CATEGORIES.map((cat) => ({
        userId: user.id,
        name: cat,
      })),
    );

    const token = app.jwt.sign({
      sub: user.id,
      username: user.username,
    });

    return reply.code(201).send({
      token,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
      },
    });
  });

  app.post("/auth/login", async (request, reply) => {
    const parsed = credentialsSchema
      .pick({ username: true, password: true })
      .safeParse(request.body);

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
      return reply.code(401).send({ error: "Username หรือ Password ไม่ถูกต้อง" });
    }

    const ok = await verifyPassword(parsed.data.password, user.passwordHash);
    if (!ok) {
      return reply.code(401).send({ error: "Username หรือ Password ไม่ถูกต้อง" });
    }

    const token = app.jwt.sign({
      sub: user.id,
      username: user.username,
    });

    return {
      token,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
      },
    };
  });

  app.get(
    "/auth/me",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const user = await db.query.users.findFirst({
        where: eq(users.id, request.user.sub),
      });

      if (!user) {
        return reply.code(404).send({ error: "User not found" });
      }

      return {
        id: user.id,
        username: user.username,
        name: user.name,
      };
    },
  );
}
