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

  const formatVal = (v: unknown) => (v === null || v === undefined ? "—" : String(v));

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Re-extraction Results</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-2 text-xs font-medium text-muted-foreground">
            <span>Field</span>
            <span>Current</span>
            <span>AI Re-extracted</span>
            <span>Choose</span>
          </div>
          {Object.entries(data.diff).map(([field, d]) => (
            <div
              key={field}
              className={`grid grid-cols-4 gap-2 items-center text-sm ${d.changed ? "bg-amber-50 rounded p-2" : ""}`}
            >
              <span className="font-medium">{FIELD_LABELS[field] || field}</span>
              <span>{formatVal(d.current)}</span>
              <span>{formatVal(d.ai)}</span>
              <div className="flex gap-2">
                <label className="flex items-center gap-1 text-xs">
                  <input
                    type="radio"
                    name={field}
                    checked={choices[field] === "current"}
                    onChange={() => setChoices((c) => ({ ...c, [field]: "current" }))}
                  />
                  Current
                </label>
                <label className="flex items-center gap-1 text-xs">
                  <input
                    type="radio"
                    name={field}
                    checked={choices[field] === "ai"}
                    onChange={() => setChoices((c) => ({ ...c, [field]: "ai" }))}
                  />
                  AI
                </label>
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
