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

  const corsOrigin = process.env.CORS_ORIGIN ?? "*";
  await app.register(cors, {
    origin: corsOrigin === "*" ? true : corsOrigin.split(",").map((s) => s.trim()),
    credentials: true,
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
