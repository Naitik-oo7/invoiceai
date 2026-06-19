import { describe, it, expect } from "vitest";
import {
  formatCurrency,
  formatDate,
  formatRelativeTime,
  getConfidenceColor,
} from "@/lib/formatters";

describe("formatters", () => {
  it("formats currency", () => {
    expect(formatCurrency(1234.56, "USD")).toContain("1,234.56");
  });

  it("returns em dash for null currency", () => {
    expect(formatCurrency(null)).toBe("—");
  });

  it("formats date", () => {
    const result = formatDate("2025-01-15");
    expect(result).toContain("2025");
  });

  it("formats relative time", () => {
    const result = formatRelativeTime(new Date().toISOString());
    expect(result).toContain("ago");
  });

  it("returns confidence colors by threshold", () => {
    expect(getConfidenceColor(0.95)).toContain("emerald");
    expect(getConfidenceColor(0.8)).toContain("amber");
    expect(getConfidenceColor(0.6)).toContain("orange");
    expect(getConfidenceColor(0.3)).toContain("red");
  });
});
