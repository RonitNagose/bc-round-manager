import { BACKEND_URL } from "./config";

export class ApiError extends Error {
  public readonly status: number;
  public readonly code?: string;
  public readonly details?: unknown;

  constructor(status: number, message: string, opts?: { code?: string; details?: unknown }) {
    super(message);
    this.status = status;
    this.code = opts?.code;
    this.details = opts?.details;
  }
}

export async function apiFetch<T>(
  path: string,
  opts: {
    method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    token?: string | null;
    body?: unknown;
    query?: Record<string, string | number | boolean | undefined>;
  } = {},
): Promise<T> {
  const { method = "GET", token = null, body, query } = opts;

  const url = new URL(BACKEND_URL + path);
  if (query) {
    Object.entries(query).forEach(([k, v]) => {
      if (v === undefined) return;
      url.searchParams.set(k, String(v));
    });
  }

  const res = await fetch(url.toString(), {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let parsed: unknown = null;
  try {
    parsed = text ? (JSON.parse(text) as unknown) : null;
  } catch {
    parsed = null;
  }

  if (!res.ok) {
    const errorPayload =
      parsed && typeof parsed === "object"
        ? (parsed as { message?: unknown; code?: string; details?: unknown })
        : null;
    const message =
      typeof errorPayload?.message === "string" ? errorPayload.message : `Request failed (${res.status})`;

    throw new ApiError(res.status, message, {
      code: errorPayload?.code,
      details: errorPayload?.details,
    });
  }

  return parsed as T;
}
