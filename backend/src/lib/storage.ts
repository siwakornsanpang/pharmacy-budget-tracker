import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const BUCKET = "receipts";
const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
]);

let client: SupabaseClient | null = null;
let bucketReady = false;

function getClient(): SupabaseClient {
  const url = process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    throw new Error(
      "ยังไม่ได้ตั้ง SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY สำหรับอัปโหลดใบเสร็จ",
    );
  }
  if (!client) {
    client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}

async function ensureBucket(supabase: SupabaseClient) {
  if (bucketReady) return;
  const { data: buckets, error: listError } =
    await supabase.storage.listBuckets();
  if (listError) throw new Error(listError.message);

  const exists = buckets?.some((b) => b.name === BUCKET || b.id === BUCKET);
  if (!exists) {
    const { error } = await supabase.storage.createBucket(BUCKET, {
      public: true,
      fileSizeLimit: MAX_BYTES,
      allowedMimeTypes: [...ALLOWED],
    });
    if (error && !error.message.toLowerCase().includes("already exists")) {
      throw new Error(error.message);
    }
  }
  bucketReady = true;
}

export function assertAllowedMime(mimetype: string) {
  if (!ALLOWED.has(mimetype)) {
    throw new Error("รองรับเฉพาะไฟล์ภาพ (JPG/PNG/WEBP/GIF) หรือ PDF");
  }
}

export async function uploadReceiptFile(opts: {
  projectId: string;
  buffer: Buffer;
  filename: string;
  mimetype: string;
}): Promise<string> {
  if (opts.buffer.byteLength > MAX_BYTES) {
    throw new Error("ไฟล์ใหญ่เกิน 5MB");
  }
  if (!ALLOWED.has(opts.mimetype)) {
    throw new Error("รองรับเฉพาะไฟล์ภาพ (JPG/PNG/WEBP/GIF) หรือ PDF");
  }

  const supabase = getClient();
  await ensureBucket(supabase);

  const safeName = opts.filename
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .slice(0, 80);
  const path = `${opts.projectId}/${Date.now()}-${safeName}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, opts.buffer, {
      contentType: opts.mimetype,
      upsert: false,
    });

  if (error) {
    throw new Error(error.message);
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
