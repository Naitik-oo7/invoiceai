export type InvoiceStatus = "review_pending" | "approved" | "rejected" | "failed";
export type PdfType = "digital" | "scanned";
export type ExtractionMethod = "text" | "vision";

export interface User {
  id: string;
  email: string;
  full_name: string;
  is_active: boolean;
  created_at: string;
}

export interface Invoice {
  id: string;
  uploaded_by: string | null;
  status: InvoiceStatus;
  original_filename: string;
  file_hash: string;
  pdf_type: PdfType | null;
  page_count: number | null;
  invoice_number: string | null;
  vendor_name: string | null;
  invoice_date: string | null;
  due_date: string | null;
  total_amount: string | null;
  tax_amount: string | null;
  currency: string | null;
  detected_locale: string | null;
  field_confidence: Record<string, number>;
  field_warnings: Record<string, string>;
  overall_confidence: number | null;
  validation_errors: unknown[] | null;
  extraction_model: string | null;
  extraction_method: ExtractionMethod | null;
  extraction_attempts: number;
  extraction_tokens_in: number | null;
  extraction_tokens_out: number | null;
  extraction_cost_usd: string | null;
  extraction_duration_ms: number | null;
  extraction_notes: string | null;
  ai_extracted_fields: Record<string, unknown> | null;
  extracted_at: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface DuplicateSummary {
  id: string;
  original_filename: string;
  created_at: string;
  status: InvoiceStatus;
  vendor_name?: string | null;
  invoice_number?: string | null;
}

export interface UploadResponse {
  invoice: Invoice;
  duplicates: DuplicateSummary[];
  extraction_method: ExtractionMethod;
  cost_usd: number;
}

export interface InvoiceListResponse {
  items: Invoice[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface ReExtractResponse {
  ai_fields: Record<string, unknown>;
  current_fields: Record<string, unknown>;
  diff: Record<string, { current: unknown; ai: unknown; changed: boolean }>;
}

export interface StatsResponse {
  total_invoices: number;
  pending_review: number;
  approved: number;
  rejected: number;
  failed: number;
  total_approved_amount: string;
  average_confidence: number | null;
  extraction_cost_this_month: string;
  extraction_cost_last_month: string;
  recent_invoices: Invoice[];
}

export interface ApiError {
  detail: string;
  code: string;
}
