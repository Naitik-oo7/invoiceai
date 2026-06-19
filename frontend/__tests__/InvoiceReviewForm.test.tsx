import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { InvoiceReviewForm } from "@/components/InvoiceReviewForm";
import type { Invoice } from "@/types";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const mockInvoice: Invoice = {
  id: "123",
  uploaded_by: "user-1",
  status: "review_pending",
  original_filename: "test.pdf",
  file_hash: "abc",
  pdf_type: "digital",
  page_count: 1,
  invoice_number: "INV-001",
  vendor_name: "Acme Corp",
  invoice_date: "2025-01-15",
  due_date: "2025-02-15",
  total_amount: "1234.56",
  tax_amount: "100.00",
  currency: "USD",
  detected_locale: "en-US",
  field_confidence: {
    invoice_number: 0.95,
    vendor_name: 0.5,
    invoice_date: 0.95,
    due_date: 0.85,
    total_amount: 0.98,
    tax_amount: 0.80,
  },
  field_warnings: {
    vendor_name: "Low confidence (50%) — please verify",
  },
  overall_confidence: 0.85,
  validation_errors: [],
  extraction_model: "gpt-4o",
  extraction_method: "text",
  extraction_attempts: 1,
  extraction_tokens_in: 500,
  extraction_tokens_out: 200,
  extraction_cost_usd: "0.0033",
  extraction_duration_ms: 1500,
  extraction_notes: null,
  ai_extracted_fields: null,
  extracted_at: "2025-01-01T00:00:00Z",
  reviewed_at: null,
  reviewed_by: null,
  rejection_reason: null,
  created_at: "2025-01-01T00:00:00Z",
  updated_at: "2025-01-01T00:00:00Z",
};

describe("InvoiceReviewForm", () => {
  it("renders fields and shows warnings for low confidence", () => {
    render(
      <InvoiceReviewForm
        invoice={mockInvoice}
        pdfUrl={null}
        token="test-token"
        onSaved={vi.fn()}
      />
    );

    expect(screen.getByDisplayValue("Acme Corp")).toBeInTheDocument();
    expect(screen.getByText(/Low confidence \(50%\)/)).toBeInTheDocument();
    expect(screen.getByText("Approve & Save")).toBeInTheDocument();
  });
});
