import {
  clearStoredAuth,
  getToken,
} from "@/lib/auth";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ||
  "http://localhost:8080";

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "ApiError";
  }
}

type RequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
  auth?: boolean;
};

export async function api<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { body, auth = true, headers: initHeaders, ...rest } = options;
  const headers = new Headers(initHeaders);

  if (body !== undefined) {
    headers.set("Content-Type", "application/json");
  }

  if (auth) {
    const token = getToken();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  const url = `${API_URL}${path}`;

  let response: Response;
  try {
    response = await fetch(url, {
      ...rest,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    const isLocalFallback = API_URL.includes("localhost");
    throw new ApiError(
      0,
      isLocalFallback
        ? "ยังไม่ได้ตั้ง NEXT_PUBLIC_API_URL บน Vercel — ให้ใส่ URL ของ Render แล้ว Redeploy"
        : `เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ (${API_URL}) — อาจเป็น cold start หรือ CORS ไม่ตรง รอ ~1 นาทีแล้วลองใหม่ หรือเปิด /health ของ API ในแท็บใหม่ก่อน`,
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const data = (await response.json().catch(() => ({}))) as {
    error?: string;
  };

  if (!response.ok) {
    if (response.status === 401 && auth) {
      clearStoredAuth();
    }
    throw new ApiError(
      response.status,
      data.error || `Request failed (${response.status})`,
    );
  }

  return data as T;
}

export function getApiBaseUrl(): string {
  return API_URL;
}
