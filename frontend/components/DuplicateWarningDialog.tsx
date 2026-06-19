"use client";

import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { DuplicateSummary } from "@/types";
import { formatStatus, getStatusColor } from "@/lib/formatters";
import { cn } from "@/lib/utils";

interface DuplicateWarningDialogProps {
  open: boolean;
  duplicates: DuplicateSummary[];
  onContinue: () => void;
  onCancel: () => void;
}

export function DuplicateWarningDialog({
  open,
  duplicates,
  onContinue,
  onCancel,
}: DuplicateWarningDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>This invoice may already exist</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {duplicates.map((dup) => (
            <div key={dup.id} className="flex items-center justify-between rounded-md border p-3">
              <div>
                <p className="font-medium">{dup.vendor_name || "Unknown vendor"}</p>
                <p className="text-sm text-muted-foreground">
                  {dup.invoice_number || "No number"} · {dup.original_filename}
                </p>
                <Badge className={cn("mt-1", getStatusColor(dup.status))}>
                  {formatStatus(dup.status)}
                </Badge>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href={`/review/${dup.id}`}>View</Link>
              </Button>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>Cancel upload</Button>
          <Button onClick={onContinue}>Continue with new record</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
