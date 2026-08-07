import type { FastifyInstance } from "fastify";
import multipart from "@fastify/multipart";
import { getProjectAccess } from "../lib/access.js";
import { assertAllowedMime, uploadReceiptFile } from "../lib/storage.js";

export async function receiptRoutes(app: FastifyInstance) {
  await app.register(multipart, {
    limits: {
      fileSize: 5 * 1024 * 1024,
      files: 1,
    },
  });

  app.addHook("preHandler", app.authenticate);

  app.post("/projects/:projectId/receipts", async (request, reply) => {
    const { projectId } = request.params as { projectId: string };
    const access = await getProjectAccess(request.user.sub, projectId);
    if (!access) {
      return reply.code(404).send({ error: "Project not found" });
    }
    if (!access.canEditTransactions) {
      return reply.code(403).send({ error: "ไม่มีสิทธิ์อัปโหลดใบเสร็จ" });
    }

    const file = await request.file();
    if (!file) {
      return reply.code(400).send({ error: "กรุณาเลือกไฟล์ใบเสร็จ" });
    }

    try {
      assertAllowedMime(file.mimetype);
      const buffer = await file.toBuffer();
      const url = await uploadReceiptFile({
        projectId,
        buffer,
        filename: file.filename || "receipt",
        mimetype: file.mimetype,
      });
      return reply.code(201).send({ url });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "อัปโหลดใบเสร็จไม่สำเร็จ";
      const status =
        message.includes("SUPABASE") || message.includes("ตั้ง")
          ? 503
          : 400;
      return reply.code(status).send({ error: message });
    }
  });
}
