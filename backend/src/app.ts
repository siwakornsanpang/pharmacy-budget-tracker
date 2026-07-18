import Fastify from "fastify";
import cors from "@fastify/cors";
import { registerAuth } from "./plugins/auth.js";
import { authRoutes } from "./routes/auth.js";
import { projectRoutes } from "./routes/projects.js";
import { transactionRoutes } from "./routes/transactions.js";
import { categoryRoutes } from "./routes/categories.js";

export async function buildApp() {
  const app = Fastify({
    logger: true,
  });

  // Bearer token auth — no cookies — so we can reflect any browser origin.
  // CORS_ORIGIN can still restrict to a comma-separated allowlist if set.
  const corsOrigin = process.env.CORS_ORIGIN?.trim();
  await app.register(cors, {
    origin:
      !corsOrigin || corsOrigin === "*"
        ? true
        : corsOrigin.split(",").map((s: string) => s.trim()),
    methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: false,
  });

  await registerAuth(app);

  app.get("/health", async () => ({
    ok: true,
    service: "budget-tracker-api",
    time: new Date().toISOString(),
  }));

  await app.register(authRoutes);
  await app.register(projectRoutes);
  await app.register(transactionRoutes);
  await app.register(categoryRoutes);

  return app;
}
