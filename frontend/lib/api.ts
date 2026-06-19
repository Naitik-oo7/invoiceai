import type {
  ApiError,
  Invoice,
  InvoiceListResponse,
  ReExtractResponse,
  StatsResponse,
  UploadResponse,
  User,
} from "@/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export class ApiClientError extends Error {
  code: string;
  status: number;

  constructor(message: string, code: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  token?: string
): Promise<T> {
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = headers["Content-Type"] || "application/json";
  }

  const response = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (!response.ok) {
    const error = (await response.json().catch(() => ({
      detail: "Request failed",
      code: "UNKNOWN",
    }))) as ApiError;
    throw new ApiClientError(
      typeof error.detail === "string" ? error.detail : "Request failed",
      error.code || "UNKNOWN",
      response.status
    );
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const api = {
  register: (data: { email: string; full_name: string; password: string }) =>
    request<User>("/api/auth/register", { method: "POST", body: JSON.stringify(data) }),

  login: (data: { email: string; password: string }) =>
    request<{ access_token: string; token_type: string; user: User }>(
      "/api/auth/login",
      { method: "POST", body: JSON.stringify(data) }
    ),

  me: (token: string) => request<User>("/api/auth/me", {}, token),

  uploadInvoice: (file: File, token: string) => {
    const form = new FormData();
    form.append("file", file);
    return request<UploadResponse>(
      "/api/invoices/upload",
      { method: "POST", body: form },
      token
    );
  },

  listInvoices: (
    token: string,
    params: Record<string, string | number | undefined> = {}
  ) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== "") query.set(k, String(v));
    });
    return request<InvoiceListResponse>(`/api/invoices?${query}`, {}, token);
  },

  getInvoice: (id: string, token: string) =>
    request<Invoice>(`/api/invoices/${id}`, {}, token),

  updateInvoice: (id: string, data: Record<string, unknown>, token: string) =>
    request<Invoice>(`/api/invoices/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }, token),

  deleteInvoice: (id: string, token: string) =>
    request<void>(`/api/invoices/${id}`, { method: "DELETE" }, token),

  reExtract: (id: string, file: File, token: string) => {
    const form = new FormData();
    form.append("file", file);
    return request<ReExtractResponse>(
      `/api/invoices/${id}/re-extract`,
      { method: "POST", body: form },
      token
    );
  },

  applyDiff: (id: string, fields: Record<string, string>, token: string) =>
    request<Invoice>(`/api/invoices/${id}/apply-diff`, {
      method: "POST",
      body: JSON.stringify({ fields_to_apply: fields }),
    }, token),

  getStats: (token: string) => request<StatsResponse>("/api/stats", {}, token),

  exportUrl: (format: "csv" | "excel", params: Record<string, string> = {}) => {
    const query = new URLSearchParams(params);
    return `${API_URL}/api/invoices/export/${format}?${query}`;
  },
};
