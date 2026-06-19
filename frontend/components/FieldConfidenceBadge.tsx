"use client";

import { getConfidenceColor } from "@/lib/formatters";
import { cn } from "@/lib/utils";

interface FieldConfidenceBadgeProps {
  confidence: number | null | undefined;
  value: unknown;
}

export function FieldConfidenceBadge({ confidence, value }: FieldConfidenceBadgeProps) {
  if (value === null || value === undefined || value === "") {
    return (
      <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium", getConfidenceColor(0))}>
        Not found
      </span>
    );
  }

  const pct = confidence !== null && confidence !== undefined ? Math.round(confidence * 100) : 0;
  const label = pct >= 75 ? `${pct}% confident` : `${pct}% — verify`;

  return (
    <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium", getConfidenceColor(confidence))}>
      {label}
    </span>
  );
}
