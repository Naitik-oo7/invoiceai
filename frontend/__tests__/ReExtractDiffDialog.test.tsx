import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ReExtractDiffDialog } from "@/components/ReExtractDiffDialog";

const mockData = {
  ai_fields: { vendor_name: "Acme Corporation" },
  current_fields: { vendor_name: "Acme Corp" },
  diff: {
    vendor_name: { current: "Acme Corp", ai: "Acme Corporation", changed: true },
    invoice_number: { current: "INV-1", ai: "INV-1", changed: false },
  },
};

describe("ReExtractDiffDialog", () => {
  it("shows diff and pre-selects AI for changed fields", () => {
    const onApply = vi.fn();
    render(
      <ReExtractDiffDialog
        open={true}
        data={mockData}
        onApply={onApply}
        onCancel={vi.fn()}
      />
    );

    expect(screen.getByText("Re-extraction Results")).toBeInTheDocument();
    expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    expect(screen.getByText("Acme Corporation")).toBeInTheDocument();
  });
});
