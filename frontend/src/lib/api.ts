export interface FieldError {
  field: string;
  message: string;
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly errors: FieldError[] = [],
  ) {
    super(message);
  }
}

const OFFLINE_MESSAGE = "Não foi possível conectar à API. Confira se o backend está em execução.";

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api/v1${path}`, {
      method,
      credentials: "same-origin",
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(OFFLINE_MESSAGE, 0);
  }
  // 502, 503 e 504 vêm do intermediário quando a API está fora do ar.
  if ([502, 503, 504].includes(response.status)) throw new ApiError(OFFLINE_MESSAGE, response.status);
  if (response.status === 204) return undefined as T;
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(data?.detail ?? "A API respondeu com um erro inesperado.", response.status, data?.errors ?? []);
  }
  return data as T;
}

export const api = {
  get: <T>(path: string) => request<T>("GET", path),
  post: <T>(path: string, body?: unknown) => request<T>("POST", path, body),
  patch: <T>(path: string, body: unknown) => request<T>("PATCH", path, body),
  delete: (path: string, body?: unknown) => request<void>("DELETE", path, body),
};

export function queryString(params: Record<string, string | number | boolean | null | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== null && value !== undefined && value !== "") search.set(key, String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : "";
}
