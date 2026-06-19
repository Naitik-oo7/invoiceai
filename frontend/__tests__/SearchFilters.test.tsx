import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { SearchFilters } from "@/components/SearchFilters";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

describe("SearchFilters", () => {
  it("renders search input and status filter", () => {
    render(<SearchFilters onChange={vi.fn()} />);
    expect(screen.getByPlaceholderText("Search vendor or invoice #...")).toBeInTheDocument();
    expect(screen.getByText("Clear")).toBeInTheDocument();
  });
});
