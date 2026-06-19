import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { DuplicateWarningDialog } from "@/components/DuplicateWarningDialog";

describe("DuplicateWarningDialog", () => {
  it("shows duplicates and allows continue", () => {
    const onContinue = vi.fn();
    const onCancel = vi.fn();

    render(
      <DuplicateWarningDialog
        open={true}
        duplicates={[
          {
            id: "1",
            original_filename: "test.pdf",
            created_at: "2025-01-01T00:00:00Z",
            status: "approved",
            vendor_name: "Acme",
            invoice_number: "INV-001",
          },
        ]}
        onContinue={onContinue}
        onCancel={onCancel}
      />
    );

    expect(screen.getByText("This invoice may already exist")).toBeInTheDocument();
    expect(screen.getByText("Acme")).toBeInTheDocument();
    screen.getByText("Continue with new record").click();
    expect(onContinue).toHaveBeenCalled();
  });
});
