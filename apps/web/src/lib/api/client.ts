// Thin typed fetch over the same-origin /api proxy. Cookie auth (credentials),
// JSON in/out, and the backend's { error: { code, message } } envelope → ApiError.

const BASE = "/api";

export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
  }
}

const errorOf = (body: unknown, fallback: string): { code: string; message: string } => {
  if (body && typeof body === "object" && "error" in body) {
    const e = (body as { error?: unknown }).error;
    if (e && typeof e === "object") {
      const code = "code" in e ? String((e as { code: unknown }).code) : "INTERNAL";
      const message = "message" in e ? String((e as { message: unknown }).message) : fallback;
      return { code, message };
    }
  }
  return { code: "INTERNAL", message: fallback };
};

export const apiFetch = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    credentials: "include",
    headers: { "content-type": "application/json", ...init?.headers },
  });

  const text = await res.text();
  const body: unknown = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const { code, message } = errorOf(body, res.statusText);
    throw new ApiError(res.status, code, message);
  }
  return body as T;
};
