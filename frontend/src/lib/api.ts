const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

export class ApiError extends Error {
  code: string;
  status: number;
  details: unknown[];

  constructor(code: string, message: string, status: number, details: unknown[] = []) {
    super(message);
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

interface ApiSuccess<T> {
  success: true;
  data: T;
}

interface ApiFailure {
  success: false;
  error: { code: string; message: string; details: unknown[] };
}

type ApiEnvelope<T> = ApiSuccess<T> | ApiFailure;

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  accessToken?: string | null;
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? "GET",
    // Sends/receives the httpOnly refresh-token cookie on cross-origin
    // requests to the backend (localhost:3000 -> localhost:4000 in dev).
    credentials: "include",
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.accessToken ? { Authorization: `Bearer ${options.accessToken}` } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const json = (await res.json()) as ApiEnvelope<T>;

  if (!json.success) {
    throw new ApiError(json.error.code, json.error.message, res.status, json.error.details);
  }

  return json.data;
}
