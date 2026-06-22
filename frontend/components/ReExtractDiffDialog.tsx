"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ReExtractResponse } from "@/types";

const FIELD_LABELS: Record<string, string> = {
  invoice_number: "Invoice Number",
  vendor_name: "Vendor Name",
  invoice_date: "Invoice Date",
  due_date: "Due Date",
  total_amount: "Total Amount",
  tax_amount: "Tax Amount",
  currency: "Currency",
  detected_locale: "Locale",
};

interface ReExtractDiffDialogProps {
  open: boolean;
  data: ReExtractResponse | null;
  onApply: (choices: Record<string, string>) => void;
  onCancel: () => void;
}

export function ReExtractDiffDialog({
  open,
  data,
  onApply,
  onCancel,
}: ReExtractDiffDialogProps) {
  const [choices, setChoices] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!data) return;
    const initial: Record<string, string> = {};
    Object.entries(data.diff).forEach(([field, d]) => {
      initial[field] = d.changed ? "ai" : "current";
    });
    setChoices(initial);
  }, [data]);

  if (!data) return null;

  const formatVal = (v: unknown) => (v === null || v === undefined || v === "" ? "—" : String(v));
  const changedCount = Object.values(data.diff).filter((d) => d.changed).length;

  const Option = ({
    field,
    kind,
    value,
  }: {
    field: string;
    kind: "current" | "ai";
    value: unknown;
  }) => {
    const selected = choices[field] === kind;
    return (
      <label
        className={cn(
          "flex cursor-pointer items-start gap-2.5 rounded-md border p-2.5 transition-colors",
          selected
            ? "border-primary bg-accent ring-1 ring-primary/30"
            : "border-input hover:border-primary/40 hover:bg-muted/40"
        )}
      >
        <input
          type="radio"
          name={field}
          className="mt-0.5 accent-primary"
          checked={selected}
          onChange={() => setChoices((c) => ({ ...c, [field]: kind }))}
        />
        <span className="min-w-0">
          <span className="block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {kind === "current" ? "Current" : "AI re-extracted"}
          </span>
          <span className="block break-words text-sm font-medium text-foreground tnum">
            {formatVal(value)}
          </span>
        </span>
      </label>
    );
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Re-extraction Results</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          {changedCount > 0
            ? `${changedCount} field${changedCount === 1 ? "" : "s"} changed. Pick which value to keep for each field.`
            : "No fields changed in the new extraction."}
        </p>
        <div className="space-y-3">
          {Object.entries(data.diff).map(([field, d]) => (
            <div
              key={field}
              className={cn(
                "rounded-lg border p-3",
                d.changed ? "border-amber-200 bg-amber-50/60" : "bg-card"
              )}
            >
              <div className="mb-2.5 flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-foreground">
                  {FIELD_LABELS[field] || field}
                </span>
                {d.changed ? (
                  <Badge variant="outline" className="border-amber-200 bg-amber-100 text-amber-800">
                    Changed
                  </Badge>
                ) : (
                  <span className="text-xs text-muted-foreground">No change</span>
                )}
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <Option field={field} kind="current" value={d.current} />
                <Option field={field} kind="ai" value={d.ai} />
              </div>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button onClick={() => onApply(choices)}>Apply Selected</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
